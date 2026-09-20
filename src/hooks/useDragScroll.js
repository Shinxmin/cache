import { useCallback, useRef } from "react";

const DRAG_THRESHOLD = 5;

// 데스크탑(마우스)에서 가로 스크롤 영역을 좌우로 드래그해 넘길 수 있게 한다.
// 터치·펜은 이미 브라우저가 스와이프로 스크롤해 주므로 마우스 포인터일 때만
// 동작한다. 실제로 스크롤이 움직인 드래그였다면 그 뒤에 바로 이어지는
// click 한 번을 무시해, 드래그 끝에 손을 뗀 자리의 아이콘이 실수로 눌리지
// 않게 한다(스와이프 뒤 클릭을 무시하는 FileViewer의 방식과 같은 원리).
export default function useDragScroll() {
  const stateRef = useRef(null);
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== "mouse") return;
    stateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: e.currentTarget.scrollLeft,
      dragging: false,
    };
  }, []);

  const onPointerMove = useCallback((e) => {
    const st = stateRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startX;
    if (!st.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      st.dragging = true;
      e.currentTarget.setPointerCapture(st.pointerId);
    }
    e.currentTarget.scrollLeft = st.startScrollLeft - dx;
  }, []);

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
