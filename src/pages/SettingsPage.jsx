import CheckboxVisual from "../components/Checkbox";
import { ChevronRightIcon } from "../components/icons";

// 설정 탭 본문.
export default function SettingsPage({
  toolkitActive,
  onToggleToolkit,
  searchAlwaysOn,
  onToggleSearchAlwaysOn,
  onOpenTrash,
}) {
  return (
    <div className="settings-list">
      <label className="settings-row">
        <span className="settings-row-label">스튜디오 툴킷 항상 활성화</span>
        <span className="checkbox">
          <input type="checkbox" checked={toolkitActive} onChange={(e) => onToggleToolkit(e.target.checked)} />
          <CheckboxVisual />
        </span>
      </label>
      <label className="settings-row">
        <span className="settings-row-label">검색바 항상 활성화</span>
        <span className="checkbox">
          <input
            type="checkbox"
            checked={searchAlwaysOn}
            onChange={(e) => onToggleSearchAlwaysOn(e.target.checked)}
          />
          <CheckboxVisual />
        </span>
      </label>
      <button className="settings-row settings-row--link" type="button" onClick={onOpenTrash}>
        <span className="settings-row-label">휴지통</span>
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
