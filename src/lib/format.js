// 바이트 수를 "12.3MB" 같은 사람이 읽기 쉬운 형태로 바꾼다.
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(value < 10 ? 1 : 0)}${units[i]}`;
}
