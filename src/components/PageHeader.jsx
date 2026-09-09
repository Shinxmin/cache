import { useEffect, useRef } from "react";

// 상단 좌측정렬 제목. sticky로 스크롤을 따라오며, 배경색 없이 스크롤 진행도(0~1)에 따라
// 배경 투명도와 블러만 조절한다. 스크롤은 #root 컨테이너에서 일어난다(App 참고).
export default function PageHeader({ title }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const scroller = document.getElementById("root");
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, scroller.scrollTop / 56));
      el.style.setProperty("--hdr", p.toFixed(3));
      const filter = `blur(${(p * 22).toFixed(1)}px) saturate(160%)`;
      el.style.webkitBackdropFilter = filter;
      el.style.backdropFilter = filter;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="page-header" ref={ref}>
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
