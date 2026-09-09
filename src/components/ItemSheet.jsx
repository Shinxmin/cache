import { useEffect, useState } from "react";
import Sheet from "./Sheet";
import { useToast } from "./Toast";
import { formatBytes, formatDate } from "../lib/format";
import { deleteItem, downloadUrl, isImage, renameItem, viewUrl } from "../lib/items";

// 항목(파일/폴더) 상세 + 동작 시트: 미리보기, 열기/다운로드, 이름 변경, 삭제.
// 열기/다운로드 URL은 시트가 열릴 때 미리 발급해 두어 버튼이 일반 링크(<a>)로 동작하게 한다
// (iOS Safari는 비동기 작업 뒤의 window.open을 막는다).
export default function ItemSheet({ item, onClose, onChanged, onOpenFolder }) {
  const toast = useToast();
  const [urls, setUrls] = useState({ view: "", download: "" });
  const [view, setView] = useState("actions"); // actions | rename | delete
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setView("actions");
    setName(item?.name ?? "");
    setUrls({ view: "", download: "" });
    if (!item || item.kind !== "file" || !item.r2_key) return;
    let alive = true;
    Promise.all([viewUrl(item), downloadUrl(item)])
      .then(([v, d]) => alive && setUrls({ view: v, download: d }))
      .catch((e) => alive && toast(e.message, { error: true }));
    return () => {
      alive = false;
    };
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;
  const file = item.kind === "file";

  const doRename = async () => {
    const next = name.trim();
    if (!next || next === item.name) return setView("actions");
    setBusy(true);
    try {
      await renameItem(item.id, next);
      onChanged?.("rename");
      onClose();
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteItem(item);
      toast(`${item.name} 삭제됨`);
      onChanged?.("delete");
      onClose();
    } catch (e) {
      toast(e.message, { error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!item} onClose={busy ? undefined : onClose} title={item.name} subtitle={file ? `${formatBytes(item.size)} · ${formatDate(item.updated_at)}` : `폴더 · ${formatDate(item.updated_at)}`}>
      {view === "actions" && (
        <>
          {file && isImage(item) && urls.view && <img className="preview-img" src={urls.view} alt={item.name} />}
          <div className="sheet-actions">
            {file ? (
              <>
                <a className={`btn${urls.view ? "" : " disabled"}`} href={urls.view || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!urls.view}>
                  {urls.view ? "열기" : "링크 준비 중…"}
                </a>
                <a className={`btn${urls.download ? "" : " disabled"}`} href={urls.download || undefined} aria-disabled={!urls.download}>
                  다운로드
                </a>
              </>
            ) : (
              onOpenFolder && (
                <button className="btn" onClick={() => (onClose(), onOpenFolder(item))}>
                  열기
                </button>
              )
            )}
            <button className="btn" onClick={() => setView("rename")}>
              이름 변경
            </button>
            <button className="btn btn-danger" onClick={() => setView("delete")}>
              삭제
            </button>
          </div>
        </>
      )}

      {view === "rename" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            doRename();
          }}
        >
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={255} />
          <div className="sheet-row">
            <button type="button" className="btn" onClick={() => setView("actions")} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
              저장
            </button>
          </div>
        </form>
      )}

      {view === "delete" && (
        <>
          <p className="sheet-sub" style={{ marginTop: 6 }}>
            {file ? "이 파일을 영구히 삭제합니다." : "폴더와 그 안의 모든 항목을 영구히 삭제합니다."} 되돌릴 수 없습니다.
          </p>
          <div className="sheet-row">
            <button className="btn" onClick={() => setView("actions")} disabled={busy}>
              취소
            </button>
            <button className="btn btn-primary" style={{ background: "var(--danger)", color: "#fff" }} onClick={doDelete} disabled={busy}>
              {busy ? "삭제 중…" : "삭제"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
