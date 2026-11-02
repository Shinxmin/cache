import { useEffect, useMemo, useState } from "react";
import { deleteFilesPermanently, listTrash, restoreFiles } from "../lib/drive";
import { CheckIcon, FileIcon, FolderIcon, RestoreIcon, TrashIcon } from "../components/icons";
import BottomSearchBar from "../components/BottomSearchBar";
import Spinner from "../components/Spinner";
import useLongPress from "../hooks/useLongPress";

// 휴지통 행 하나: 꾹 누르면 선택이 켜지고, 선택이 있는 동안은 탭으로 선택·해제한다(선택이 없을 땐 탭이 아무
// 일도 하지 않는다).
function TrashRow({ item, selected, selectionMode, onToggle }) {
  const press = useLongPress(
    () => {
      if (selectionMode) onToggle(item.id);
    },
    () => onToggle(item.id)
  );
  return (
    <button className={`drive-row${selected ? " selected" : ""}`} type="button" {...press}>
      <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
      <span className="drive-row-text">
        <span className="drive-row-title-line">
          <span className="drive-row-name">{item.name}</span>
        </span>
      </span>
      {selected && (
        <span className="drive-row-check">
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

// 설정 → 휴지통에서 열리는 화면. 홈과 같은 하단바가 내려온다: 검색은 휴지통에 있는 데이터에서만 하고, <는
// 활성, 설정은 비활성이다. 항목을 꾹 눌러 고르면 비활성이던 + 버튼 자리가 삼점 메뉴(삭제·복원)로 바뀌고,
// 고른 항목에만 적용된다. 삭제·복원은 하단 팝업(제목만, 본문 없음)에서 확인한다.
export default function TrashPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [action, setAction] = useState(null); // null | "delete" | "restore"

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((it) => it.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  // 목록에서 사라진 항목(검색으로 가려지거나 처리돼 없어진 것)은 선택에서도 뺀다.
  const liveSelected = useMemo(() => {
    const ids = new Set(visible.map((it) => it.id));
    return [...selectedIds].filter((id) => ids.has(id));
  }, [visible, selectedIds]);

  useEffect(() => {
    if (action && liveSelected.length === 0) setAction(null);
  }, [action, liveSelected.length]);

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    const ids = liveSelected;
    if (!ids.length || !action) return;
    try {
      if (action === "restore") await restoreFiles(session.token, ids);
      else await deleteFilesPermanently(session.token, ids);
      setSelectedIds(new Set());
      setAction(null);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert(action === "restore" ? "복원하지 못했습니다" : "삭제하지 못했습니다");
    }
  };

  const actions = [
    { key: "delete", label: "삭제", icon: <TrashIcon size={17} />, run: () => setAction("delete") },
    { key: "restore", label: "복원", icon: <RestoreIcon size={17} />, run: () => setAction("restore") },
  ];

  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <h1 className="page-title">휴지통</h1>
        </div>
      </header>
      <div className="page page--flush page--has-dock">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && visible.length > 0 && (
          <ul className="drive-list">
            {visible.map((item) => (
              <li key={item.id}>
                <TrashRow item={item} selected={selectedIds.has(item.id)} selectionMode={liveSelected.length > 0} onToggle={toggle} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomSearchBar
        searchQuery={query}
        onSearch={setQuery}
        canGoBack
        onBack={onBack}
        settingsDisabled
        plusDisabled
        swapSideButtons={false}
        hasSelection={liveSelected.length > 0}
        selectionActions={actions}
        confirmOpen={Boolean(action)}
        confirmTitle={action === "restore" ? "복원" : "삭제"}
        onConfirmDelete={run}
        onCancelDelete={() => setAction(null)}
      />
    </>
  );
}
