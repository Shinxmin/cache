import { useEffect, useRef } from "react";
import HeaderMoreButton from "./HeaderMoreButton";
import StudioToolkitBar from "./StudioToolkitBar";
import { BackIcon, DownloadIcon, SettingsIcon, UploadIcon } from "./icons";

// 전송 버튼(45px 원) 테두리에 그리는 진행도 게이지. 버튼 지름보다 살짝 안쪽에
// 그려서 원형 버튼 테두리를 따라 도는 것처럼 보이게 한다.
const TRANSFER_RING_R = 20;
const TRANSFER_RING_C = 2 * Math.PI * TRANSFER_RING_R;

// 상단 좌측정렬 제목. position: fixed로 화면 상단에 고정되어 스크롤 범위
// 자체에 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 절대 움직이거나
// 사라지지 않는다. 검색바는 더 이상 여기 없다 — 예전 하단 내비바 자리로
// 옮겨서 항상 떠 있다(App.jsx의 BottomSearchBar). 그래서 이 헤더는 제목·
// 뒤로가기·더보기/설정/전송현황 버튼, 그리고(선택 중이면) 스튜디오 툴킷
// 바만 그린다.
export default function PageHeader({
  title,
  toolkitActive,
  viewMode,
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
  infoVisible,
  toolkitLayout,
  onTool,
  onOpenSettings,
  resetKey,
}) {
  const ref = useRef(null);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이(제목 줄 +
  // 선택 중이면 스튜디오 툴킷 바까지)를 재서 --header-h로 넘겨준다. .page의
  // padding-top이 이 값을 써서 본문이 헤더 바로 밑에서 시작한다.
  useEffect(() => {
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  return (
    <header className="page-header" ref={ref}>
      {/* 제목과 액션(더보기·설정·전송현황 버튼)을 한 행에 놓고 수직 중앙 정렬한다. */}
      <div className="page-header-row">
        {canGoBack && (
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
        )}
        <h1 className="page-title">{title}</h1>
        <div className="page-header-actions">
          {/* 이번 세션에 업로드나 다운로드를 한 번이라도 했으면 계속 떠 있는
              버튼이다(사이트를 새로고침/종료하기 전까지 영구 표시). 테두리를
              따라 도는 원형 게이지는 실제로 전송 중일 때만 나타나고
              (transferInProgress), 여러 파일을 한 번에 올릴 때는 지금 파일
              하나가 아니라 배치 전체 기준 진행도를 보여준다. */}
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
          {/* key={resetKey}: 파일 화면↔즐겨찾기 화면을 오가면 새로 마운트되어
              열려 있던 상태가 닫힌 채로 초기화된다 */}
          <HeaderMoreButton key={resetKey} onUpload={onUpload} onNewFolder={onNewFolder} />
          {/* 더 보기(삼점) 바로 오른쪽의 설정 버튼. 더 보기처럼 옆으로 늘어나지
              않는 고정 45px 원이며, 누르면 바로 설정 화면이 열린다. 파일 화면
              (홈 탭이 사라진 뒤로는 이 화면이 유일한 기본 화면이다)에서만
              뜨고, 그 안에서 연 즐겨찾기 화면에서는 뜨지 않는다(onOpenSettings
              를 안 넘기면 아예 렌더링되지 않는다). */}
          {onOpenSettings && (
            <button className="header-settings" type="button" aria-label="설정" onClick={onOpenSettings}>
              <SettingsIcon size={19} />
            </button>
          )}
        </div>
      </div>
      {/* 평소엔 마운트되지 않는다(비활성화). 설정의 "스튜디오 툴킷 항상 활성화"가
          켜져 있거나, 파일을 꾹 눌러 선택이 하나라도 있으면 뜬다. 헤더 자체의
          ResizeObserver가 이 바의 유무에 따라 --header-h를 자동으로 다시 잰다.
          닫기 버튼은 없다 — 선택을 모두 풀거나(선택 때문에 떠 있었다면) 설정을
          끄면(항상 활성화 때문에 떠 있었다면) 사라진다. */}
      {toolkitActive && (
        <StudioToolkitBar
          layout={toolkitLayout}
          viewMode={viewMode}
          allSelected={allSelected}
          onToggleSelectAll={onToggleSelectAll}
          hasSelection={hasSelection}
          infoVisible={infoVisible}
          onTool={onTool}
        />
      )}
    </header>
  );
}
