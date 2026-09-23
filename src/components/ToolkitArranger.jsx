import { useEffect, useRef, useState } from "react";
import { TrashIcon } from "./icons";
import { TOOL_META, toolLabel } from "./toolkitIcons";
import { isAddonId } from "../lib/addons";

const HOLD_MS = 250;
const MOVE_SLOP = 8;

// 설정 → "스튜디오 툴킷 사용자 정렬"을 펼치면 나오는 편집용 툴바. 실제
// 툴킷과 똑같은 모양(.studio-toolkit)이지만 전체 선택 체크박스·글자 없이
// 아이콘들만 있고, 그 아이콘들을 꾹 눌러(250ms) 끌어 순서를 바꿀 수 있다.
// 실제 툴바가 기본 도구(1열)와 애드온(2열)을 항상 따로 그리는 것과 똑같이
// 이 편집용 미리보기도 두 줄로 나눠 그린다 — 그래서 드래그도 같은 줄
// 안에서만 순서를 바꾼다(기본 도구를 애드온 줄로, 혹은 그 반대로 끌어도
// 실제 화면에는 어차피 반영되지 않으므로, 애초에 다른 줄 위로는 자리를
// 내주지 않는다). 끄는 동안 같은 줄의 다른 아이콘 위를 지나가면 그 자리로
// 실시간으로 옮겨지고, 손을 떼면 부모에 새 순서를 알린다(서버 저장·기록은
// 부모 몫). 툴바 밑에는 약간의 여백을 두고 휴지통 아이콘이 있는 보이지
// 않는 드롭 존이 있어, 애드온 아이콘을 거기로 끌어다 놓으면 그 애드온이
// 삭제된다(기본 도구는 휴지통에 놓아도 원래 자리로 돌아간다).
export default function ToolkitArranger({ layout, viewMode, onChange }) {
  const [order, setOrder] = useState(layout);
  const [drag, setDrag] = useState(null); // { id, overTrash }
  const pressRef = useRef(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const ctx = { viewMode };

  // 부모가 준 layout이 바뀌면(서버 반영 후) 로컬 순서도 맞춘다.
  const [syncedLayout, setSyncedLayout] = useState(layout);
  if (syncedLayout !== layout) {
    setSyncedLayout(layout);
    setOrder(layout);
  }

  const hitTest = (x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (el.closest("[data-trash-zone]")) return { trash: true };
    const btn = el.closest("[data-tool-id]");
    return btn ? { id: btn.dataset.toolId } : null;
  };

  // 끄는 동안의 move/up은 버튼이 아니라 window에서 받는다. 순서를 바꾸면
  // React가 버튼 DOM 노드를 옮기는데, 그러면 그 노드에 걸어 둔 포인터
  // 캡처가 풀려 pointerup을 놓치기 때문이다(window 리스너는 노드 이동과
  // 무관하게 끝까지 받는다).
  const stopListening = () => {
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    window.removeEventListener("pointercancel", onWindowUp);
  };

  function onWindowMove(e) {
    const p = pressRef.current;
    if (!p) return;
    if (!p.active) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_SLOP) {
        p.cancelled = true;
        clearTimeout(p.timer);
        pressRef.current = null;
        stopListening();
      }
      return;
    }
    e.preventDefault();
    const hit = hitTest(e.clientX, e.clientY);
    // 기본 도구는 휴지통에 놓아도 삭제되지 않으므로, 휴지통 위에 있어도
    // "이 위에 놓으면 지워진다"는 빨간 강조를 아예 보여주지 않는다 —
    // 애드온일 때만 정말로 놓을 수 있는 자리로 반응한다.
    const overTrash = Boolean(hit?.trash) && isAddonId(p.id);
    p.overTrash = overTrash;
    setDrag((d) => (d && d.overTrash !== overTrash ? { ...d, overTrash } : d));
    // 다른 줄(기본 도구 ↔ 애드온)의 아이콘 위로는 자리를 내주지 않는다 —
    // 실제 툴바는 어차피 두 그룹을 항상 따로 그리므로 그 자리바꿈은 아무
    // 의미가 없다.
    if (!hit?.trash && hit?.id && hit.id !== p.id && isAddonId(hit.id) === isAddonId(p.id)) {
      const cur = orderRef.current;
      const from = cur.indexOf(p.id);
      const to = cur.indexOf(hit.id);
      if (from >= 0 && to >= 0 && from !== to) {
        const next = [...cur];
        next.splice(from, 1);
        next.splice(to, 0, p.id);
        setOrder(next);
      }
    }
  }

  function onWindowUp() {
    const p = pressRef.current;
    pressRef.current = null;
    stopListening();
    if (!p) return;
    clearTimeout(p.timer);
    if (!p.active) return;
    setDrag(null);
    const layoutNow = layoutRef.current;
    if (p.overTrash && isAddonId(p.id)) {
      const next = orderRef.current.filter((id) => id !== p.id);
      setOrder(next);
      onChangeRef.current(next, "remove_addon", p.id);
      return;
    }
    const cur = orderRef.current;
    if (cur.length !== layoutNow.length || cur.some((id, i) => id !== layoutNow[i])) {
      onChangeRef.current(cur, "reorder", null);
    }
  }

  const onPointerDown = (id) => (e) => {
    if (pressRef.current) return;
    pressRef.current = { id, x: e.clientX, y: e.clientY, active: false, cancelled: false, overTrash: false };
    pressRef.current.timer = setTimeout(() => {
      const p = pressRef.current;
      if (p && !p.cancelled) {
        p.active = true;
        setDrag({ id, overTrash: false });
      }
    }, HOLD_MS);
    window.addEventListener("pointermove", onWindowMove, { passive: false });
    window.addEventListener("pointerup", onWindowUp);
    window.addEventListener("pointercancel", onWindowUp);
  };

  // 언마운트되면(설정 행을 접거나 탭을 옮기면) 걸어 둔 리스너를 정리한다.
  useEffect(() => stopListening, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 아이콘을 꾹 눌러 끄는 동안에는(drag가 있을 때만) 배경 스크롤을 완전히
  // 잠근다 — 안 그러면 손가락이 아이콘 밖(예: 휴지통 쪽)으로 나갔을 때
  // 일부 환경에서 설정 화면 자체가 스크롤되며 스크롤바가 잠깐 나타난다.
  useEffect(() => {
    if (!drag) return undefined;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    const onTouchMove = (e) => e.preventDefault();
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      body.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [Boolean(drag)]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseIds = order.filter((id) => TOOL_META[id] && !isAddonId(id));
  const addonIds = order.filter((id) => TOOL_META[id] && isAddonId(id));

  const renderItem = (id) => {
    const meta = TOOL_META[id];
    const dragging = drag?.id === id;
    return (
      <button
        key={id}
        type="button"
        data-tool-id={id}
        className={`studio-toolkit-icon-btn toolkit-arranger-item${dragging ? " is-dragging" : ""}`}
        aria-label={`${toolLabel(id, ctx)} (꾹 눌러 옮기기)`}
        onPointerDown={onPointerDown(id)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {meta.icon(ctx)}
      </button>
    );
  };

  return (
    <div className="toolkit-arranger">
      <div className="studio-toolkit toolkit-arranger-bar">
        <div className="studio-toolkit-row studio-toolkit-row-base">{baseIds.map(renderItem)}</div>
        {addonIds.length > 0 && (
          <div className="studio-toolkit-row studio-toolkit-row-addons">{addonIds.map(renderItem)}</div>
        )}
      </div>
      <div
        className={`toolkit-arranger-trash${drag ? " is-visible" : ""}${drag?.overTrash ? " is-over" : ""}`}
        data-trash-zone="true"
        aria-hidden="true"
      >
        <TrashIcon size={20} />
      </div>
    </div>
  );
}
