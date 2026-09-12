// 바이트 수를 "12.3MB" 같은 사람이 읽기 쉬운 형태로 바꾼다.
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)}${units[i]}`;
}

// MIME 서브타입이 관례적인 확장자와 다른 것들만 예외로 매핑한다(그 외에는
// 서브타입을 그대로 쓴다). 파일 이름의 확장자가 아니라 실제 MIME 메타데이터를
// 근거로 삼으므로, 이름에 확장자가 없거나 이름과 실제 형식이 달라도 정확하다.
const MIME_EXT_OVERRIDES = {
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/mp2t": "ts",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-wav": "wav",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.rar": "rar",
  "application/x-7z-compressed": "7z",
  "application/x-tar": "tar",
  "application/gzip": "gz",
  "application/x-gzip": "gz",
};

export function extensionFromMime(mime) {
  if (!mime || typeof mime !== "string") return null;
  const clean = mime.split(";")[0].trim().toLowerCase();
  if (MIME_EXT_OVERRIDES[clean]) return MIME_EXT_OVERRIDES[clean];
  const slash = clean.indexOf("/");
  if (slash < 0) return null;
  const sub = clean
    .slice(slash + 1)
    .replace(/^x-/, "")
    .replace(/\+.*$/, "");
  return sub || null;
}
