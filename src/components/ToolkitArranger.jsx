import { useEffect, useRef, useState } from "react";
import CheckboxVisual from "./Checkbox";
import { TrashIcon } from "./icons";
import { TOOL_META, toolLabel } from "./toolkitIcons";
import { isAddonId } from "../lib/addons";

const HOLD_MS = 250;
const MOVE_SLOP = 8;

// 설정 → "스튜디오 툴킷 사용자 정렬"을 펼치면 나오는 편집용 툴바. 실제
// 툴킷과 똑같은 모양(.studio-toolkit)이지만 기능은 전부 비활성이고, 전체
// 선택 체크박스·글자를 뺀 아이콘들만 꾹 눌러(250ms) 끌어 순서를 바꿀 수 있다.
// 끄는 동안 다른 아이콘 위를 지나가면 그 자리로 실시간으로 옮겨지고, 손을
// 떼면 부모에 새 순서를 알린다(서버 저장·기록은 부모 몫). 툴바 밑에는
// 약간의 여백을 두고 휴지통 아이콘이 있는 보이지 않는 드롭 존이 있어,
// 애드온 아이콘을 거기로 끌어다 놓으면 그 애드온이 삭제된다(기본 도구는
// 휴지통에 놓아도 원래 자리로 돌아간다).
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
    const overTrash = Boolean(hit?.trash);
    p.overTrash = overTrash;
    setDrag((d) => (d && d.overTrash !== overTrash ? { ...d, overTrash } : d));
    if (!overTrash && hit?.id && hit.id !== p.id) {
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

  return (
    <div className="toolkit-arranger">
      <div className="studio-toolkit toolkit-arranger-bar">
        <label className="studio-toolkit-select" aria-disabled="true">
          <span className="checkbox">
            <input type="checkbox" checked={false} readOnly disabled />
            <CheckboxVisual />
          </span>
          <span className="studio-toolkit-label">전체 선택</span>
        </label>
        <div className="studio-toolkit-icons" style={{ "--tool-count": order.length }}>
          {order.map((id) => {
            const meta = TOOL_META[id];
            if (!meta) return null;
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
          })}
        </div>
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
