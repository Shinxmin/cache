import ThemeSwitch from "../components/ThemeSwitch";
import StoragePasswordSection from "../components/StoragePasswordSection";
import BottomSearchBar from "../components/BottomSearchBar";
import StorageSection from "../components/StorageSection";
import { ChevronRightIcon, ThemeIcon } from "../components/icons";
import { APP_VERSION } from "../lib/version";

// 설정 화면. 예전엔 하단 내비바의 한 탭이었지만, 하단 내비바 자체가
// 없어진 뒤로는 파일 탭 헤더의 톱니바퀴 버튼으로 여는 화면이 됐다
// (App.jsx). 그래서 정적 헤더(제목)와 홈과 같은 하단바를 직접 그린다.
export default function SettingsPage({
  session,
  themeMode,
  onChangeThemeMode,
  onOpenTrash,
  onOpenDuplicates,
  onBack,
  onStoragePasswordChange,
  storageUsed,
  storageBillingBytes,
  storageRegion,
  storageLatency,
  quotaBytes,
  onChangeQuota,
  onLogout,
}) {
  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <h1 className="page-title">설정</h1>
        </div>
      </header>
      <div className="page page--flush page--has-dock">
        <div className="settings-list">
          {/* 각 기능 섹션은 홈의 스토리지 섹션처럼 테두리로 감싼 독립된 상자다. */}
          <section className="settings-card">
            <div className="settings-card-head">
              <div className="page-brand">
                <ThemeIcon size={23} />
                <h2 className="page-brand-title">테마</h2>
              </div>
              <ThemeSwitch mode={themeMode} onChange={onChangeThemeMode} />
            </div>
          </section>
          <StorageSection
            storageUsed={storageUsed}
            storageBillingBytes={storageBillingBytes}
            storageRegion={storageRegion}
            storageLatency={storageLatency}
            quotaBytes={quotaBytes}
            onChangeQuota={onChangeQuota}
          />
          <section className="settings-card">
            <StoragePasswordSection session={session} onChange={onStoragePasswordChange} />
          </section>
          <section className="settings-card">
            <button className="settings-row settings-row--link" type="button" onClick={onOpenDuplicates}>
              <span className="settings-row-label">중복된 파일</span>
              <ChevronRightIcon size={18} />
            </button>
          </section>
          <section className="settings-card">
            <button className="settings-row settings-row--link" type="button" onClick={onOpenTrash}>
              <span className="settings-row-label">휴지통</span>
              <ChevronRightIcon size={18} />
            </button>
          </section>
          <button className="settings-logout" type="button" onClick={onLogout}>
            로그아웃
          </button>
          <p className="settings-version">v{APP_VERSION}</p>
        </div>
      </div>
      {/* 홈 화면과 같은 하단바. 검색창·+·설정 버튼은 표준 비활성 디자인으로 흐려지고, < 버튼만 눌려서
          설정을 닫는다. */}
      <BottomSearchBar inactive canGoBack onBack={onBack} />
    </>
  );
}
