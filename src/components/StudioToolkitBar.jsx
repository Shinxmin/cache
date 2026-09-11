import CheckboxVisual from "./Checkbox";
import { DownloadIcon, GalleryIcon, ListIcon, TrashIcon } from "./icons";

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

// 60%만 채워진 원형 게이지: 나머지 40%는 점선으로 그려 "비어 있음"을
// 강조한다(차후 용량 압축 기능용 아이콘).
function CapacityIcon() {
  const r = 9;
  const c = 2 * Math.PI * r;
  const filled = c * 0.6;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" strokeDasharray="1.8 2.6" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={`${filled} ${c}`}
        strokeLinecap="round"
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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 10.59 6.7 5.29 5.29 6.7 10.59 12l-5.3 5.3 1.41 1.41L12 13.41l5.29 5.3 1.41-1.41L13.41 12l5.3-5.29-1.41-1.42L12 10.59z" />
    </svg>
  );
}

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(PageHeader.jsx가 마운트를 조건부로 제어,
// 검색바가 축소될 때는 style로 넘어온 transform으로 그 자리까지 끌어올려진다).
// 좌우 여백 없이 위아래 가로선으로만 구분된 한 줄이며,
// 왼쪽엔 전체 선택 체크박스+라벨+휴지통·다운로드 아이콘(선택된 항목 대상),
// 오른쪽엔 보기 전환(갤러리↔리스트)·눈(차후 썸네일 블러용)·용량 게이지(차후 용량
// 압축용)·편집·닫기 아이콘이 있다.
//
// 설정의 "스튜디오 툴킷 항상 활성화"가 켜져 있거나(closeDisabled=true, x로 못 끔),
// 파일을 꾹 눌러 선택이 하나라도 있으면(closeDisabled=false, x를 누르면 선택이
// 풀리며 닫힌다) 뜬다.
export default function StudioToolkitBar({
  onClose,
  closeDisabled,
  viewMode,
  onToggleView,
  allSelected,
  onToggleSelectAll,
  hasSelection,
  onDownloadSelected,
  onTrashSelected,
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
        <button className="studio-toolkit-icon-btn" type="button" aria-label="썸네일 블러">
          <EyeIcon />
        </button>
        <button className="studio-toolkit-icon-btn" type="button" aria-label="용량 압축">
          <CapacityIcon />
        </button>
        <button className="studio-toolkit-icon-btn" type="button" aria-label="편집">
          <PencilIcon />
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="닫기"
          disabled={closeDisabled}
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
