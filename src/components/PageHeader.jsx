import { useEffect, useRef } from "react";

// 상단 좌측정렬 제목. sticky로 그 자리에 고정되며 스크롤해도 제목 자체는 전혀 변하지
// 않는다. 스크롤 진행도만 --hdr(0~1) CSS 변수로 흘려보내고, 뒤에 깔리는 유리 레이어의
// 블러 불투명도는 순수 CSS(styles.css의 .page-header::before)가 처리한다.
export default function PageHeader({ title }) {
  const ref = useRef(null);

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
