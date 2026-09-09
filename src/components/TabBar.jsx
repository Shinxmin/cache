import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const TABS = [
  { id: "home", label: "홈" },
  { id: "files", label: "파일" },
  { id: "settings", label: "설정" },
];

// 채워진(solid) 아이콘. currentColor를 쓰므로 .tab/.tab.active의 색(라이트·다크 각각의
// var(--text-2)/var(--text))을 그대로 물려받아 테마와 활성 상태에 자동으로 맞는다.
const ICONS = {
  home: (
    // 다른 아이콘과 동일하게 단일 fill 패스 하나로만 그린다(별도 stroke·fill-rule
    // 구멍 트릭 없음 — 반투명 색에서도 이중 톤이 생기지 않는다). 문은 바닥까지
    // 닿는 노치로 외곽선 자체에 파 넣었고, 문 위쪽 두 모서리만 둥글게 처리했다.
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
      <path d="M13.3 4.3 Q12 3 10.7 4.3 L5.3 9.7 Q4 11 4 12.8 L4 19.2 Q4 21 5.8 21 L10 21 L10 15 Q10 14 11 14 L13 14 Q14 14 14 15 L14 21 L18.2 21 Q20 21 20 19.2 L20 12.8 Q20 11 18.7 9.7 Z" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
};

// 하단 리퀴드글라스 탭바. 아이콘(중앙) + 작은 라벨(아래)로 구성된 세 개의 탭과, 선택된
// 탭 뒤에서 스프링 곡선으로 미끄러지는 유리 인디케이터로 구성된다. 인디케이터 위치는
// transform 하나로만 움직여 전환이 끊기지 않는다.
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
    // 실제 렌더링된 하단바 폭을 --tabbar-w로 공유한다. 검색바가 이 값을 그대로
    // 가져다 써서 하단바와 항상 같은 가로 길이를 유지한다(styles.css 참고).
    const publishWidth = () => document.documentElement.style.setProperty("--tabbar-w", `${barRef.current.getBoundingClientRect().width}px`);
    const ro = new ResizeObserver(() => {
      measure();
      publishWidth();
    });
    ro.observe(barRef.current);
    publishWidth();
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
            <span className="tab-icon">{ICONS[t.id]}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
