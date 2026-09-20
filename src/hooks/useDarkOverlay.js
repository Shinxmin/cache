import { useEffect } from "react";

// 전체화면 검정 뷰어(파일 뷰어·스플릿 비교)가 떠 있는 동안 화면 맨 위가
// 검정으로 깨끗하게 덮이도록 만든다.
//
// 뷰어 자체는 position: fixed로 화면 전체를 검정으로 칠하지만, 그것만으로는
// 상단 상태바 영역에 페이지 배경(--bg, 밝은 회색)이 비쳐 보이고 그 경계가
// 흐릿한 띠처럼 남는 문제가 있었다(아이폰 PWA에서 특히 눈에 띈다). 원인이
// 둘 다일 수 있어 양쪽을 한 번에 막는다:
//   1) html/body/#root의 밝은 배경이 안전 영역 위쪽으로 비치는 것
//      — 여는 동안만 배경을 검정으로 바꾼다.
//   2) 고정 헤더의 블러 레이어(.page-header::before)가 backdrop-filter 탓에
//      사파리에서 뷰어(z-index 50)보다 위로 합성되는 것
//      — 여는 동안만 렌더링 자체를 끈다.
// 상단 상태바 색(meta theme-color)도 함께 검정으로 바꿨다가 되돌린다.
export default function useDarkOverlay() {
  useEffect(() => {
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content");
    root.setAttribute("data-overlay", "dark");
    meta?.setAttribute("content", "#000000");
    return () => {
      root.removeAttribute("data-overlay");
      if (prev != null) meta?.setAttribute("content", prev);
    };
  }, []);
}
