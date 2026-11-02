import { useEffect, useState } from "react";
import ThemeSwitch from "../components/ThemeSwitch";
import StoragePasswordSection from "../components/StoragePasswordSection";
import BottomSearchBar from "../components/BottomSearchBar";
import { ChevronRightIcon } from "../components/icons";
import { APP_VERSION } from "../lib/version";
import { getStorageUsed } from "../lib/drive";
import { formatBytes, STORAGE_QUOTA_BYTES } from "../lib/format";

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
  onLogout,
}) {
  // 이 화면이 직접 계정 전체 사용량을
  // 불러온다(App.jsx를 거치지 않는다).
  const [storageUsed, setStorageUsed] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getStorageUsed(session.token)
      .then((bytes) => {
        if (!cancelled) setStorageUsed(bytes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session.token]);
  const storagePercent = Math.min(100, (storageUsed / STORAGE_QUOTA_BYTES) * 100);
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
            <div className="settings-row settings-row--toggle">
              <span className="settings-row-label">테마</span>
              <ThemeSwitch mode={themeMode} onChange={onChangeThemeMode} />
            </div>
          </section>
          <section className="settings-card">
            <div className="settings-row settings-storage-row">
              <span className="settings-row-label">용량</span>
              <div className="settings-storage-right">
                <div className="settings-storage-bar">
                  <div className="settings-storage-fill" style={{ width: `${storagePercent}%` }} />
                </div>
                <span className="settings-storage-text">
                  {formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA_BYTES)}
                </span>
              </div>
            </div>
          </section>
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
