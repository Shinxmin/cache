import { useEffect, useState } from "react";

// 삭제·복원 같은 버튼을 "두 번 눌러야 실행"되게 만드는 훅. 처음 누르면 그 버튼만
// "확인 대기(armed)" 상태가 되어(버튼에 붙는 .is-armed 클래스가 연한 빨간 배경을
// 입힌다) 실제로는 아무 일도 하지 않고, 같은 버튼을 한 번 더 눌러야 action이
// 실행된다. 다른 버튼이나 빈 공간을 누르면 대기가 풀린다.
//
// 대기 중인 버튼에는 data-armed 속성을 달아 줘야 한다 — 바깥을 눌렀는지 판단할 때
// 그 속성을 가진 요소 안쪽 탭은 "바깥"으로 치지 않는다(안 그러면 두 번째 탭이
// 실행되기도 전에 대기가 먼저 풀려 버린다).
export default function useArmedConfirm() {
  const [armed, setArmed] = useState(null);

  useEffect(() => {
    if (armed === null) return undefined;
    const onPointerDown = (e) => {
      if (!e.target.closest?.('[data-armed="true"]')) setArmed(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [armed]);

  const isArmed = (key) => armed === key;
  const press = (key, action) => () => {
    if (armed === key) {
      setArmed(null);
      action();
    } else {
      setArmed(key);
    }
  };

  return { isArmed, press };
}
