// 설정의 테마 스위치가 고른 값("system" | "light" | "dark")을 기기에
// 저장해 재접속해도 유지한다. "system"이면 실제 라이트/다크 여부는
// 저장하지 않고 매번 OS 설정을 그대로 따른다(App.jsx가 실시간으로 추적).
const STORAGE_KEY = "cache_theme";

export function loadTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "system" || v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장 실패(프라이빗 모드 등)해도 이번 세션 안에서는 그대로 적용되니 무시한다.
  }
}
