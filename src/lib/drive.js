import { supabase } from "../supabaseClient";
import { makeThumbnail } from "./thumbnail";

// R2 웹드라이브 API. 파일 본체는 R2에, 폴더 구조와 메타데이터는 Supabase에 둔다.
// 브라우저는 R2 자격증명을 알지 못하고, r2-presign 엣지 함수가 세션 토큰을 확인한
// 뒤 발급해주는 presigned URL로만 R2에 직접 올리고 내려받는다.

const PRESIGN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign`;

async function presign(token, body) {
  const res = await fetch(PRESIGN_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "R2 요청에 실패했습니다");
  return data;
}

function rpcResult({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

export async function listFiles(token, parentId = null) {
  return rpcResult(await supabase.rpc("list_files", { p_token: token, p_parent_id: parentId }));
}

export async function createFolder(token, name, parentId = null) {
  return rpcResult(await supabase.rpc("create_folder", { p_token: token, p_name: name, p_parent_id: parentId }));
}

// ── 휴지통 ─────────────────────────────────────────────────────────────
export async function listTrash(token) {
  return rpcResult(await supabase.rpc("list_trash", { p_token: token }));
}

export async function trashFiles(token, ids) {
  return rpcResult(await supabase.rpc("trash_files", { p_token: token, p_ids: ids }));
}

export async function restoreFiles(token, ids) {
  return rpcResult(await supabase.rpc("restore_files", { p_token: token, p_ids: ids }));
}

// DB 행을 지운 뒤 돌려주는 R2 키 목록을 실제로 R2에서 지우는 것까지 한 번에 한다.
export async function deleteFilesPermanently(token, ids) {
  const result = rpcResult(await supabase.rpc("delete_files_permanently", { p_token: token, p_ids: ids }));
  const keys = result?.keys ?? [];
  if (keys.length) {
    // R2 정리는 최선을 다하는 것으로 충분하다 — DB 행은 이미 지워졌으니
    // 여기서 실패해도 사용자에게 다시 시도할 방법이 없다(고아 객체만 남는다).
    await presign(token, { action: "delete-batch", keys }).catch(() => {});
  }
  return result;
}

// 갤러리 썸네일처럼 여러 개가 한꺼번에 필요할 때. 파일마다 요청하지 않도록 묶어서 받는다.
export async function thumbnailUrls(token, keys) {
  if (!keys.length) return {};
  const { urls } = await presign(token, { action: "get-batch", keys });
  return urls ?? {};
}

// 뷰어에서 이미지·영상을 그 자리에서 보여줄 때 쓴다(download 플래그를 안 붙여서
// 브라우저가 강제로 저장하지 않고 <img>/<video>로 바로 그릴 수 있다).
export async function fileUrl(token, key) {
  const { url } = await presign(token, { action: "get", key });
  return url;
}

// fetch는 업로드 진행률을 알려주지 않으므로 전송에는 XHR을 쓴다.
function xhrPut(url, blob, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`업로드 실패 (${xhr.status})`));
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다"));
    xhr.send(blob);
  });
}

function xhrGetBlob(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error(`다운로드 실패 (${xhr.status})`));
    xhr.onerror = () => reject(new Error("네트워크 오류로 내려받지 못했습니다"));
    xhr.send();
  });
}

const extensionOf = (name) => {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
};

// 확장자 제한 없이 무엇이든 올린다. 키는 사용자 폴더 밑에 무작위 이름으로 만들어
// 같은 이름을 여러 번 올려도 서로 덮어쓰지 않게 한다(표시 이름은 메타데이터에 둔다).
export async function uploadFile({ token, userId, file, parentId = null, onProgress }) {
  const base = `${userId}/${crypto.randomUUID()}`;
  const ext = extensionOf(file.name);
  const key = ext ? `${base}.${ext}` : base;

  const thumb = await makeThumbnail(file);

  const { url } = await presign(token, { action: "put", key, contentType: file.type || "application/octet-stream" });
  await xhrPut(url, file, file.type || "application/octet-stream", onProgress);

  let thumbKey = null;
  if (thumb) {
    thumbKey = `${base}.thumb.jpg`;
    try {
      const signed = await presign(token, { action: "put", key: thumbKey, contentType: "image/jpeg" });
      await xhrPut(signed.url, thumb, "image/jpeg");
    } catch {
      // 썸네일만 실패한 경우 원본은 이미 올라갔으므로 썸네일 없이 등록한다.
      thumbKey = null;
    }
  }

  return rpcResult(
    await supabase.rpc("create_file", {
      p_token: token,
      p_name: file.name,
      p_r2_key: key,
      p_mime: file.type || null,
      p_size: file.size,
      p_parent_id: parentId,
      p_thumb_key: thumbKey,
    })
  );
}

// 진행률을 보여주기 위해 blob으로 받은 뒤 저장을 띄운다.
export async function downloadFile({ token, item, onProgress }) {
  const { url } = await presign(token, {
    action: "get",
    key: item.r2_key,
    download: true,
    filename: item.name,
  });
  const blob = await xhrGetBlob(url, onProgress);

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = item.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}
