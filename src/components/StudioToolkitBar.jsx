import CheckboxVisual from "./Checkbox";
import { TOOL_META, toolLabel } from "./toolkitIcons";
import useDragScroll from "../hooks/useDragScroll";

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(PageHeader.jsx가 마운트를 조건부로 제어,
// 검색바가 축소될 때는 style로 넘어온 transform으로 그 자리까지 끌어올려진다).
// 왼쪽에 전체 선택 체크박스+라벨, 그 오른쪽에 도구 아이콘들이 한 그룹으로
// 있다. 어떤 도구를 어떤 순서로 그릴지는 layout(도구 id 배열)이 정한다 —
// 기본 도구 10개에 애드온 스토어에서 추가한 애드온이 섞이고, 설정의 사용자
// 정렬로 순서를 바꿀 수 있다. 아이콘 그룹은 CSS grid(auto-fill)라 한 줄에
// 다 들어가면 균등 간격으로 퍼지고, 공간이 모자라면 남는 아이콘이 둘째
// 줄로 내려간다. 닫기 버튼은 없다 — 선택을 모두 풀거나 설정의 "항상
// 활성화"를 끄면 사라진다.
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
  const dragScroll = useDragScroll();
  return (
    <div className="studio-toolkit" style={style}>
      <label className="studio-toolkit-select">
        <span className="checkbox">
          <input type="checkbox" checked={allSelected} onChange={(e) => onToggleSelectAll(e.target.checked)} />
          <CheckboxVisual />
        </span>
        <span className="studio-toolkit-label">전체 선택</span>
      </label>
      <div className="studio-toolkit-icons" {...dragScroll}>
        {layout.map((id) => {
          const meta = TOOL_META[id];
          if (!meta) return null;
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
        })}
      </div>
    </div>
  );
}
