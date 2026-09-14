// 설정의 테마 스위치가 고른 값을 기기에 저장해 재접속해도 유지한다.
const STORAGE_KEY = "cache_theme";

export function loadTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
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
