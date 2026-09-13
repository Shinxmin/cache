import { useEffect, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { BackIcon, FileIcon, FolderIcon, RestoreIcon, TrashIcon } from "../components/icons";
import TrashMoreButton from "../components/TrashMoreButton";
import ConfirmModal from "../components/ConfirmModal";
import Spinner from "../components/Spinner";

// 확인 모달에 띄울 제목·문구. 전체/개별, 삭제/복원 네 가지 액션이지만
// 모달 자체는 삭제 둘, 복원 둘을 각각 하나로 통일한다 — 어떤 파일인지,
// 몇 개인지는 따지지 않고 문구가 항상 같다.
function describeAction(action) {
  const isDelete = action.kind === "deleteAll" || action.kind === "delete";
  return isDelete ? { title: "삭제", message: "데이터를 삭제하시겠습니까?" } : { title: "복구", message: "데이터를 복구하시겠습니까?" };
}

// 설정 → 휴지통에서 열리는 화면. 앱의 다른 화면과 같은 제목 레이아웃·리스트
// 스타일을 그대로 쓴다. 제목 우측의 삼점바(홈·파일 탭과 같은 위치·모양)는
// 휴지통 전체를 대상으로 한 전체 삭제·전체 복원을 맡고, 개별 항목의 삭제·복원은
// 각 행 오른쪽의 아이콘 두 개가 그대로 맡는다. 네 액션 모두 바로 실행되지
// 않고 ConfirmModal로 한 번 확인을 거친다.
export default function TrashPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  // null이면 확인 모달이 닫혀 있는 상태. 열려 있으면 { kind, ids, name? }.
  const [pendingAction, setPendingAction] = useState(null);

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

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "deleteAll" || pendingAction.kind === "delete") {
      await removeForever(pendingAction.ids);
    } else {
      await restore(pendingAction.ids);
    }
    setPendingAction(null);
  };

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">휴지통</h1>
          <div className="page-header-actions">
            <TrashMoreButton
              disabled={items.length === 0}
              onDeleteAll={() => setPendingAction({ kind: "deleteAll", ids: items.map((it) => it.id) })}
              onRestoreAll={() => setPendingAction({ kind: "restoreAll", ids: items.map((it) => it.id) })}
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
                    onClick={() => setPendingAction({ kind: "restore", ids: [item.id], name: item.name })}
                  >
                    <RestoreIcon size={18} />
                  </button>
                  <button
                    className="studio-toolkit-icon-btn"
                    type="button"
                    aria-label="영구 삭제"
                    onClick={() => setPendingAction({ kind: "delete", ids: [item.id], name: item.name })}
                  >
                    <TrashIcon size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pendingAction && (
        <ConfirmModal
          {...describeAction(pendingAction)}
          onClose={() => setPendingAction(null)}
          onSubmit={confirmPendingAction}
        />
      )}
    </>
  );
}
