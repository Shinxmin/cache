// 자주 쓰는 확장자 ↔ mime 매핑. 업로드 당시 확장자 없이 저장된(혹은 아주 옛날
// 데이터의) 파일 이름을 화면에 보여줄 때, mime으로 확장자를 추정해 채워 넣는
// 용도로만 쓴다 — 실제 저장된 이름을 바꾸지는 않는다.
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
};

// 이름 끝의 점 뒤 부분을 확장자로 본다(대소문자·원래 표기를 그대로 유지).
// 점이 맨 앞이거나 맨 끝이면(".gitignore", "이름.") 확장자로 치지 않는다.
export function extensionOf(name) {
  if (!name) return "";
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1);
}

export function extensionFromMime(mime) {
  if (!mime) return "";
  return MIME_EXTENSIONS[mime.toLowerCase()] || "";
}

// 화면에 보여줄 "실효 이름". 저장된 이름에 확장자가 없으면(아주 옛날 데이터
// 등) mime으로 추정한 확장자를 붙여서 보여준다 — 실제 데이터는 건드리지
// 않는, 표시 전용 보정이다. 폴더는 확장자 개념이 없으니 그대로 둔다.
export function displayName(item) {
  if (!item) return "";
  if (item.is_folder) return item.name ?? "";
  const name = item.name ?? "";
  if (extensionOf(name)) return name;
  const ext = extensionFromMime(item.mime);
  return ext ? `${name}.${ext}` : name;
}
