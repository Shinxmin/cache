import { useState } from "react";
import CheckboxVisual from "../components/Checkbox";
import ThemeSwitch from "../components/ThemeSwitch";
import ToolkitArranger from "../components/ToolkitArranger";
import { BackIcon, ChevronRightIcon } from "../components/icons";

// 설정 화면. 예전엔 하단 내비바의 한 탭이었지만, 하단 내비바 자체가
// 없어진 뒤로는 파일 탭 헤더의 톱니바퀴 버튼으로 여는 화면이 됐다
// (App.jsx). 그래서 휴지통·태그 화면과 같은 정적 헤더(뒤로가기+제목)를
// 직접 그린다. "스튜디오 툴킷 사용자 정렬"은 누르면 그 자리에서 펼쳐져
// 편집용 툴바(ToolkitArranger)가 나타난다 — 다른 화면으로 넘어가지 않는다.
// 즐겨찾기·애드온 스토어는 원래 홈 탭에 있었으나 홈 탭이 사라지면서 태그
// 바로 밑으로 옮겨왔다.
export default function SettingsPage({
  themeMode,
  onChangeThemeMode,
  toolkitActive,
  onToggleToolkit,
  toolkitLayout,
  viewMode,
  onChangeToolkitLayout,
  onResetToolkitLayout,
  onOpenTrash,
  onOpenTags,
  onOpenFavorites,
  onOpenAddonStore,
  onBack,
  onLogout,
}) {
  const [arrangeOpen, setArrangeOpen] = useState(false);
  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">설정</h1>
        </div>
      </header>
      <div className="page page--flush">
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
          <button className="settings-row settings-row--link" type="button" onClick={onOpenTrash}>
            <span className="settings-row-label">휴지통</span>
            <ChevronRightIcon size={18} />
          </button>
          <button className="settings-row settings-row--link" type="button" onClick={onOpenTags}>
            <span className="settings-row-label">태그</span>
            <ChevronRightIcon size={18} />
          </button>
          <button className="settings-row settings-row--link" type="button" onClick={onOpenFavorites}>
            <span className="settings-row-label">즐겨찾기</span>
            <ChevronRightIcon size={18} />
          </button>
          <button className="settings-row settings-row--link" type="button" onClick={onOpenAddonStore}>
            <span className="settings-row-label">애드온 스토어</span>
            <ChevronRightIcon size={18} />
          </button>
          <button className="settings-logout" type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
}
