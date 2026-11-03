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

// 설정의 스토리지 섹션에서 직접 고친 최댓값(총용량). 이 기기에 저장된다.
const QUOTA_KEY = "cache_storage_quota_bytes";
export function loadQuotaBytes() {
  try {
    const n = Number(localStorage.getItem(QUOTA_KEY));
    return Number.isFinite(n) && n > 0 ? n : STORAGE_QUOTA_BYTES;
  } catch {
    return STORAGE_QUOTA_BYTES;
  }
}
export function saveQuotaBytes(bytes) {
  try {
    localStorage.setItem(QUOTA_KEY, String(bytes));
  } catch {
    /* 저장소를 못 쓰는 환경이면 이번 세션에서만 유지된다 */
  }
}

// "5", "5GB", "1.5 tb", "500MB"처럼 입력한 용량 글자를 바이트로 바꾼다(단위가 없으면 GB). 못 읽으면 null.
export function parseBytes(text) {
  const m = String(text ?? "").trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb)?$/i);
  if (!m) return null;
  const unit = (m[2] || "gb").toLowerCase();
  const pow = { b: 0, kb: 1, mb: 2, gb: 3, tb: 4 }[unit];
  const bytes = Math.round(parseFloat(m[1]) * 1024 ** pow);
  return bytes > 0 ? bytes : null;
}

// Cloudflare R2 저장 요금: 무료 10GB를 넘는 부분에 GB당 월 $0.015. "0.00$"처럼 소수 두 자리 달러로 표기한다.
const R2_FREE_BYTES = 10 * 1024 ** 3;
const R2_PRICE_PER_GB = 0.015;
export function formatStorageCost(bytes) {
  const billableGb = Math.max(0, (bytes || 0) - R2_FREE_BYTES) / 1024 ** 3;
  return `${(billableGb * R2_PRICE_PER_GB).toFixed(2)}$`;
}

// 업로드·생성 시각을 "2027년 03월 05일 14:00"처럼(월·일 두 자리, 24시간제, 기기 시간대) 표기한다.
export function formatDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}년 ${p(d.getMonth() + 1)}월 ${p(d.getDate())}일 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
