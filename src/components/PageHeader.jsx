import { useCallback, useEffect, useRef, useState } from "react";
import SearchBar, { SearchIcon } from "./SearchBar";
import HeaderMoreButton from "./HeaderMoreButton";
import StudioToolkitBar from "./StudioToolkitBar";
import { BackIcon, DownloadIcon, UploadIcon } from "./icons";

// 전송 버튼(45px 원) 테두리에 그리는 진행도 게이지. 버튼 지름보다 살짝 안쪽에
// 그려서 원형 버튼 테두리를 따라 도는 것처럼 보이게 한다.
const TRANSFER_RING_R = 20;
const TRANSFER_RING_C = 2 * Math.PI * TRANSFER_RING_R;

// 상단 좌측정렬 제목(+선택적 검색바). position: fixed로 화면 상단에 고정되어
// 스크롤 범위 자체에 포함되지 않는다 — 제목과 검색바를 한 박스로 묶어서, 문서를
// 아무리 스크롤해도 둘 다 함께 그 자리에 그대로 있고 절대 움직이거나 사라지지
// 않는다. 스크롤 진행도만 --hdr(0~1) CSS 변수로 흘려보내 뒤에 깔리는 유리
// 레이어의 블러 불투명도를 순수 CSS가 조절한다(제목·검색바 자체는 변하지 않음).
//
// 검색바 항상 활성화(searchAlwaysOn) 켜짐(기본값): 홈·파일 탭에서 스크롤하는
// 동안에는(멈출 때까지) 검색바가 삼점 버튼과 같은 50px 원으로 축소되어 그
// 왼쪽에 붙는다. 스크롤이 멈추면(약 180ms 동안 스크롤 이벤트가 없으면) 다시
// 정상 크기로 돌아온다.
// searchAlwaysOn 꺼짐: 검색바는 기본적으로 항상 축소되어 있다. 축소 아이콘을
// 누르면 펼쳐지고, 검색을 완료(엔터/모바일 확인 버튼)하거나 스크롤하면 다시
// 축소된다(자동으로 되펼쳐지는 타이머 없음).
// 두 모드 모두, 축소된 아이콘을 누르거나 축소된 채로 삼점 버튼을 열면(왼쪽으로
// 확장되며 겹칠 수 있으므로) 즉시 검색바가 정상 크기로 돌아와 충돌을 피한다.
export default function PageHeader({
  title,
  showSearch,
  resetKey,
  toolkitActive,
  onCloseToolkit,
  closeDisabled,
  searchAlwaysOn,
  viewMode,
  onToggleView,
  onUpload,
  onNewFolder,
  canGoBack,
  onBack,
  transferVisible,
  transferInProgress,
  transferDirection,
  transferProgress,
  onOpenTransfers,
  allSelected,
  onToggleSelectAll,
  hasSelection,
  onDownloadSelected,
  onTrashSelected,
}) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(!searchAlwaysOn);
  const collapseTimerRef = useRef(0);
  const [toolkitLift, setToolkitLift] = useState(0);

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

  // 검색 없는 탭으로 가거나 다른 검색 탭으로 이동하면(또는 설정에서 검색바
  // 항상 활성화 여부를 바꾸면) 기본 상태로 초기화한다 — 항상 활성화면 펼쳐진
  // 채로, 아니면 축소된 채로.
  useEffect(() => {
    setCollapsed(!searchAlwaysOn);
  }, [resetKey, showSearch, searchAlwaysOn]);

  // 검색바가 축소될 때(스크롤 중) 스튜디오 툴킷이 켜져 있다면, 이제 비어 보이는
  // 검색바 자리로 툴킷을 끌어올린다. 검색바 칸 자체의 높이(--header-h)는 그대로
  // 두고(스크롤 중 흔들림 방지, 위 주석 참고) 툴킷만 transform으로 겹쳐 올리므로
  // 헤더 전체 높이는 변하지 않는다. 검색바-툴킷 사이 실제 간격을 재서 쓰기 때문에
  // 레이아웃이 바뀌어도 값을 다시 맞출 필요가 없다.
  useEffect(() => {
    if (!showSearch || !toolkitActive) return;
    const headerEl = ref.current;
    const measure = () => {
      const sw = headerEl.querySelector(".search-bar-wrap");
      const tk = headerEl.querySelector(".studio-toolkit");
      if (!sw || !tk) return;
      setToolkitLift(tk.offsetTop - sw.offsetTop);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerEl);
    return () => ro.disconnect();
  }, [showSearch, toolkitActive]);

  // 대기 중인 축소 타이머를 지우고 즉시 정상 크기로 펼친다. 축소 아이콘을 직접
  // 누르거나, 축소된 채로 삼점 버튼을 열 때(왼쪽으로 확장되며 충돌 방지) 쓴다.
  const expandSearch = useCallback(() => {
    clearTimeout(collapseTimerRef.current);
    setCollapsed(false);
  }, []);

  // 검색 완료(엔터/모바일 확인 버튼): 검색바 항상 활성화가 꺼져 있을 때만
  // 다시 축소한다(켜져 있을 때는 항상 펼쳐진 채로 유지되어야 하므로 무시).
  const collapseOnSubmit = useCallback(() => {
    if (searchAlwaysOn) return;
    clearTimeout(collapseTimerRef.current);
    setCollapsed(true);
  }, [searchAlwaysOn]);

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
        // 항상 활성화일 때만 스크롤이 멈추면 자동으로 다시 펼친다. 꺼져 있을
        // 때는 기본 상태 자체가 축소된 것이므로 되펼치는 타이머가 필요 없다.
        if (searchAlwaysOn) {
          collapseTimerRef.current = setTimeout(() => setCollapsed(false), 180);
        }
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      clearTimeout(collapseTimerRef.current);
    };
  }, [showSearch, searchAlwaysOn]);

  return (
    <header className="page-header" ref={ref}>
      {/* 제목과 액션(축소 검색 아이콘 + 삼점 버튼)을 한 행에 놓고 수직 중앙 정렬한다.
          검색이 없는 탭(설정)도 같은 행 구조를 써서 제목 위치가 항상 동일하다. */}
      <div className="page-header-row">
        {canGoBack && (
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
        )}
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
            {/* 이번 세션에 업로드나 다운로드를 한 번이라도 했으면 계속 떠 있는
                버튼이다(사이트를 새로고침/종료하기 전까지 영구 표시). 축소 검색
                아이콘과 같은 45px 원·같은 타이밍으로 열리고, 검색바와 삼점바
                사이에 자리한다. 테두리를 따라 도는 원형 게이지는 실제로 전송 중일
                때만 나타나고(transferInProgress), 여러 파일을 한 번에 올릴 때는
                지금 파일 하나가 아니라 배치 전체 기준 진행도를 보여준다. */}
            <button
              className={`header-transfer${transferVisible ? " visible" : ""}`}
              type="button"
              aria-label="전송 현황"
              aria-hidden={!transferVisible}
              tabIndex={transferVisible ? 0 : -1}
              onClick={onOpenTransfers}
            >
              {transferInProgress && (
                <svg className="header-transfer-ring" viewBox="0 0 45 45" width="45" height="45" aria-hidden="true">
                  <circle className="header-transfer-ring-track" cx="22.5" cy="22.5" r={TRANSFER_RING_R} />
                  <circle
                    className="header-transfer-ring-fill"
                    cx="22.5"
                    cy="22.5"
                    r={TRANSFER_RING_R}
                    strokeDasharray={TRANSFER_RING_C}
                    strokeDashoffset={TRANSFER_RING_C * (1 - Math.min(1, Math.max(0, transferProgress ?? 0)))}
                  />
                </svg>
              )}
              {transferDirection === "down" ? <DownloadIcon /> : <UploadIcon />}
            </button>
            {/* key={resetKey}: 탭이 바뀌면 새로 마운트되어 열려 있던 상태가 닫힌 채로 초기화된다 */}
            <HeaderMoreButton key={resetKey} onOpen={expandSearch} onUpload={onUpload} onNewFolder={onNewFolder} />
          </div>
        )}
      </div>
      {showSearch && (
        <div className={`search-bar-wrap${collapsed ? " hidden" : ""}`}>
          {/* key={resetKey}: 탭이 바뀌면 새로 마운트되어 입력값이 초기화된다 */}
          <SearchBar key={resetKey} hidden={collapsed} onSubmit={collapseOnSubmit} />
        </div>
      )}
      {/* 평소엔 마운트되지 않는다(비활성화). 설정의 "스튜디오 툴킷 항상 활성화"가
          켜져 있거나, 파일을 꾹 눌러 선택이 하나라도 있으면 뜬다. 헤더 자체의
          ResizeObserver가 이 바의 유무에 따라 --header-h를 자동으로 다시 잰다.
          "항상 활성화" 설정이 띄운 것이면 x로 끌 수 없다(closeDisabled) — 그
          설정을 꺼야 사라진다. 선택 때문에 떠 있는 것이면 x가 선택을 지운다. */}
      {showSearch && toolkitActive && (
        <StudioToolkitBar
          onClose={onCloseToolkit}
          closeDisabled={closeDisabled}
          viewMode={viewMode}
          onToggleView={onToggleView}
          allSelected={allSelected}
          onToggleSelectAll={onToggleSelectAll}
          hasSelection={hasSelection}
          onDownloadSelected={onDownloadSelected}
          onTrashSelected={onTrashSelected}
          style={{ transform: collapsed ? `translateY(-${toolkitLift}px)` : "none" }}
        />
      )}
    </header>
  );
}
