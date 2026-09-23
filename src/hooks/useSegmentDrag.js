import { useCallback, useRef } from "react";

// 알약 모양 세그먼트 컨트롤을 탭해서 고르는 것 말고도, 마우스로 끌거나
// 손가락으로 미끄러뜨려도(둘 다 pointer 이벤트 하나로 처리된다) 지나가는
// 칸이 그대로 선택되게 한다 — 모바일·데스크탑 둘 다 같은 방식으로 동작한다
// (useDragScroll과 달리 스크롤 가능한 목록이 아니라 작은 고정폭 컨트롤이라
// 터치를 따로 걸러낼 이유가 없다). 눌린 순간 바로 그 칸을 고르고(탭 선택),
// 그대로 손을 떼지 않고 옆 칸으로 넘어가면 계속 다시 고른다(드래그 선택).
// 실제로 칸을 넘나드는 드래그가 있었다면 그 뒤에 바로 이어지는 click을
// 무시해, 뗀 자리의 칸이 중복으로 다시 선택되지 않게 한다.
const DRAG_THRESHOLD = 4;

export default function useSegmentDrag(count, onChange) {
  const stateRef = useRef(null);
  const suppressClickRef = useRef(false);

  const indexAt = useCallback(
    (container, clientX) => {
      const rect = container.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
    },
    [count]
  );

  const onPointerDown = useCallback(
    (e) => {
      stateRef.current = { pointerId: e.pointerId, startX: e.clientX, dragging: false };
      onChange(indexAt(e.currentTarget, e.clientX));
    },
    [indexAt, onChange]
  );

  const onPointerMove = useCallback(
    (e) => {
      const st = stateRef.current;
      if (!st || e.pointerId !== st.pointerId) return;
      if (!st.dragging) {
        if (Math.abs(e.clientX - st.startX) < DRAG_THRESHOLD) return;
        st.dragging = true;
        e.currentTarget.setPointerCapture(st.pointerId);
      }
      onChange(indexAt(e.currentTarget, e.clientX));
    },
    [indexAt, onChange]
  );

  const finish = useCallback((e) => {
    const st = stateRef.current;
    if (st?.dragging) {
      suppressClickRef.current = true;
      e.currentTarget.releasePointerCapture(st.pointerId);
    }
    stateRef.current = null;
  }, []);

  const onClickCapture = useCallback((e) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onClickCapture };
}
