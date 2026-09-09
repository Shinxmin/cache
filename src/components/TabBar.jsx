import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const TABS = [
  { id: "home", label: "홈" },
  { id: "files", label: "파일" },
  { id: "settings", label: "설정" },
];

// 하단 리퀴드글라스 탭바. 글씨만 있는 세 개의 탭과, 선택된 탭 뒤에서 스프링 곡선으로
// 미끄러지는 유리 인디케이터로 구성된다. 인디케이터 위치는 transform 하나로만 움직여
// 전환이 끊기지 않는다.
export default function TabBar({ active, onChange }) {
  const barRef = useRef(null);
  const tabRefs = useRef({});
  const [rect, setRect] = useState(null);

  const measure = () => {
    const el = tabRefs.current[active];
    const bar = barRef.current;
    if (!el || !bar) return;
    setRect({ x: el.offsetLeft, w: el.offsetWidth });
  };

  useLayoutEffect(measure, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    ro.observe(barRef.current);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="tabbar-wrap" aria-label="주요 탭">
      <div className="tabbar" ref={barRef} role="tablist">
        {rect && <div className="tab-indicator" style={{ width: rect.w, transform: `translate3d(${rect.x}px, 0, 0)` }} aria-hidden />}
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
