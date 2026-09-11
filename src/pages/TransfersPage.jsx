import { BackIcon, DownloadIcon, UploadIcon } from "../components/icons";

const STATUS_LABEL = { active: "진행 중", done: "완료", error: "실패" };

// 헤더의 업로드/다운로드 버튼을 누르면 열리는 전송 현황 화면. 앱의 다른 화면과
// 같은 제목 레이아웃과 유리 재질을 쓴다.
export default function TransfersPage({ transfers, onBack }) {
  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">전송 현황</h1>
        </div>
      </header>
      <div className="page page--flush">
        {transfers.length === 0 ? (
          <p className="drive-note">진행 중인 전송이 없습니다</p>
        ) : (
          <ul className="transfer-list">
            {transfers.map((t) => (
              <li key={t.id} className={`transfer-item transfer-item--${t.status}`}>
                <span className="transfer-icon">
                  {t.direction === "up" ? <UploadIcon size={17} /> : <DownloadIcon size={17} />}
                </span>
                <span className="transfer-body">
                  <span className="transfer-name">{t.name}</span>
                  <span className="transfer-track">
                    <span className="transfer-fill" style={{ width: `${Math.round(t.progress * 100)}%` }} />
                  </span>
                </span>
                <span className="transfer-status">
                  {t.status === "active" ? `${Math.round(t.progress * 100)}%` : STATUS_LABEL[t.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
