import { useEffect, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { BackIcon, FileIcon, FolderIcon, RestoreIcon, TrashIcon } from "../components/icons";
import TrashMoreButton from "../components/TrashMoreButton";
import ConfirmModal from "../components/ConfirmModal";
import Spinner from "../components/Spinner";

// 설정 → 휴지통에서 열리는 화면. 앱의 다른 화면과 같은 제목 레이아웃·리스트
// 스타일을 그대로 쓴다. 제목 우측의 삼점바(홈·파일 탭과 같은 위치·모양)는
// 휴지통 전체를 대상으로 한 전체 삭제·전체 복원을 맡고, 개별 항목의 삭제·복원은
// 각 행 오른쪽의 아이콘 두 개가 그대로 맡는다. 전체 삭제·전체 복원·개별 삭제는
// 확인 없이 바로 실행되고, 개별 복원만 ConfirmModal로 한 번 확인을 거친다.
export default function TrashPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  // null이면 복원 확인 모달이 닫혀 있는 상태. 열려 있으면 복원할 항목의 id 배열.
  const [pendingRestoreIds, setPendingRestoreIds] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listTrash(session.token)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, refreshKey]);

  const restore = async (ids) => {
    try {
      await restoreFiles(session.token, ids);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("복원하지 못했습니다");
    }
  };

  const removeForever = async (ids) => {
    try {
      await deleteFilesPermanently(session.token, ids);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("삭제하지 못했습니다");
    }
  };

  const confirmPendingRestore = async () => {
    if (!pendingRestoreIds) return;
    await restore(pendingRestoreIds);
    setPendingRestoreIds(null);
  };

  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">휴지통</h1>
          <div className="page-header-actions">
            <TrashMoreButton
              disabled={items.length === 0}
              onDeleteAll={() => removeForever(items.map((it) => it.id))}
              onRestoreAll={() => restore(items.map((it) => it.id))}
            />
          </div>
        </div>
      </header>
      <div className="page page--flush">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && items.length === 0 && <p className="drive-note">휴지통이 비어 있습니다</p>}
        {state === "ready" && items.length > 0 && (
          <ul className="drive-list">
            {items.map((item) => (
              <li key={item.id} className="trash-row">
                <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
                <span className="drive-row-name">{item.name}</span>
                <span className="trash-row-actions">
                  <button
                    className="studio-toolkit-icon-btn"
                    type="button"
                    aria-label="복원"
                    onClick={() => setPendingRestoreIds([item.id])}
                  >
                    <RestoreIcon size={18} />
                  </button>
                  <button
                    className="studio-toolkit-icon-btn"
                    type="button"
                    aria-label="영구 삭제"
                    onClick={() => removeForever([item.id])}
                  >
                    <TrashIcon size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pendingRestoreIds && (
        <ConfirmModal
          title="복구"
          message="데이터를 복구하시겠습니까?"
          onClose={() => setPendingRestoreIds(null)}
          onSubmit={confirmPendingRestore}
        />
      )}
    </>
  );
}
