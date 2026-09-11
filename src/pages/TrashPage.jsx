import { useEffect, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { BackIcon, FileIcon, FolderIcon, RestoreIcon, TrashIcon } from "../components/icons";

// 설정 → 휴지통에서 열리는 화면. 앱의 다른 화면과 같은 제목 레이아웃·리스트
// 스타일을 그대로 쓴다. 항목마다 복원/영구 삭제 버튼이 있다.
export default function TrashPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);

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

  const restore = async (item) => {
    try {
      await restoreFiles(session.token, [item.id]);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("복원하지 못했습니다");
    }
  };

  const removeForever = async (item) => {
    if (!window.confirm(`"${item.name}"을(를) 영구적으로 삭제할까요?\n되돌릴 수 없습니다.`)) return;
    try {
      await deleteFilesPermanently(session.token, [item.id]);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("삭제하지 못했습니다");
    }
  };

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">휴지통</h1>
        </div>
      </header>
      <div className="page page--flush">
        {state === "loading" && <p className="drive-note">불러오는 중…</p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && items.length === 0 && <p className="drive-note">휴지통이 비어 있습니다</p>}
        {state === "ready" && items.length > 0 && (
          <ul className="drive-list">
            {items.map((item) => (
              <li key={item.id} className="trash-row">
                <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
                <span className="drive-row-name">{item.name}</span>
                <span className="trash-row-actions">
                  <button className="studio-toolkit-icon-btn" type="button" aria-label="복원" onClick={() => restore(item)}>
                    <RestoreIcon size={18} />
                  </button>
                  <button
                    className="studio-toolkit-icon-btn"
                    type="button"
                    aria-label="영구 삭제"
                    onClick={() => removeForever(item)}
                  >
                    <TrashIcon size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
