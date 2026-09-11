import { useEffect, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { BackIcon, FileIcon, FolderIcon } from "../components/icons";
import TrashRowMenu from "../components/TrashRowMenu";

// 설정 → 휴지통에서 열리는 화면. 앱의 다른 화면과 같은 제목 레이아웃·리스트
// 스타일을 그대로 쓴다. 항목마다 삼점바(TrashRowMenu, 홈·파일 탭 헤더의
// 삼점바와 같은 모양·애니메이션)가 있고, 열면 삭제·복원 아이콘이 나온다.
// 복원도 영구 삭제도 확인 없이 누르는 즉시 실행된다.
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
                  <TrashRowMenu onDelete={() => removeForever(item)} onRestore={() => restore(item)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
