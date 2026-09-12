import { useEffect, useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { listFiles } from "../lib/drive";
import { BackIcon, CloseIcon, FileIcon, FolderIcon } from "./icons";

// 스튜디오 툴킷의 이동(→) 아이콘으로 여는 이동 모달. 드라이브 전체를 리스트로
// 보여주고, 폴더를 눌러 안으로 들어간 뒤 확인을 누르면 그 폴더로 옮긴다.
// 배경을 탭하거나 제목 줄 우측의 작은 x를 누르면 취소된다.
//
// 옮기는 중인 폴더 자신은 목적지가 될 수 없다(자기 안으로 들어가면 그 가지가
// 트리에서 떨어져 나간다). 서버도 막지만 목록에서 미리 눌리지 않게 해 둔다.
export default function MoveModal({ session, items, onClose, onSubmit }) {
  useBodyScrollLock();
  const [path, setPath] = useState([]); // [{ id, name }] — 빈 배열이면 최상위
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [busy, setBusy] = useState(false);

  const parentId = path.length ? path[path.length - 1].id : null;
  const movingIds = new Set(items.map((it) => it.id));

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listFiles(session.token, parentId)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, parentId]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(parentId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">이동</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {/* 지금 보고 있는 위치. 최상위가 아니면 왼쪽 화살표로 한 단계 나간다. */}
        <div className="move-path">
          {path.length > 0 && (
            <button
              className="move-path-back"
              type="button"
              aria-label="상위 폴더로"
              onClick={() => setPath((p) => p.slice(0, -1))}
            >
              <BackIcon size={18} />
            </button>
          )}
          <span className="move-path-name">{path.length ? path[path.length - 1].name : "드라이브"}</span>
        </div>

        <ul className="move-list">
          {state === "loading" && <li className="move-note">불러오는 중…</li>}
          {state === "error" && <li className="move-note">불러오지 못했습니다</li>}
          {state === "ready" && !rows.length && <li className="move-note">비어 있습니다</li>}
          {state === "ready" &&
            rows.map((row) => (
              <li key={row.id}>
                <button
                  className="move-row"
                  type="button"
                  disabled={!row.is_folder || movingIds.has(row.id)}
                  onClick={() => setPath((p) => [...p, { id: row.id, name: row.name }])}
                >
                  <span className="move-row-icon">
                    {row.is_folder ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                  </span>
                  <span className="move-row-name">{row.name}</span>
                </button>
              </li>
            ))}
        </ul>

        <button className="auth-submit" type="button" disabled={busy} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
