// cache — Cloudflare R2 presign 프록시.
// 브라우저가 R2 시크릿 키를 직접 다루지 않도록, 이 함수가 presigned URL을 발급한다.
// 업로드(PUT)/다운로드(GET)는 발급된 URL로 브라우저가 R2에 직접 요청하고,
// 삭제만 이 함수가 자신의 자격증명으로 직접 수행한다.
//
// 인증: 이 앱은 Supabase Auth가 아니라 자체 아이디/비밀번호 로그인을 쓰므로
// JWT 대신 로그인 시 발급한 세션 토큰을 받는다(Authorization: Bearer <token>).
// 토큰은 resolve_session RPC로 확인하며, 객체 키는 반드시 "<user_id>/"로
// 시작해야 한다 — 다른 사용자의 객체는 만질 수 없다. (verify_jwt를 끈 이유:
// Supabase JWT가 아닌 자체 토큰을 이 본문에서 직접 검증하기 때문.)
//
// 필요한 시크릿: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
import { AwsClient } from "npm:aws4fetch@1.0.20";

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

// 세션 토큰 → user_id. resolve_session은 익명 키로 호출 가능한 SECURITY DEFINER 함수다.
async function resolveUser(token: string): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;

  const res = await fetch(`${url}/rest/v1/rpc/resolve_session`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.ok ? (data.user_id as string) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST만 지원합니다" }, 405);

  // ── 1. 세션 토큰 확인 ────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "로그인이 필요합니다" }, 401);
  const userId = await resolveUser(authHeader.slice("Bearer ".length).trim());
  if (!userId) return json({ error: "로그인이 필요합니다" }, 401);

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
    typeof key === "string" &&
    key.length > 0 &&
    key.length <= 1024 &&
    !key.includes("..") &&
    key.startsWith(`${userId}/`);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "잘못된 요청입니다" }, 400);
  }

  const signGet = async (key: string, opts: { download?: boolean; filename?: string } = {}) => {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", "3600");
    if (opts.download) {
      const name = (opts.filename ?? key.split("/").pop() ?? "download").replace(/["\r\n]/g, "");
      url.searchParams.set(
        "response-content-disposition",
        `attachment; filename*=UTF-8''${encodeURIComponent(name)}`
      );
    }
    const signed = await client.sign(new Request(url.toString(), { method: "GET" }), {
      aws: { signQuery: true, allHeaders: false },
    });
    return signed.url;
  };

  // ── 3. 액션 처리 ────────────────────────────────────────────────────
  // 갤러리 썸네일처럼 한 번에 여러 개가 필요한 경우를 위해 배치 발급을 따로 둔다.
  if (body.action === "get-batch") {
    const keys = Array.isArray(body.keys) ? body.keys.slice(0, 200) : [];
    if (!keys.every(ownsKey)) return json({ error: "허용되지 않은 키입니다" }, 403);
    const entries = await Promise.all(keys.map(async (k) => [k, await signGet(k)] as const));
    return json({ urls: Object.fromEntries(entries) });
  }

  // 휴지통 영구 삭제: DB에서 행을 지운 뒤(delete_files_permanently RPC) 남은 R2
  // 객체들을 한 번에 지운다. 일부 실패해도(이미 없는 키 등) 나머지는 계속 진행하는
  // 최선을 다한다 — DB 행은 이미 지워졌으니 여기서 실패해도 다시 시도할 수는 없다.
  if (body.action === "delete-batch") {
    const keys = Array.isArray(body.keys) ? body.keys.slice(0, 500) : [];
    if (!keys.every(ownsKey)) return json({ error: "허용되지 않은 키입니다" }, 403);
    const failed: string[] = [];
    await Promise.all(
      keys.map(async (k) => {
        try {
          const res = await client.fetch(objectUrl(k), { method: "DELETE" });
          if (!res.ok && res.status !== 404) failed.push(k);
        } catch {
          failed.push(k);
        }
      })
    );
    return json({ ok: true, failed });
  }

  if (!ownsKey(body.key)) return json({ error: "허용되지 않은 키입니다" }, 403);
  const key = body.key;

  if (body.action === "get") {
    return json({ url: await signGet(key, { download: body.download, filename: body.filename }) });
  }

  if (body.action === "put") {
    const url = new URL(objectUrl(key));
    url.searchParams.set("X-Amz-Expires", "3600");
    const headers: Record<string, string> = {};
    if (typeof body.contentType === "string" && body.contentType) {
      headers["content-type"] = body.contentType;
    }
    const signed = await client.sign(new Request(url.toString(), { method: "PUT", headers }), {
      aws: { signQuery: true, allHeaders: false },
    });
    return json({ url: signed.url });
  }

  if (body.action === "delete") {
    const res = await client.fetch(objectUrl(key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) return json({ error: "삭제에 실패했습니다" }, 502);
    return json({ ok: true });
  }

  return json({ error: "알 수 없는 action입니다" }, 400);
});
