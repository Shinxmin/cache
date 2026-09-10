import { useCallback, useEffect, useRef, useState } from "react";
import SearchBar, { SearchIcon } from "./SearchBar";
import HeaderMoreButton from "./HeaderMoreButton";

// 상단 좌측정렬 제목(+선택적 검색바). position: fixed로 화면 상단에 고정되어
// 스크롤 범위 자체에 포함되지 않는다 — 제목과 검색바를 한 박스로 묶어서, 문서를
// 아무리 스크롤해도 둘 다 함께 그 자리에 그대로 있고 절대 움직이거나 사라지지
// 않는다. 스크롤 진행도만 --hdr(0~1) CSS 변수로 흘려보내 뒤에 깔리는 유리
// 레이어의 블러 불투명도를 순수 CSS가 조절한다(제목·검색바 자체는 변하지 않음).
//
// 홈·파일 탭에서 스크롤하는 동안에는(멈출 때까지) 검색바가 삼점 버튼과 같은
// 50px 원으로 축소되어 그 왼쪽에 붙는다. 스크롤이 멈추면(약 180ms 동안 스크롤
// 이벤트가 없으면) 다시 정상 크기로 돌아온다. 축소된 아이콘을 누르면, 또는
// 축소된 채로 삼점 버튼을 눌러 열면(왼쪽으로 확장되며 겹칠 수 있으므로) 즉시
// 검색바가 정상 크기로 돌아와 충돌을 피한다.
export default function PageHeader({ title, showSearch, resetKey }) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapseTimerRef = useRef(0);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이(제목+검색바 포함)를
  // 재서 --header-h로 넘겨준다. .page의 padding-top이 이 값을 써서 본문이
  // 헤더 바로 밑에서 시작한다. (스크롤 중 축소는 opacity/transform만 쓰므로
  // 이 높이에는 영향을 주지 않는다 — 축소 애니메이션이 문서 스크롤 위치 자체를
  // 흔들지 않게 하기 위함.)
  useEffect(() => {
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [showSearch]);

  // 검색 없는 탭으로 가거나 다른 검색 탭으로 이동하면 축소 상태를 초기화한다.
  useEffect(() => {
    setCollapsed(false);
  }, [resetKey, showSearch]);

  // 대기 중인 축소 타이머를 지우고 즉시 정상 크기로 펼친다. 축소 아이콘을 직접
  // 누르거나, 축소된 채로 삼점 버튼을 열 때(왼쪽으로 확장되며 충돌 방지) 쓴다.
  const expandSearch = useCallback(() => {
    clearTimeout(collapseTimerRef.current);
    setCollapsed(false);
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
      if (showSearch) {
        setCollapsed(true);
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = setTimeout(() => setCollapsed(false), 180);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(collapseTimerRef.current);
    };
  }, [showSearch]);

  return (
    <header className="page-header" ref={ref}>
      {/* 제목과 액션(축소 검색 아이콘 + 삼점 버튼)을 한 행에 놓고 수직 중앙 정렬한다.
          검색이 없는 탭(설정)도 같은 행 구조를 써서 제목 위치가 항상 동일하다. */}
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
        {showSearch && (
          <div className="page-header-actions">
            <button
              className={`header-collapsed-search${collapsed ? " visible" : ""}`}
              type="button"
              aria-label="검색"
              aria-hidden={!collapsed}
              tabIndex={collapsed ? 0 : -1}
              onClick={expandSearch}
            >
              <SearchIcon size={18} />
            </button>
            {/* key={resetKey}: 탭이 바뀌면 새로 마운트되어 열려 있던 상태가 닫힌 채로 초기화된다 */}
            <HeaderMoreButton key={resetKey} onOpen={expandSearch} />
          </div>
        )}
      </div>
      {showSearch && (
        <div className={`search-bar-wrap${collapsed ? " hidden" : ""}`}>
          {/* key={resetKey}: 탭이 바뀌면 새로 마운트되어 입력값이 초기화된다 */}
          <SearchBar key={resetKey} hidden={collapsed} />
        </div>
      )}
    </header>
  );
}
