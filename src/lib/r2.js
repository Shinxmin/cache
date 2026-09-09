// Cloudflare R2 접근 — 브라우저는 시크릿을 갖지 않고, Supabase Edge Function(r2-presign)이
// 발급한 presigned URL로 R2에 직접 PUT/GET 한다. 삭제는 함수가 대신 수행한다.
import { supabase } from "../supabaseClient";

async function invoke(payload) {
  const { data, error } = await supabase.functions.invoke("r2-presign", { body: payload });
  if (error) {
    // FunctionsHttpError면 본문에 서버가 준 에러 메시지가 들어 있다.
    let message = error.message || "R2 요청 실패";
    try {
      const body = await error.context?.json?.();
      if (body?.error) message = body.error;
    } catch (_e) {
      /* ignore */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const r2 = {
  presignPut: (key, contentType) => invoke({ action: "put", key, contentType }).then((d) => d.url),
  presignGet: (key, { download = false, filename } = {}) =>
    invoke({ action: "get", key, download, filename }).then((d) => d.url),
  presignGetBatch: (keys) => (keys.length ? invoke({ action: "get-batch", keys }).then((d) => d.urls ?? {}) : Promise.resolve({})),
  remove: (key) => invoke({ action: "delete", key }),
  removeBatch: (keys) => (keys.length ? invoke({ action: "delete-batch", keys }) : Promise.resolve({ success: true })),
};

// XMLHttpRequest만 업로드 진행률(upload.onprogress)을 제공한다.
export function putWithProgress(url, file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (file.type) xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress?.(evt.loaded, evt.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`업로드 실패 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했습니다"));
    xhr.onabort = () => reject(new DOMException("취소됨", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
