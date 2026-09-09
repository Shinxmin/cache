import { useEffect, useRef } from "react";

// 상단 좌측정렬 제목. position: fixed로 화면 최상단에 고정되어 스크롤 범위 자체에
// 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 움직이거나 사라지지 않는다.
// 스크롤해도 제목 자체의 크기·위치·투명도는 변하지 않고, 스크롤 진행도만 --hdr(0~1)
// CSS 변수로 흘려보내 뒤에 깔리는 유리 레이어의 블러 불투명도를 순수 CSS가 조절한다.
export default function PageHeader({ title }) {
  const ref = useRef(null);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이를 재서 --header-h로
  // 넘겨준다. .page의 padding-top이 이 값을 써서 본문이 헤더 밑에서 시작한다.
  useEffect(() => {
    const el = ref.current;
    // getBoundingClientRect()로 패딩을 포함한 실제 렌더링 높이를 잰다
    // (ResizeObserver의 contentRect는 패딩이 빠진 콘텐츠 박스만 알려준다).
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / 56));
      el.style.setProperty("--hdr", p.toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="page-header" ref={ref}>
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
