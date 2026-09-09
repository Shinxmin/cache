// cache — Cloudflare R2 presign 프록시.
// 브라우저가 R2 시크릿 키를 직접 다루지 않도록, 이 함수가 presigned URL을 발급한다.
// 업로드(PUT)/다운로드(GET)는 발급된 URL로 브라우저가 R2에 직접 요청하고,
// 삭제만 이 함수가 자신의 자격증명으로 직접 수행한다.
//
// 모든 요청은 Supabase 로그인 세션(Authorization: Bearer <jwt>)이 있어야 하며,
// 객체 키는 반드시 "<user_id>/" 로 시작해야 한다 — 다른 사용자의 객체는 만질 수 없다.
//
// 필요한 시크릿(supabase secrets set ...):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
import { AwsClient } from "npm:aws4fetch@1.0.20";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Body = {
  action?: "put" | "get" | "get-batch" | "delete" | "delete-batch";
  key?: string;
  keys?: string[];
  contentType?: string;
  download?: boolean;
  filename?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST만 지원합니다" }, 405);

  // ── 1. 로그인 사용자 확인 ────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "로그인이 필요합니다" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "로그인이 필요합니다" }, 401);
  const userId = userData.user.id;

  // ── 2. R2 설정 ─────────────────────────────────────────────────────
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET_NAME");
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    console.error("R2 환경변수가 설정되지 않음");
    return json({ error: "R2가 아직 설정되지 않았습니다" }, 500);
  }

  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const objectUrl = (key: string) => `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

  const ownsKey = (key: unknown): key is string =>
    typeof key === "string" && key.length > 0 && key.length <= 1024 && !key.includes("..") && key.startsWith(`${userId}/`);

  const presign = async (
    key: string,
    method: "PUT" | "GET",
    opts: { contentType?: string; expiresIn?: number; download?: boolean; filename?: string } = {}
  ) => {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", String(opts.expiresIn ?? 3600));
    if (method === "GET" && opts.download) {
      const name = (opts.filename ?? key.split("/").pop() ?? "download").replace(/["\r\n]/g, "");
      url.searchParams.set(
        "response-content-disposition",
        `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`
      );
    }
    const headers: Record<string, string> = {};
    if (opts.contentType && method === "PUT") headers["content-type"] = opts.contentType;
    const signed = await client.sign(new Request(url, { method, headers }), { aws: { signQuery: true } });
    return signed.url;
  };

  // ── 3. 요청 처리 ───────────────────────────────────────────────────
  let body: Body = {};
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "잘못된 요청 본문" }, 400);
  }

  try {
    switch (body.action) {
      case "put": {
        if (!ownsKey(body.key)) return json({ error: "허용되지 않은 키" }, 403);
        return json({ url: await presign(body.key, "PUT", { contentType: body.contentType, expiresIn: 3600 }) });
      }
      case "get": {
        if (!ownsKey(body.key)) return json({ error: "허용되지 않은 키" }, 403);
        return json({
          url: await presign(body.key, "GET", { expiresIn: 60 * 60 * 24, download: !!body.download, filename: body.filename }),
        });
      }
      case "get-batch": {
        const keys = Array.isArray(body.keys) ? body.keys.slice(0, 200) : [];
        if (!keys.every(ownsKey)) return json({ error: "허용되지 않은 키" }, 403);
        const entries = await Promise.all(keys.map(async (key) => [key, await presign(key, "GET", { expiresIn: 60 * 60 * 24 })] as const));
        return json({ urls: Object.fromEntries(entries) });
      }
      case "delete": {
        if (!ownsKey(body.key)) return json({ error: "허용되지 않은 키" }, 403);
        const resp = await client.fetch(objectUrl(body.key), { method: "DELETE" });
        return json({ success: resp.ok || resp.status === 404 });
      }
      case "delete-batch": {
        const keys = Array.isArray(body.keys) ? body.keys.slice(0, 500) : [];
        if (!keys.every(ownsKey)) return json({ error: "허용되지 않은 키" }, 403);
        const results = await Promise.all(
          keys.map(async (key) => {
            const resp = await client.fetch(objectUrl(key), { method: "DELETE" });
            return resp.ok || resp.status === 404;
          })
        );
        return json({ success: results.every(Boolean), failed: keys.filter((_, i) => !results[i]) });
      }
      default:
        return json({ error: "지원하지 않는 action" }, 400);
    }
  } catch (e) {
    console.error("r2-presign 처리 중 오류:", e);
    return json({ error: "처리 중 오류가 발생했습니다" }, 500);
  }
});
