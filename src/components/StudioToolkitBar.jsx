import CheckboxVisual from "./Checkbox";
import { DownloadIcon, GalleryIcon, InfoIcon, ListIcon, TrashIcon } from "./icons";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

// 6:4로 나뉜 원형 그래프(차후 용량 압축 기능용 아이콘). 두 구간 모두 실선이고
// 끝을 각지게(strokeLinecap 기본값) 처리해 정확히 맞물려 이어지므로, 이전
// 디자인처럼 칠해진 호와 점선이 서로 겹쳐 지저분해 보이는 문제가 없다.
function CapacityIcon() {
  const r = 9;
  const c = 2 * Math.PI * r;
  const filled = c * 0.6;
  const empty = c * 0.4;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeDasharray={`${empty} ${c}`}
        strokeDashoffset={-filled}
        transform="rotate(-90 12 12)"
      />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={`${filled} ${c}`}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(PageHeader.jsx가 마운트를 조건부로 제어,
// 검색바가 축소될 때는 style로 넘어온 transform으로 그 자리까지 끌어올려진다).
// 좌우 여백 없이 위아래 가로선으로만 구분된 한 줄이며,
// 왼쪽엔 전체 선택 체크박스+라벨+정보(용량 표시 토글)·휴지통·다운로드 아이콘
// (뒤 둘은 선택된 항목 대상), 오른쪽엔 보기 전환(갤러리↔리스트)·눈(선택된
// 이미지·영상 썸네일 블러 토글)·용량 게이지(차후 용량 압축용)·편집 아이콘이
// 있다. 닫기 버튼은 없다 — 선택을 모두 풀거나(선택 때문에 떠 있었다면) 설정의
// "항상 활성화"를 끄면 사라진다.
export default function StudioToolkitBar({
  viewMode,
  onToggleView,
  allSelected,
  onToggleSelectAll,
  hasSelection,
  onDownloadSelected,
  onTrashSelected,
  onBlurSelected,
  infoVisible,
  onToggleInfo,
  onEditSelected,
  style,
}) {
  return (
    <div className="studio-toolkit" style={style}>
      <div className="studio-toolkit-left">
        <label className="studio-toolkit-select">
          <span className="checkbox">
            <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            <CheckboxVisual />
          </span>
          <span className="studio-toolkit-label">전체 선택</span>
        </label>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="파일·폴더 용량 정보"
          aria-pressed={infoVisible}
          disabled={!hasSelection}
          onClick={onToggleInfo}
        >
          <InfoIcon />
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="휴지통으로 삭제"
          disabled={!hasSelection}
          onClick={onTrashSelected}
        >
          <TrashIcon />
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="다운로드"
          disabled={!hasSelection}
          onClick={onDownloadSelected}
        >
          <DownloadIcon />
        </button>
      </div>
      <div className="studio-toolkit-right">
        {/* 파일 탭 갤러리형/리스트형 전환. 현재 보기 상태와 반대되는 아이콘을 보여준다. */}
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label={viewMode === "gallery" ? "리스트로 보기" : "갤러리로 보기"}
          onClick={onToggleView}
        >
          {viewMode === "gallery" ? <ListIcon /> : <GalleryIcon />}
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="선택한 썸네일 블러"
          disabled={!hasSelection}
          onClick={onBlurSelected}
        >
          <EyeIcon />
        </button>
        <button className="studio-toolkit-icon-btn" type="button" aria-label="용량 압축">
          <CapacityIcon />
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="이름 바꾸기"
          disabled={!hasSelection}
          onClick={onEditSelected}
        >
          <PencilIcon />
        </button>
      </div>
    </div>
  );
}
