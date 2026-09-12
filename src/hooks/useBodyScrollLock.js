import { useEffect } from "react";

// 모달이 떠 있는 동안 배경 화면의 스크롤·터치를 막는다. body에 overflow:hidden만
// 주면 데스크톱에서는 충분하지만, iOS Safari는 그것만으로 터치 스크롤을 막지
// 못하므로 position:fixed로 문서를 지금 위치에 그대로 고정해야 한다. 모달이
// 닫히면(언마운트되면) 원래 스크롤 위치로 되돌린다.
export default function useBodyScrollLock() {
  useEffect(() => {
    const { body } = document;
    const scrollY = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);
}
