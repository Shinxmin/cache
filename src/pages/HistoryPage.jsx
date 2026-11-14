import { useMemo, useState } from "react";
import { clearHistory, loadHistory, removeHistory } from "../lib/history";
import { CheckIcon, DownloadIcon, TrashIcon, UploadIcon } from "../components/icons";
import BottomSearchBar from "../components/BottomSearchBar";
import useLongPress from "../hooks/useLongPress";

// 기록 행 하나: 파일 이름, 그 밑에 작은 글씨로 "다운로드 성공" / "업로드 실패". 글자는 검정(다크에서는 흰색)이고
// 실패일 때만 "실패"가 연한 빨강이다. 꾹 누르면 선택이 켜지고, 선택이 있는 동안은 탭으로 선택·해제한다.
function HistoryRow({ item, selected, selectionMode, onToggle }) {
  const press = useLongPress(
    () => {
      if (selectionMode) onToggle(item.id);
    },
    () => onToggle(item.id)
  );
  const label = item.kind === "up" ? "업로드" : "다운로드";
  return (
    <button className={`drive-row${selected ? " selected" : ""}`} type="button" {...press}>
      <span className="drive-row-icon">{item.kind === "up" ? <UploadIcon size={20} /> : <DownloadIcon size={20} />}</span>
      <span className="drive-row-text">
        <span className="drive-row-title-line">
          <span className="drive-row-name">{item.name}</span>
        </span>
        <span className="history-sub">
          {label} {item.ok ? "성공" : <span className="history-fail">실패</span>}
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

// 설정 → 스토리지 → 기록에서 열리는 화면. 휴지통과 같은 웹디자인·하단바 로직이다: 검색은 기록 안에서만,
// <는 활성(선택 중에는 전체 선택/해제 체크), 설정·+는 비활성. 꾹 눌러 고르면 삼점 메뉴(삭제·전체 삭제)가 뜬다.
export default function HistoryPage({ onBack }) {
  const [items, setItems] = useState(() => loadHistory());
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [action, setAction] = useState(null); // null | "delete" | "clear"

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((it) => it.name.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const liveSelected = useMemo(() => {
    const ids = new Set(visible.map((it) => it.id));
    return [...selectedIds].filter((id) => ids.has(id));
  }, [visible, selectedIds]);

  // 선택이 사라지면(검색으로 가려짐 등) 삭제 팝업도 닫는다. 전체 삭제는 선택과 무관하다.
  if (action === "delete" && liveSelected.length === 0) setAction(null);

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = visible.length > 0 && visible.every((it) => selectedIds.has(it.id));
  const toggleAll = (checked) => setSelectedIds(checked ? new Set(visible.map((it) => it.id)) : new Set());

  const run = () => {
    if (action === "clear") clearHistory();
    else if (action === "delete") removeHistory(liveSelected);
    else return;
    setItems(loadHistory());
    setSelectedIds(new Set());
    setAction(null);
  };

  const actions = [
    { key: "delete", label: "삭제", icon: <TrashIcon size={17} />, run: () => setAction("delete") },
    { key: "clear", label: "전체 삭제", icon: <TrashIcon size={17} />, run: () => setAction("clear") },
  ];

  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <h1 className="page-title">기록</h1>
        </div>
      </header>
      <div className="page page--flush page--has-dock">
        {visible.length > 0 && (
          <ul className="drive-list">
            {visible.map((item) => (
              <li key={item.id}>
                <HistoryRow item={item} selected={selectedIds.has(item.id)} selectionMode={liveSelected.length > 0} onToggle={toggle} />
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
        confirmOpen={Boolean(action)}
        confirmTitle={action === "clear" ? "전체 삭제" : "삭제"}
        onConfirmDelete={run}
        onCancelDelete={() => setAction(null)}
      />
    </>
  );
}
