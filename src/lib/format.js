// 재생 시간(초)을 "1:07" 같은 분:초로 바꾼다. 한 시간이 넘으면 "1:02:03".
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

// formatDuration의 역변환. "0:00"/"10:00"/"1:02:03" 같은 형식만 받아 초로
// 돌려주고, 그 형식이 아니면 null(호출부가 편집을 무시하고 이전 값을 유지).
export function parseTimeInput(text) {
  const trimmed = (text || "").trim();
  if (!/^\d{1,2}(:\d{1,2}){1,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// 바이트 수를 "12.3MB" 같은 사람이 읽기 쉬운 형태로 바꾼다.
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)}${units[i]}`;
}
