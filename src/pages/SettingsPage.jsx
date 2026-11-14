import ThemeSwitch from "../components/ThemeSwitch";
import { useEffect, useState } from "react";
import StoragePasswordSection from "../components/StoragePasswordSection";
import BottomSearchBar from "../components/BottomSearchBar";
import StorageSection from "../components/StorageSection";
import { APP_VERSION } from "../lib/version";
import { deleteStoragePassword, setStoragePassword } from "../lib/drive";

// 설정 화면. 예전엔 하단 내비바의 한 탭이었지만, 하단 내비바 자체가
// 없어진 뒤로는 파일 탭 헤더의 톱니바퀴 버튼으로 여는 화면이 됐다
// (App.jsx). 그래서 정적 헤더(제목)와 홈과 같은 하단바를 직접 그린다.
export default function SettingsPage({
  session,
  themeMode,
  onChangeThemeMode,
  onOpenTrash,
  onBack,
  hasStoragePw,
  onStoragePasswordChange,
  storageUsed,
  storageBillingBytes,
  quotaBytes,
  onChangeQuota,
  onLogout,
}) {
  // 통합 암호 설정·해제: 보안 섹션의 체크박스를 누르면 하단바에 "암호" 팝업이 올라온다(검색바가 암호 입력창).
  // 설정 전이면 새 암호를 입력해 설정하고, 설정된 뒤면 현재 암호를 입력해 맞을 때만 해제한다(틀리면 아무 반응 없음).
  const [pwMode, setPwMode] = useState(null); // null | "set" | "release"
  const [pwValue, setPwValue] = useState("");
  const closePw = () => {
    setPwMode(null);
    setPwValue("");
  };
  const openPw = () => {
    setPwValue("");
    setPwMode(hasStoragePw ? "release" : "set");
  };
  const confirmPw = async () => {
    if (!pwValue || !pwMode) return;
    try {
      if (pwMode === "set") {
        await setStoragePassword(session.token, pwValue, null);
        onStoragePasswordChange?.(true);
      } else {
        await deleteStoragePassword(session.token, pwValue);
        onStoragePasswordChange?.(false);
      }
      closePw();
    } catch {
      /* 틀린 암호 등: 아무 반응 없음 */
    }
  };
  // 다른 브라우저 탭에 다녀오면 열려 있던 암호 팝업을 닫고 처음 상태로 되돌린다.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) closePw();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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
                <h2 className="page-brand-title">테마</h2>
              </div>
              <ThemeSwitch mode={themeMode} onChange={onChangeThemeMode} />
            </div>
          </section>
          <StorageSection
            storageUsed={storageUsed}
            storageBillingBytes={storageBillingBytes}
            quotaBytes={quotaBytes}
            onChangeQuota={onChangeQuota}
            onOpenTrash={onOpenTrash}
          />
          <section className="settings-card settings-card--security">
            <div className="settings-card-head">
              <div className="page-brand">
                <h2 className="page-brand-title">보안</h2>
              </div>
            </div>
            <StoragePasswordSection hasPw={hasStoragePw} onToggle={openPw} />
          </section>
          {/* 정보 섹션: 제목 밑에 현재 버전과 로그아웃. */}
          <section className="page-brand-box">
            <div className="page-brand">
              <h2 className="page-brand-title">정보</h2>
            </div>
            <div className="settings-info-row">
              <dl className="storage-stats storage-stats--row">
                <div className="storage-stat">
                  <dt>버전</dt>
                  <dd>v{APP_VERSION}</dd>
                </div>
              </dl>
              <button className="settings-logout" type="button" onClick={onLogout}>
                로그아웃
              </button>
            </div>
          </section>
        </div>
      </div>
      {/* 홈 화면과 같은 하단바. 검색창·+·설정 버튼은 표준 비활성 디자인으로 흐려지고, < 버튼만 눌려서
          설정을 닫는다. */}
      <BottomSearchBar
        inactive
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        unlockOpen={pwMode !== null}
        unlockPw={pwValue}
        onChangeUnlockPw={setPwValue}
        onConfirmUnlock={confirmPw}
        onCancelUnlock={closePw}
      />
    </>
  );
}
