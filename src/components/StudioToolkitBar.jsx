import CheckboxVisual from "./Checkbox";
import { ArrowRightIcon, DownloadIcon, GalleryIcon, HashIcon, InfoIcon, ListIcon, TrashIcon } from "./icons";

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
// 좌우 여백 없이 위아래 가로선으로만 구분된 한 줄이며, 왼쪽에 전체 선택
// 체크박스+라벨, 그 오른쪽에 아이콘 9개(정보·휴지통·다운로드·이동·보기 전환·
// 블러·용량 압축·태그·이름 바꾸기)가 하나의 그룹으로 나란히 있다. 9개 모두
// 같은 폭의 버튼이라 .studio-toolkit-icons에 justify-content:space-between을
// 주는 것만으로 서로 간격이 고르게 벌어진다(그룹을 둘로 나눠 오른쪽 그룹만
// margin-left:auto로 밀던 예전 방식은 두 그룹 "사이"만 넓어 보였다). 뒤에
// 보이지 않는 .studio-toolkit-spacer가 남는 공간의 20%를 대신 가져가
// 아이콘 사이 간격이 화면 끝까지 다 벌어지지 않고 20% 좁게 유지된다. 닫기
// 버튼은 없다 — 선택을 모두 풀거나(선택 때문에 떠 있었다면) 설정의
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
  onMoveSelected,
  onTagSelected,
  onOptimizeSelected,
  infoVisible,
  onToggleInfo,
  onEditSelected,
  style,
}) {
  return (
    <div className="studio-toolkit" style={style}>
      <label className="studio-toolkit-select">
        <span className="checkbox">
          <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
          <CheckboxVisual />
        </span>
        <span className="studio-toolkit-label">전체 선택</span>
      </label>
      <div className="studio-toolkit-icons">
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
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="이동"
          disabled={!hasSelection}
          onClick={onMoveSelected}
        >
          <ArrowRightIcon />
        </button>
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
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="용량 압축"
          disabled={!hasSelection}
          onClick={onOptimizeSelected}
        >
          <CapacityIcon />
        </button>
        <button
          className="studio-toolkit-icon-btn"
          type="button"
          aria-label="태그"
          disabled={!hasSelection}
          onClick={onTagSelected}
        >
          <HashIcon />
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
      {/* 아이콘 그룹이 남는 공간을 전부 차지하지 않고 80%만 가져가게 해,
          간격이 너무 벌어지지 않도록 나머지 20%는 이 보이지 않는 칸이
          오른쪽 끝에서 대신 흡수한다(styles.css의 .studio-toolkit-icons
          .studio-toolkit-spacer 주석 참고). */}
      <span className="studio-toolkit-spacer" aria-hidden="true" />
    </div>
  );
}
