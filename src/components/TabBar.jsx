import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const TABS = [
  { id: "home", label: "홈" },
  { id: "files", label: "파일" },
  { id: "settings", label: "설정" },
];

// 하단 리퀴드글라스 탭바. 글씨만 있는 세 개의 탭과, 선택된 탭 뒤에서 유리 방울처럼
// 미끄러지는 인디케이터로 구성된다(Apple 기본앱의 탭 전환 느낌).
export default function TabBar({ active, onChange }) {
  const barRef = useRef(null);
  const tabRefs = useRef({});
  const [rect, setRect] = useState(null);
  const [moving, setMoving] = useState(false);
  const prevRef = useRef(null);
  const [anim, setAnim] = useState({ from: "translateX(0)", to: "translateX(0)" });

  const measure = () => {
    const el = tabRefs.current[active];
    const bar = barRef.current;
    if (!el || !bar) return;
    const b = bar.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - b.left, w: r.width });
  };

  useLayoutEffect(measure, [active]);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (barRef.current) ro.observe(barRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 위치가 바뀔 때 잠깐 "늘어나는" 애니메이션을 준다.
  useEffect(() => {
    if (!rect) return;
    const prev = prevRef.current;
    prevRef.current = rect;
    if (!prev || prev.x === rect.x) return;
    setAnim({ from: `translateX(${prev.x}px)`, to: `translateX(${rect.x}px)` });
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 560);
    return () => clearTimeout(t);
  }, [rect]);

  return (
    <nav className="tabbar-wrap" aria-label="주요 탭">
      <div className="tabbar" ref={barRef} role="tablist">
        {rect && (
          <div
            className={`tab-indicator${moving ? " moving" : ""}`}
            style={{ width: rect.w, transform: `translateX(${rect.x}px)`, "--from": anim.from, "--to": anim.to }}
            aria-hidden
          />
        )}
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (tabRefs.current[t.id] = el)}
            role="tab"
            aria-selected={active === t.id}
            className={`tab${active === t.id ? " active" : ""}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
