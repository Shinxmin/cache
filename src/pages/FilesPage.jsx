import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import ItemRow from "../components/ItemRow";
import ItemSheet from "../components/ItemSheet";
import Sheet from "../components/Sheet";
import { useApp } from "../AppContext";
import { useToast } from "../components/Toast";
import { createFolder, listChildren, pathTo, searchItems, thumbnailUrls } from "../lib/items";

const FOLDER_KEY = "cache.folder";

export default function FilesPage() {
  const { refreshKey, refresh, startUpload } = useApp();
  const toast = useToast();

  const [folderId, setFolderId] = useState(() => sessionStorage.getItem(FOLDER_KEY) || null);
  const [path, setPath] = useState([]); // [{id, name}] 루트 제외
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  // 현재 폴더 내용
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([listChildren(folderId), folderId ? pathTo(folderId) : Promise.resolve([])])
      .then(async ([list, p]) => {
        if (!alive) return;
        if (folderId && p.length === 0) {
          // 폴더가 삭제된 경우 루트로
          setFolderId(null);
          return;
        }
        setItems(list);
        setPath(p);
        setLoading(false);
        const t = await thumbnailUrls(list).catch(() => ({}));
        if (alive) setThumbs((prev) => ({ ...prev, ...t }));
      })
      .catch((e) => {
        if (!alive) return;
        setLoading(false);
        toast(e.message, { error: true });
      });
    return () => {
      alive = false;
    };
  }, [folderId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      if (folderId) sessionStorage.setItem(FOLDER_KEY, folderId);
      else sessionStorage.removeItem(FOLDER_KEY);
    } catch (_e) {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, [folderId]);

  // 검색(전체 범위, 디바운스)
  useEffect(() => {
    const q = query.trim();
    if (!q) return setResults(null);
    let alive = true;
    const t = setTimeout(() => {
      searchItems(q)
        .then(async (r) => {
          if (!alive) return;
          setResults(r);
          const th = await thumbnailUrls(r).catch(() => ({}));
          if (alive) setThumbs((prev) => ({ ...prev, ...th }));
        })
        .catch((e) => alive && toast(e.message, { error: true }));
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (item) => {
    if (item.kind === "folder") {
      setQuery("");
      setFolderId(item.id);
    } else setSelected(item);
  };

  const submitFolder = async (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createFolder(folderId, name);
      setNewFolderOpen(false);
      setNewFolderName("");
      refresh();
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      setBusy(false);
    }
  };

  const visible = results ?? items;
  const currentName = useMemo(() => (path.length ? path[path.length - 1].name : "파일"), [path]);

  return (
    <div className="page tab-panel">
      <PageHeader
        title="파일"
        actions={
          <>
            <button className="btn btn-sm" onClick={() => setNewFolderOpen(true)}>
              새 폴더
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => fileInput.current?.click()}>
              업로드
            </button>
          </>
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = "";
          if (files?.length) startUpload(files, folderId);
        }}
      />

      <input
        className="field search"
        type="search"
        placeholder="검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {!results && (
        <nav className="crumbs" aria-label="경로">
          <button className={path.length ? "" : "current"} onClick={() => setFolderId(null)}>
            전체
          </button>
          {path.map((p, i) => (
            <span key={p.id} style={{ display: "contents" }}>
              <span className="sep">›</span>
              <button className={i === path.length - 1 ? "current" : ""} onClick={() => setFolderId(p.id)}>
                {p.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <section className="glass list">
        {loading && !results ? (
          <div className="empty">
            <div className="spinner" style={{ margin: "0 auto" }} />
          </div>
        ) : visible.length === 0 ? (
          <div className="empty">{results ? "검색 결과가 없습니다." : `${currentName === "파일" ? "이 위치" : currentName}에 항목이 없습니다.`}</div>
        ) : (
          visible.map((item) => <ItemRow key={item.id} item={item} thumb={thumbs[item.r2_key]} onOpen={open} onMore={setSelected} />)
        )}
      </section>

      <ItemSheet item={selected} onClose={() => setSelected(null)} onChanged={refresh} onOpenFolder={open} />

      <Sheet open={newFolderOpen} center onClose={() => !busy && setNewFolderOpen(false)} title="새 폴더">
        <form onSubmit={submitFolder}>
          <input className="field" placeholder="폴더 이름" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus maxLength={255} />
          <div className="sheet-row">
            <button type="button" className="btn" onClick={() => setNewFolderOpen(false)} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || !newFolderName.trim()}>
              만들기
            </button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
