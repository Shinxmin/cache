import { useEffect, useMemo, useState } from "react";
import { deleteTransferHistory, listTransferHistory } from "../lib/drive";
import { CheckIcon, FileIcon, TrashIcon } from "../components/icons";
import BottomSearchBar from "../components/BottomSearchBar";
import Spinner from "../components/Spinner";
import useLongPress from "../hooks/useLongPress";
import { formatBytes } from "../lib/format";

// 행 하나(휴지통 리스트와 같은 모양): 왼쪽부터 파일 아이콘, 제목, 정보 한 줄 — "1.jpg  (4.5MB 다운로드 성공)".
// 글자는 검정(다크는 흰색)이고 실패일 때만 "실패"가 연한 빨강이다. 꾹 누르면 선택이 켜지고, 선택이 있는 동안은
// 탭으로 선택·해제한다.
function TransferRow({ item, selected, selectionMode, onToggle }) {
  const press = useLongPress(
    () => {
      if (selectionMode) onToggle(item.id);
    },
    () => onToggle(item.id)
  );
  const label = item.kind === "up" ? "업로드" : "다운로드";
  return (
    <button className={`drive-row${selected ? " selected" : ""}`} type="button" {...press}>
      <span className="drive-row-icon">
        <FileIcon size={20} />
      </span>
      <span className="drive-row-text">
        <span className="drive-row-title-line">
          <span className="drive-row-name">{item.name}</span>
          <span className="history-sub">
            ({item.size != null ? `${formatBytes(item.size)} ` : ""}
            {label} {item.ok ? "성공" : <span className="history-fail">실패</span>})
          </span>
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

// 헤더 우상단의 업로드·다운로드 진행 버튼을 누르면 열리는 화면. 지금까지의 모든 업로드·다운로드 기록(실패 포함)이
// 서버에 영구히 쌓여 있어 어느 기기에서든 같은 목록을 본다. 하단바는 휴지통과 같은 로직이다(복원은 없음): 검색은
// 기록 안에서만, <는 활성(선택 중에는 전체 선택/해제 체크), 설정·+는 비활성, 꾹 눌러 고르면 삼점 메뉴(삭제).
export default function TransfersPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listTransferHistory(session.token)
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

  const liveSelected = useMemo(() => {
    const ids = new Set(visible.map((it) => it.id));
    return [...selectedIds].filter((id) => ids.has(id));
  }, [visible, selectedIds]);

  useEffect(() => {
    if (confirmOpen && liveSelected.length === 0) setConfirmOpen(false);
  }, [confirmOpen, liveSelected.length]);

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = visible.length > 0 && visible.every((it) => selectedIds.has(it.id));
  const toggleAll = (checked) => setSelectedIds(checked ? new Set(visible.map((it) => it.id)) : new Set());

  const run = async () => {
    if (!liveSelected.length) return;
    try {
      await deleteTransferHistory(session.token, liveSelected);
      setSelectedIds(new Set());
      setConfirmOpen(false);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("삭제하지 못했습니다");
    }
  };

  const actions = [{ key: "delete", label: "삭제", icon: <TrashIcon size={17} />, run: () => setConfirmOpen(true) }];

  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <h1 className="page-title">기록</h1>
        </div>
      </header>
      <div className="page page--flush page--has-dock">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && visible.length > 0 && (
          <ul className="drive-list">
            {visible.map((item) => (
              <li key={item.id}>
                <TransferRow item={item} selected={selectedIds.has(item.id)} selectionMode={liveSelected.length > 0} onToggle={toggle} />
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
        checkLeft
        allSelected={allSelected}
        onToggleSelectAll={toggleAll}
        hasSelection={liveSelected.length > 0}
        selectionActions={actions}
        confirmOpen={confirmOpen}
        confirmTitle="삭제"
        onConfirmDelete={run}
        onCancelDelete={() => setConfirmOpen(false)}
      />
    </>
  );
}
