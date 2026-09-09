import { useCallback, useEffect, useState } from "react";

const KEY = "cache.theme";
export const THEME_COLORS = { dark: "#1B1B1B", light: "#F5F5F7" };

function readMode() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch (_e) {
    return "system";
  }
}

function resolve(mode) {
  if (mode === "system") return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return mode;
}

function apply(resolved) {
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[resolved]);
}

// 테마 모드(system/light/dark)와 실제 적용값(light/dark)을 관리한다.
// html[data-theme]와 <meta name="theme-color">를 함께 갱신해 iOS 상태바 영역까지 배경색을 맞춘다.
export function useTheme() {
  const [mode, setModeState] = useState(readMode);
  const [resolved, setResolved] = useState(() => resolve(readMode()));

  useEffect(() => {
    const r = resolve(mode);
    setResolved(r);
    apply(r);
    if (mode !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = resolve("system");
      setResolved(next);
      apply(next);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch (_e) {
      /* ignore */
    }
  }, []);

  return { mode, setMode, resolved };
}
