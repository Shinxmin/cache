import { useEffect, useRef } from "react";
import SearchBar from "./SearchBar";

// 하단바 아이콘과 같은 방식(단일 currentColor 채우기)의 가로 삼점(···) 아이콘.
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

// 상단 좌측정렬 제목(+선택적 검색바). position: fixed로 화면 상단에 고정되어
// 스크롤 범위 자체에 포함되지 않는다 — 제목과 검색바를 한 박스로 묶어서, 문서를
// 아무리 스크롤해도 둘 다 함께 그 자리에 그대로 있고 절대 움직이거나 사라지지
// 않는다. 스크롤 진행도만 --hdr(0~1) CSS 변수로 흘려보내 뒤에 깔리는 유리
// 레이어의 블러 불투명도를 순수 CSS가 조절한다(제목·검색바 자체는 변하지 않음).
export default function PageHeader({ title, showSearch, resetKey }) {
  const ref = useRef(null);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이(제목+검색바 포함)를
  // 재서 --header-h로 넘겨준다. .page의 padding-top이 이 값을 써서 본문이
  // 헤더 바로 밑에서 시작한다.
  useEffect(() => {
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [showSearch]);

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
      {/* 제목과 삼점 버튼을 한 행에 놓고 수직 중앙 정렬한다 */}
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
        {showSearch && (
          <button className="header-more-btn" type="button" aria-label="더 보기">
            <MoreIcon />
          </button>
        )}
      </div>
      {/* key={resetKey}: 탭이 바뀌면 새로 마운트되어 입력값이 초기화된다 */}
      {showSearch && <SearchBar key={resetKey} />}
    </header>
  );
}
