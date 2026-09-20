import { zipSync } from "fflate";
import { supabase } from "../supabaseClient";
import { sortFileList } from "./sort";
import { isImage, isVideo, makeThumbnail } from "./thumbnail";

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
  const rows = rpcResult(await supabase.rpc("list_files", { p_token: token, p_parent_id: parentId }));
  return sortFileList(rows);
}

export async function createFolder(token, name, parentId = null) {
  return rpcResult(await supabase.rpc("create_folder", { p_token: token, p_name: name, p_parent_id: parentId }));
}

// 검색바 실시간 검색. 지금 폴더에 국한하지 않고 사용자의 전체 드라이브에서
// 이름·태그로 찾는다(둘 다 부분 일치, 둘 다 주면 AND). name/tag 파싱은
// src/lib/search.js의 parseSearchQuery가 맡는다.
export async function searchFiles(token, { name, tag } = {}) {
  const rows = rpcResult(await supabase.rpc("search_files", { p_token: token, p_name: name || null, p_tag: tag || null }));
  return sortFileList(rows);
}

// 스튜디오 툴킷의 정보 아이콘으로 켠 용량 표시용. 폴더는 자체 용량이 없어서
// 하위 파일들을 재귀적으로 합산해 서버에서 계산해 온다. { [폴더id]: bytes } 형태.
export async function folderSizes(token, ids) {
  if (!ids.length) return {};
  return rpcResult(await supabase.rpc("folder_sizes", { p_token: token, p_ids: ids }));
}

// 스튜디오 툴킷의 편집(연필) 아이콘으로 여는 이름 바꾸기. renames는
// [{ id, name }] 배열이며, 단일 선택이든 다중 선택이든 한 번에 보낸다.
export async function renameFiles(token, renames) {
  return rpcResult(await supabase.rpc("rename_files", { p_token: token, p_renames: renames }));
}

// 선택한 항목을 다른 폴더로 옮긴다(parentId가 null이면 최상위로). 폴더를 옮기면
// 하위 항목은 parent_id로 딸려 있으므로 자동으로 함께 따라온다. 자기 자신이나
// 자기 하위 폴더로 옮기려 하면 서버가 INVALID_DESTINATION으로 막는다.
export async function moveFiles(token, ids, parentId) {
  return rpcResult(await supabase.rpc("move_files", { p_token: token, p_ids: ids, p_parent_id: parentId }));
}

// 스튜디오 툴킷의 태그(#) 아이콘. 선택한 항목 전체에 같은 태그 하나를
// 붙이거나(문자열), 빈 문자열/공백이면 서버에서 null로 지운다.
export async function setTag(token, ids, tag) {
  return rpcResult(await supabase.rpc("set_tag", { p_token: token, p_ids: ids, p_tag: tag }));
}

// 갤러리 썸네일 블러 처리(스튜디오 툴킷의 눈 아이콘). 서버에 저장돼 있어
// 새로고침해도 유지된다.
export async function setBlur(token, ids, blurred) {
  return rpcResult(await supabase.rpc("set_blur", { p_token: token, p_ids: ids, p_blurred: blurred }));
}

// 스튜디오 툴킷의 정보 아이콘으로 켠 용량 표시 여부. 블러와 마찬가지로
// 서버에 저장돼 있어 새로고침·재접속해도 유지된다.
export async function setInfoRevealed(token, ids, revealed) {
  return rpcResult(await supabase.rpc("set_info_revealed", { p_token: token, p_ids: ids, p_revealed: revealed }));
}

// ── 즐겨찾기 ───────────────────────────────────────────────────────────
// 스튜디오 툴킷의 별 아이콘. 파일·폴더 모두 대상이며 홈 → 즐겨찾기 화면에
// 폴더 우선으로 모아 보여준다.
export async function setFavorite(token, ids, favorite) {
  return rpcResult(await supabase.rpc("set_favorite", { p_token: token, p_ids: ids, p_favorite: favorite }));
}

export async function listFavorites(token) {
  const rows = rpcResult(await supabase.rpc("list_favorites", { p_token: token }));
  return sortFileList(rows);
}

// ── 태그 관리(설정 → 태그) ──────────────────────────────────────────────
// 지금 쓰이고 있는(휴지통에 있지 않은 파일에 붙어 있는) 태그를 중복 없이
// 나열한다. 각 항목은 { tag, count }(그 태그가 붙은 파일·폴더 개수) 형태다.
export async function listDistinctTags(token) {
  return rpcResult(await supabase.rpc("list_distinct_tags", { p_token: token }));
}

// 그 태그가 붙어 있던 모든 파일에서 태그만 뗀다(파일 자체는 그대로).
export async function deleteTag(token, tag) {
  return rpcResult(await supabase.rpc("delete_tag", { p_token: token, p_tag: tag }));
}

// 태그가 붙어 있는 모든 파일에서 태그를 전부 뗀다.
export async function deleteAllTags(token) {
  return rpcResult(await supabase.rpc("delete_all_tags", { p_token: token }));
}

// ── 하이라이트 클립(애드온) ─────────────────────────────────────────────
// 동영상 하나에 저장해 둔 구간(클립) 목록. 클립은 계정에 저장되므로 다른
// 기기에서 열어도 같은 목록이 뜬다.
export async function listClips(token, fileId) {
  return rpcResult(await supabase.rpc("list_clips", { p_token: token, p_file_id: fileId }));
}

export async function createClip(token, { fileId, name, start, end }) {
  return rpcResult(
    await supabase.rpc("create_clip", {
      p_token: token,
      p_file_id: fileId,
      p_name: name,
      p_start: start,
      p_end: end,
    })
  );
}

// 클립 제목은 입력하는 대로 실시간 저장된다(확인 버튼 없음).
export async function renameClip(token, id, name) {
  return rpcResult(await supabase.rpc("rename_clip", { p_token: token, p_id: id, p_name: name }));
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

// 캔버스에서 읽어야 하는 경우(팔레트 추출 등)에 쓴다 — presigned URL을 <img>에
// 직접 넣으면 CORS 때문에 캔버스가 오염되므로, blob으로 받아 object URL로 연다.
export async function fetchFileBlob(token, key) {
  const { url } = await presign(token, { action: "get", key });
  return xhrGetBlob(url);
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

// 스플릿 비교 프리셋 저장: A/B 두 파일의 실제 바이트를 각각 새 R2 객체로
// 복제해 원본과 완전히 독립시킨 뒤, 파일 목록에는 항목 하나만 만든다 —
// 이 항목 자신이 A를 담당하고(자기 r2_key/mime), B는 split_pair.b에 함께
// 저장해 둔다. 항목의 표시 이름은 "프리셋_N"으로 바뀌므로, 다운로드할 때
// A의 원래 파일명(확장자 포함)을 되살릴 수 있도록 split_pair.a.name에도
// 따로 남겨 둔다. 이 항목을 열면 다시 A/B 스플릿 비교 화면이 뜨고,
// 다운로드하면 A·B가 각자 원래 이름으로 저장된다(downloadSplitPresetFiles).
// 원본 A/B를 나중에 지워도 여기 복제된 바이트는 별개 객체라 영향받지 않는다.
export async function createSplitPreset({ token, userId, itemA, itemB, parentId, name }) {
  const [blobA, blobB] = await Promise.all([fetchFileBlob(token, itemA.r2_key), fetchFileBlob(token, itemB.r2_key)]);

  const baseKey = `${userId}/${crypto.randomUUID()}`;
  const extA = extensionOf(itemA.name);
  const keyA = extA ? `${baseKey}-a.${extA}` : `${baseKey}-a`;
  const extB = extensionOf(itemB.name);
  const keyB = extB ? `${baseKey}-b.${extB}` : `${baseKey}-b`;
  const mimeA = itemA.mime || blobA.type || "application/octet-stream";
  const mimeB = itemB.mime || blobB.type || "application/octet-stream";

  const { url: putA } = await presign(token, { action: "put", key: keyA, contentType: mimeA });
  await xhrPut(putA, blobA, mimeA);
  const { url: putB } = await presign(token, { action: "put", key: keyB, contentType: mimeB });
  await xhrPut(putB, blobB, mimeB);

  const thumb = await makeThumbnail(new File([blobA], itemA.name, { type: mimeA }));
  let thumbKey = null;
  if (thumb) {
    thumbKey = `${baseKey}.thumb.jpg`;
    try {
      const signed = await presign(token, { action: "put", key: thumbKey, contentType: "image/jpeg" });
      await xhrPut(signed.url, thumb, "image/jpeg");
    } catch {
      thumbKey = null;
    }
  }

  return rpcResult(
    await supabase.rpc("create_file", {
      p_token: token,
      p_name: name,
      p_r2_key: keyA,
      p_mime: mimeA,
      p_size: blobA.size + blobB.size,
      p_parent_id: parentId,
      p_thumb_key: thumbKey,
      p_split_pair: { a: { name: itemA.name }, b: { r2_key: keyB, mime: mimeB, name: itemB.name, size: blobB.size } },
    })
  );
}

// 스플릿 프리셋 항목(item.split_pair가 있는 항목)을 스플릿 비교 화면에 다시
// 띄우거나 다운로드할 때 필요한 A/B 각각의 {r2_key, mime, name}을 만든다.
export function splitPresetParts(item) {
  return [
    { r2_key: item.r2_key, mime: item.mime, name: item.split_pair.a?.name || item.name },
    { r2_key: item.split_pair.b.r2_key, mime: item.split_pair.b.mime, name: item.split_pair.b.name },
  ];
}

// 스플릿 프리셋 항목의 다운로드: 실제로는 A/B 두 사진이므로 zip으로 묶지
// 않고 각자 원래 이름으로 따로 받아 저장한다.
export async function downloadSplitPresetFiles({ token, item, onProgress }) {
  const parts = splitPresetParts(item);
  for (let i = 0; i < parts.length; i++) {
    await downloadFile({ token, item: parts[i], onProgress: (p) => onProgress?.((i + p) / parts.length) });
  }
}

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 열지 못했습니다"));
    };
    img.src = url;
  });
}

function encodeJpeg(img, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// 원본 용량의 targetSize에 최대한 가깝도록(근접) JPEG 품질을 이진 탐색으로
// 찾는다. 화질(quality)만 낮출 뿐 가로세로 크기는 그대로 둔다 — 용량
// 압축이지 리사이즈가 아니기 때문이다.
async function compressImageTo(blob, targetSize) {
  const { img, url } = await loadImage(blob);
  try {
    let lo = 0.05;
    let hi = 0.95;
    let best = null;
    for (let i = 0; i < 7; i++) {
      const mid = (lo + hi) / 2;
      const out = await encodeJpeg(img, mid);
      if (!out) continue;
      if (!best || Math.abs(out.size - targetSize) < Math.abs(best.size - targetSize)) best = out;
      if (out.size > targetSize) hi = mid;
      else lo = mid;
    }
    return best ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 스튜디오 툴킷의 용량 압축(원그래프) 아이콘. 선택된 파일들을 각각
// ratioPercent(25/50/75)만큼의 용량으로 다시 인코딩해 같은 r2_key에
// 덮어쓰고, DB에 저장된 용량·mime도 함께 갱신한다. mime 문자열로 미리
// 걸러내지 않고 브라우저가 실제로 열 수 있는지로 판단한다 — 일부 환경은
// HEIC 등에 mime을 빈 문자열로 주지만 <img>는 그래도 그려내는 경우가 있어서,
// 여기서 미리 막으면 오히려 열리는 이미지까지 건너뛰게 된다. 이미지가
// 아니거나 브라우저가 못 여는 파일은 조용히 건너뛰고 나머지를 계속 처리한다.
export async function optimizeFiles({ token, items, ratioPercent, onProgress }) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const step = (base) => onProgress?.((i + base) / items.length);

    try {
      const { url: getUrl } = await presign(token, { action: "get", key: item.r2_key });
      const original = await xhrGetBlob(getUrl, (p) => step(p * 0.5));

      const targetSize = Math.max(1, Math.round(original.size * (ratioPercent / 100)));
      const compressed = await compressImageTo(original, targetSize);

      const { url: putUrl } = await presign(token, { action: "put", key: item.r2_key, contentType: "image/jpeg" });
      await xhrPut(putUrl, compressed, "image/jpeg", (p) => step(0.5 + p * 0.5));

      await rpcResult(
        await supabase.rpc("update_file_content", {
          p_token: token,
          p_id: item.id,
          p_size: compressed.size,
          p_mime: "image/jpeg",
        })
      );
    } catch {
      // 이 파일만 건너뛴다(이미지가 아니거나 캔버스가 못 읽는 형식).
    }
  }
}

// 일반적인 "브라우저 다운로드" 방식(a[download] 클릭) — Downloads 폴더나
// 파일 앱으로 저장된다. 공유 시트를 쓸 수 없거나 사용자가 공유 자체에
// 실패했을 때(취소는 제외) 대체 경로로도 쓰인다.
function triggerBrowserDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
}

// 이미지·영상은 OS 공유 시트를 통해 "사진에 저장"으로 바로 보낼 수 있다 —
// 브라우저 샌드박스상 갤러리에 조용히 쓰는 API는 없고, 이게 웹에서 가장
// 가까운 방법이다. 사용자가 시트에서 취소를 누르면(AbortError) 그건 그
// 자체로 의사표현이므로 일반 다운로드로 대체하지 않는다 — 정말 공유가
// 지원되지 않거나 실패했을 때만 대체한다.
async function shareMediaFile(blob, filename, mime) {
  if (!navigator.canShare || !navigator.share) return false;
  try {
    const file = new File([blob], filename, { type: mime || blob.type });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file] });
    return true;
  } catch (err) {
    return err?.name === "AbortError";
  }
}

// 진행률을 보여주기 위해 blob으로 받은 뒤 저장을 띄운다. 이미지·영상은 먼저
// 공유 시트(사진에 저장)를 시도하고, 그 외 파일이거나 공유를 못 쓰면 일반
// 브라우저 다운로드로 저장한다.
export async function downloadFile({ token, item, onProgress }) {
  const { url } = await presign(token, {
    action: "get",
    key: item.r2_key,
    download: true,
    filename: item.name,
  });
  const blob = await xhrGetBlob(url, onProgress);

  if (isImage(item.mime) || isVideo(item.mime)) {
    const handled = await shareMediaFile(blob, item.name, item.mime);
    if (handled) return;
  }

  triggerBrowserDownload(blob, item.name);
}

const extOfKey = (key) => {
  const dot = key?.lastIndexOf(".") ?? -1;
  return dot > 0 ? key.slice(dot) : "";
};

// 스플릿 프리셋 항목(entry.split_pair)은 실제로는 A/B 두 사진이라, zip
// 안에서는 한 항목이 아니라 "이름 A"/"이름 B" 두 파일로 나눠 담는다.
function zipEntriesFor(entry, path) {
  if (!entry.split_pair) return [{ r2_key: entry.r2_key, zipPath: path }];
  const dot = path.lastIndexOf(".");
  const base = dot > 0 ? path.slice(0, dot) : path;
  const extA = dot > 0 ? path.slice(dot) : extOfKey(entry.r2_key);
  const extB = extOfKey(entry.split_pair.b.r2_key);
  return [
    { r2_key: entry.r2_key, zipPath: `${base} A${extA}` },
    { r2_key: entry.split_pair.b.r2_key, zipPath: `${base} B${extB}` },
  ];
}

// 폴더 하나를 재귀적으로 순회해 그 안의 실제 파일들을(하위 폴더 포함) 상대
// 경로와 함께 모은다. 빈 폴더는 zip 안에서 그냥 생략된다.
async function collectFolderFiles(token, folderId, prefix = "") {
  const entries = await listFiles(token, folderId);
  const files = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.is_folder) {
      files.push(...(await collectFolderFiles(token, entry.id, path)));
    } else if (entry.r2_key) {
      files.push(...zipEntriesFor(entry, path).map((part) => ({ ...entry, ...part })));
    }
  }
  return files;
}

// files(zipPath가 붙은 항목들)를 실제로 받아 zip 하나로 묶어 저장한다.
// onProgress는 파일 하나하나가 아니라 전체(파일 개수) 기준 진행도다.
async function zipAndDownload(token, files, zipName, onProgress) {
  const zipInput = {};
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const { url } = await presign(token, { action: "get", key: file.r2_key });
    const blob = await xhrGetBlob(url, (p) => onProgress?.((i + p) / files.length));
    zipInput[file.zipPath] = new Uint8Array(await blob.arrayBuffer());
  }

  const zipped = zipSync(zipInput, { level: 6 });
  triggerBrowserDownload(new Blob([zipped], { type: "application/zip" }), zipName);
}

// 폴더를 통째로 내려받을 때: 안의 파일들을 전부 받아 브라우저에서 zip으로
// 묶은 뒤 "<폴더 이름>.zip"으로 저장한다.
export async function downloadFolderAsZip({ token, folder, onProgress }) {
  const files = await collectFolderFiles(token, folder.id);
  if (!files.length) throw new Error("폴더가 비어 있습니다");
  await zipAndDownload(token, files, `${folder.name}.zip`, onProgress);
}

// 2개 이상을 한꺼번에 내려받을 때: 폴더는 재귀적으로 그 안의 파일들을 폴더
// 이름을 경로로 삼아 모으고, 일반 파일은 최상위에 그대로 두어 zip 하나로
// 묶는다. 이름이 겹치면(같은 이름으로 여러 번 올렸거나 두 폴더에 같은 이름의
// 파일이 있으면) 뒤에 "(2)"처럼 번호를 붙여 서로 덮어쓰지 않게 한다.
export async function downloadSelectionAsZip({ token, items, zipName, onProgress }) {
  const usedPaths = new Set();
  const uniquePath = (path) => {
    if (!usedPaths.has(path)) {
      usedPaths.add(path);
      return path;
    }
    const dot = path.lastIndexOf(".");
    const base = dot > 0 ? path.slice(0, dot) : path;
    const ext = dot > 0 ? path.slice(dot) : "";
    let n = 2;
    let candidate = `${base} (${n})${ext}`;
    while (usedPaths.has(candidate)) {
      n++;
      candidate = `${base} (${n})${ext}`;
    }
    usedPaths.add(candidate);
    return candidate;
  };

  const files = [];
  for (const item of items) {
    if (item.is_folder) {
      const nested = await collectFolderFiles(token, item.id, item.name);
      for (const f of nested) files.push({ ...f, zipPath: uniquePath(f.zipPath) });
    } else if (item.r2_key) {
      for (const part of zipEntriesFor(item, item.name)) {
        files.push({ ...item, ...part, zipPath: uniquePath(part.zipPath) });
      }
    }
  }
  if (!files.length) throw new Error("내려받을 파일이 없습니다");
  await zipAndDownload(token, files, zipName, onProgress);
}
