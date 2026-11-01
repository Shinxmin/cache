import { useEffect, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { BackIcon, FileIcon, FolderIcon, RestoreIcon, TrashIcon } from "../components/icons";
import PageMoreButton from "../components/PageMoreButton";
import Spinner from "../components/Spinner";
import useArmedConfirm from "../hooks/useArmedConfirm";

// 설정 → 휴지통에서 열리는 화면. 앱의 다른 화면과 같은 제목 레이아웃·리스트
// 스타일을 그대로 쓴다. 제목 우측의 삼점바(홈·파일 탭과 같은 위치·모양)는
// 휴지통 전체를 대상으로 한 전체 삭제·전체 복원을 맡고, 개별 항목의 삭제·복원은
// 각 행 오른쪽의 아이콘 두 개가 그대로 맡는다. 네 액션 모두 두 번 눌러야 실행된다
// — 첫 번째 누름은 그 버튼을 연한 빨간 배경으로 바꾸기만 하고(useArmedConfirm),
// 같은 버튼을 한 번 더 눌러야 실제로 삭제·복원된다. 빈 공간을 누르면 풀린다.
export default function TrashPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  const { isArmed, press } = useArmedConfirm();

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

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">휴지통</h1>
          <div className="page-header-actions">
            <PageMoreButton
              disabled={items.length === 0}
              actions={[
                {
                  key: "deleteAll",
                  label: "전체 삭제",
                  icon: <TrashIcon size={17} />,
                  armed: isArmed("deleteAll"),
                  onClick: press("deleteAll", () => removeForever(items.map((it) => it.id))),
                },
                {
                  key: "restoreAll",
                  label: "전체 복원",
                  icon: <RestoreIcon size={17} />,
                  armed: isArmed("restoreAll"),
                  onClick: press("restoreAll", () => restore(items.map((it) => it.id))),
                },
              ]}
            />
          </div>
        </div>
      </header>
      <div className="page page--flush">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && items.length > 0 && (
          <ul className="drive-list">
            {items.map((item) => (
              <li key={item.id} className="trash-row">
                <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
                <span className="drive-row-name">{item.name}</span>
                <span className="trash-row-actions">
                  <button
                    className={`studio-toolkit-icon-btn${isArmed(`restore:${item.id}`) ? " is-armed" : ""}`}
                    type="button"
                    aria-label="복원"
                    data-armed={isArmed(`restore:${item.id}`) ? "true" : undefined}
                    onClick={press(`restore:${item.id}`, () => restore([item.id]))}
                  >
                    <RestoreIcon size={18} />
                  </button>
                  <button
                    className={`studio-toolkit-icon-btn${isArmed(`delete:${item.id}`) ? " is-armed" : ""}`}
                    type="button"
                    aria-label="영구 삭제"
                    data-armed={isArmed(`delete:${item.id}`) ? "true" : undefined}
                    onClick={press(`delete:${item.id}`, () => removeForever([item.id]))}
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
