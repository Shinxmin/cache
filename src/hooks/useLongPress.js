import { useCallback, useRef } from "react";

const LONG_PRESS_MS = 500;
const MOVE_SLOP = 10;

// 꾹 누르기와 탭을 구분한다. 스크롤하려고 손가락을 움직이면(슬롭 초과) 탭으로도
// 꾹 누르기로도 치지 않는다(TabBar의 탭-드래그 구분과 같은 원리).
//
// onClick도 함께 반환하는 이유: 포인터 이벤트만으로는 키보드(엔터/스페이스)
// 활성화를 못 잡기 때문이다. 다만 포인터로 이미 탭을 처리했다면 뒤따라오는
// 네이티브 click은 건너뛴다 — 안 그러면 마우스 클릭 하나가 탭을 두 번
// 처리해서(예: 선택을 켰다가 바로 끄는) 오작동한다.
export default function useLongPress(onTap, onLongPress) {
  const stateRef = useRef(null);
  const timerRef = useRef(0);
  const pointerHandledRef = useRef(false);

  const onPointerDown = useCallback(
    (e) => {
      stateRef.current = { x: e.clientX, y: e.clientY, longPressFired: false, cancelled: false };
      timerRef.current = setTimeout(() => {
        const st = stateRef.current;
        if (st && !st.cancelled) {
          st.longPressFired = true;
          onLongPress();
        }
      }, LONG_PRESS_MS);
    },
    [onLongPress]
  );

  const onPointerMove = useCallback((e) => {
    const st = stateRef.current;
    if (!st || st.cancelled) return;
    if (Math.hypot(e.clientX - st.x, e.clientY - st.y) > MOVE_SLOP) {
      st.cancelled = true;
      clearTimeout(timerRef.current);
    }
  }, []);

  const finish = useCallback(() => {
    const st = stateRef.current;
    clearTimeout(timerRef.current);
    // pointerup은 항상 뒤따르는 네이티브 click보다 먼저 온다 — 탭이든 꾹 누르기든
    // 드래그든, 여기서 이미 처리를 끝냈다는 표시를 남겨 click이 또 onTap을
    // 부르지 않게 한다. 이걸 안 하면 꾹 눌러 선택한 직후 click이 다시 실행돼
    // 바로 선택이 풀리는 버그가 난다.
    pointerHandledRef.current = true;
    if (st && !st.cancelled && !st.longPressFired) {
      onTap();
    }
    stateRef.current = null;
  }, [onTap]);

  const onPointerCancel = useCallback(() => {
    clearTimeout(timerRef.current);
    stateRef.current = null;
  }, []);

  const onClick = useCallback(() => {
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }
    onTap();
  }, [onTap]);

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel, onClick };
}
