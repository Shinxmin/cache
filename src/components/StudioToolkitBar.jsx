import CheckboxVisual from "./Checkbox";
import { TOOL_META, toolLabel } from "./toolkitIcons";

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(검색바가 축소될 때는 style로 넘어온
// transform으로 그 자리까지 끌어올려진다).
// "전체 선택" 글자+체크박스와 기본 도구들을 한 줄로
// 그린다 — layout(도구 id 배열)은 사용자가 설정에서 바꾼 순서를 그대로
// 따른다. 아이콘 사이 간격(--toolkit-gap, styles.css)은 화면 폭이 얼마든
// (370px대 아이폰부터 태블릿까지) 유동적으로 늘어나되 일정 값 이상으로는
// 더 벌어지지 않는다 — 개수가 고정이라 어떤 폭에서도 한 줄에 다 들어가게
// 계산돼 있어 가로 스크롤이 필요 없다. 툴킷은 항상 떠 있다. 정보(i) 아이콘은 지금 선택된
// 항목 전체의 용량 표기가 켜져 있으면 눌린 상태(aria-pressed)로 표시된다.
export default function StudioToolkitBar({
  layout,
  viewMode,
  allSelected,
  onToggleSelectAll,
  hasSelection,
  infoVisible,
  onTool,
  style,
}) {
  const ctx = { viewMode };
  const toolIds = layout.filter((id) => TOOL_META[id]);

  const renderTool = (id) => {
    const meta = TOOL_META[id];
    return (
      <button
        key={id}
        className="studio-toolkit-icon-btn"
        type="button"
        aria-label={toolLabel(id, ctx)}
        aria-pressed={id === "info" ? Boolean(infoVisible) : undefined}
        disabled={meta.needsSelection && !hasSelection}
        onClick={() => onTool(id)}
      >
        {meta.icon(ctx)}
      </button>
    );
  };

  return (
    <div className="studio-toolkit" style={style}>
      <div className="studio-toolkit-row studio-toolkit-row-base">
        <label className="studio-toolkit-select">
          <span className="studio-toolkit-select-label">전체 선택</span>
          <span className="checkbox">
            <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            <CheckboxVisual />
          </span>
        </label>
        {toolIds.map(renderTool)}
      </div>
    </div>
  );
}
