import { useEffect } from "react";

// 모달이 떠 있는 동안 배경 화면의 스크롤·터치를 막는다.
//
// body를 position:fixed로 감싸 스크롤 위치에 고정하는 흔한 방식은 쓰지 않는다
// — 그 방식은 iOS PWA(홈 화면에 추가해 사파리 UI 없이 실행할 때) 안에서
// 모달을 열면 하단이 붕 뜨는 레이아웃 버그를 만든다(일반 사파리에서는 하단
// 주소창이 그 틈을 가려서 안 보일 뿐이었다). 대신 body는 건드리지 않고
// overflow만 잠그고(데스크톱 휠 스크롤 차단), 터치 스크롤은 touchmove를
// 가로채서 모달 안의 스크롤 영역([data-scroll-lock-allow]) 밖에서 시작된
// 터치만 막는다. 페이지 자체를 전혀 움직이지 않으므로 스크롤 위치를 저장·
// 복원할 필요도 없다.
export default function useBodyScrollLock() {
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onTouchMove = (e) => {
      if (e.target.closest("[data-scroll-lock-allow]")) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      body.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}
