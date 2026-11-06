import BottomSearchBar from "../components/BottomSearchBar";

// 스튜디오 화면. 홈의 스튜디오 섹션 아이콘으로 들어온다. 하단바는 설정 화면처럼 검색·+·설정이 비활성이고
// 뒤로 가기(<)만 켜져 있다 — 이 화면의 하단바 동작과 배치는 이후에 정해지는 대로 바꾼다.
export default function StudioPage({ onBack }) {
  return (
    <>
      <header className="page-header page-header--static page-header--no-blur">
        <div className="page-header-row">
          <h1 className="page-title">스튜디오</h1>
        </div>
      </header>
      <div className="page page--flush page--has-dock" />
      <BottomSearchBar inactive searchQuery="" onSearch={() => {}} canGoBack onBack={onBack} />
    </>
  );
}
