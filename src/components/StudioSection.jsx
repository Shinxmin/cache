import { OpenInNewIcon } from "./icons";

// 홈 최상위에서만 맨 위에 뜨는 "스튜디오" 섹션(설정의 섹션처럼 테두리 상자). 제목 바로 오른쪽의 링크 이동
// 아이콘(스토리지 섹션과 같은 아이콘)을 누르면 스튜디오 화면으로 넘어간다. 하단바는 그대로 둔다.
export default function StudioSection({ onOpen }) {
  return (
    <section className="page-brand-box studio-card">
      <div className="page-brand">
        <h2 className="page-brand-title">스튜디오</h2>
        <button className="page-brand-link" type="button" aria-label="스튜디오 열기" onClick={onOpen}>
          <OpenInNewIcon size={15} />
        </button>
      </div>
      <p className="studio-card-desc">웹사이트에서 실시간으로 파일을 수정해보세요</p>
    </section>
  );
}
