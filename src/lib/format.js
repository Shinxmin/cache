// 재생 시간(초)을 "1:07" 같은 분:초로 바꾼다. 한 시간이 넘으면 "1:02:03".
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

// 바이트 수를 사람이 읽기 쉬운 형태로 바꾼다. KB·MB·GB는 소수 한 자리("15.5KB", "12.3MB",
// "13.8GB"), TB부터는 소수 두 자리("1.06TB")까지 쓴다.
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  if (i === 0) return `${value}${units[i]}`;
  return `${value.toFixed(i >= 4 ? 2 : 1)}${units[i]}`;
}

// 스토리지 용량 표기의 최댓값(기본 10GB). 실제로 서버가 강제하는 한도는 아니고, 진행 막대·수치의
// 분모로만 쓴다. 나중에 설정에서 바꿀 수 있게 할 값이다.
export const STORAGE_QUOTA_BYTES = 10 * 1024 ** 3;
