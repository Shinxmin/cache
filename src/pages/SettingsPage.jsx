import CheckboxVisual from "../components/Checkbox";

// 설정 탭 본문. 지금은 스튜디오 툴킷(홈·파일 탭 선택 도구줄) on/off 하나뿐이다.
export default function SettingsPage({ toolkitActive, onToggleToolkit }) {
  return (
    <div className="settings-list">
      <label className="settings-row">
        <span className="settings-row-label">스튜디오 툴킷</span>
        <span className="checkbox">
          <input type="checkbox" checked={toolkitActive} onChange={(e) => onToggleToolkit(e.target.checked)} />
          <CheckboxVisual />
        </span>
      </label>
    </div>
  );
}
