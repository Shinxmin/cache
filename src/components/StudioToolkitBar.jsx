import CheckboxVisual from "./Checkbox";
import { TOOL_META, toolLabel } from "./toolkitIcons";
import { isAddonId } from "../lib/addons";

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(PageHeader.jsx가 마운트를 조건부로 제어,
// 검색바가 축소될 때는 style로 넘어온 transform으로 그 자리까지 끌어올려진다).
// 두 줄로 나뉜다: 1열은 전체 선택 체크박스(라벨 글자 없이 체크박스만)와
// 기본 도구 10개뿐이고, 애드온 스토어에서 추가한 애드온은 설치돼 있으면
// 무조건 2열로 따로 내려간다 — layout(도구 id 배열) 안에서 사용자가 기본
// 도구와 애드온을 섞어 순서를 바꿔도(설정의 사용자 정렬), 화면에 그릴 땐
// 이 두 그룹으로 갈라 각자 순서만 유지한다. 아이콘 사이 간격(--toolkit-gap,
// styles.css)은 화면 폭이 얼마든(370px대 아이폰부터 태블릿까지) 유동적으로
// 늘어나되 일정 값 이상으로는 더 벌어지지 않고, 2열도 항상 1열과 똑같은
// 간격을 쓴다 — 1열은 정확히 11개(체크박스+기본 10개)라 어떤 폭에서도 한
// 줄에 다 들어가게 계산돼 있어 가로 스크롤이 필요 없다. 2열 맨 앞의 투명
// 스페이서는 체크박스와 같은 폭이라, 첫 애드온 아이콘이 1열의 첫
// "아이콘"(체크박스 바로 다음 자리)과 정확히 같은 x좌표에서 시작하게
// 만든다. 닫기 버튼은 없다 — 선택을 모두 풀거나 설정의 "항상 활성화"를
// 끄면 사라진다.
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
  const baseIds = layout.filter((id) => TOOL_META[id] && !isAddonId(id));
  const addonIds = layout.filter((id) => TOOL_META[id] && isAddonId(id));

  const renderTool = (id) => {
    const meta = TOOL_META[id];
    return (
      <button
        key={id}
        className="studio-toolkit-icon-btn"
        type="button"
        aria-label={toolLabel(id, ctx)}
        aria-pressed={id === "info" ? infoVisible : undefined}
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
        <label className="studio-toolkit-select" aria-label="전체 선택">
          <span className="checkbox">
            <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
            <CheckboxVisual />
          </span>
        </label>
        {baseIds.map(renderTool)}
      </div>
      {addonIds.length > 0 && (
        <div className="studio-toolkit-row studio-toolkit-row-addons">
          <span className="studio-toolkit-row-addons-spacer" aria-hidden="true" />
          {addonIds.map(renderTool)}
        </div>
      )}
    </div>
  );
}
