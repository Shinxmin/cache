import { useEffect, useRef } from "react";

// 상단 좌측정렬 제목. position: fixed로 화면 상단에 고정되어 스크롤 범위
// 자체에 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 절대 움직이거나
// 사라지지 않는다. 제목만 그린다 — 스토리지 섹션은 본문(StorageSection)이라 스크롤하면 함께 올라가
// 사라지고, 뒤로 가기·업로드·새 폴더(+)·선택 메뉴(삼점)·설정 버튼은 하단바에 있다.
export default function PageHeader({ title }) {
  const ref = useRef(null);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이를 재서 --header-h로 넘겨준다. .page의
  // padding-top이 이 값을 써서 본문이 헤더 바로 밑에서 시작한다.
  useEffect(() => {
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  return (
    <header className="page-header" ref={ref}>
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
      </div>
    </header>
  );
}
