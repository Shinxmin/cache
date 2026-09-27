// 재생 시간(초)을 "1:07" 같은 분:초로 바꾼다. 한 시간이 넘으면 "1:02:03".
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

// 바이트 수를 "12.3MB" 같은 사람이 읽기 쉬운 형태로 바꾼다. 기본은 10 이상이면
// 소수점을 떼지만("123MB"), fixedDecimal이면 크기와 상관없이 항상 소수 한
// 자리까지 쓴다("12.0GB" — 정보 패널).
export function formatBytes(bytes, { fixedDecimal = false } = {}) {
  if (!bytes || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  if (i === 0) return `${value}${units[i]}`;
  return `${value.toFixed(fixedDecimal || value < 10 ? 1 : 0)}${units[i]}`;
}
