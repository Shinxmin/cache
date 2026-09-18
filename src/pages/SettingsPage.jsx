import { useState } from "react";
import CheckboxVisual from "../components/Checkbox";
import ThemeSwitch from "../components/ThemeSwitch";
import ToolkitArranger from "../components/ToolkitArranger";
import { ChevronRightIcon } from "../components/icons";

// 설정 탭 본문. "스튜디오 툴킷 사용자 정렬"은 누르면 그 자리에서 펼쳐져
// 편집용 툴바(ToolkitArranger)가 나타난다 — 다른 화면으로 넘어가지 않는다.
export default function SettingsPage({
  themeMode,
  onChangeThemeMode,
  toolkitActive,
  onToggleToolkit,
  toolkitLayout,
  viewMode,
  onChangeToolkitLayout,
  onResetToolkitLayout,
  searchAlwaysOn,
  onToggleSearchAlwaysOn,
  onOpenTrash,
  onOpenTags,
  onLogout,
}) {
  const [arrangeOpen, setArrangeOpen] = useState(false);
  return (
    <div className="settings-list">
      <div className="settings-row settings-row--toggle">
        <span className="settings-row-label">테마</span>
        <ThemeSwitch mode={themeMode} onChange={onChangeThemeMode} />
      </div>
      <label className="settings-row settings-row--toggle">
        <span className="settings-row-label">스튜디오 툴킷 항상 활성화</span>
        <span className="checkbox">
          <input type="checkbox" checked={toolkitActive} onChange={(e) => onToggleToolkit(e.target.checked)} />
          <CheckboxVisual />
        </span>
      </label>
      <div className="settings-row settings-arrange-row">
        <button
          className="settings-arrange-toggle"
          type="button"
          aria-expanded={arrangeOpen}
          onClick={() => setArrangeOpen((v) => !v)}
        >
          <span className="settings-row-label">스튜디오 툴킷 사용자 정렬</span>
        </button>
        <button className="settings-reset-link" type="button" onClick={onResetToolkitLayout}>
          초기화
        </button>
        <button
          className="settings-arrange-chevron-btn"
          type="button"
          aria-label={arrangeOpen ? "접기" : "펼치기"}
          aria-expanded={arrangeOpen}
          onClick={() => setArrangeOpen((v) => !v)}
        >
          <span className={`settings-chevron${arrangeOpen ? " is-open" : ""}`}>
            <ChevronRightIcon size={18} />
          </span>
        </button>
      </div>
      {arrangeOpen && (
        <div className="settings-arrange">
          <ToolkitArranger layout={toolkitLayout} viewMode={viewMode} onChange={onChangeToolkitLayout} />
        </div>
      )}
      <label className="settings-row settings-row--toggle">
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
      <button className="settings-row settings-row--link" type="button" onClick={onOpenTags}>
        <span className="settings-row-label">태그</span>
        <ChevronRightIcon size={18} />
      </button>
      <button className="settings-logout" type="button" onClick={onLogout}>
        로그아웃
      </button>
    </div>
  );
}
