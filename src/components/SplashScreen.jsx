// 첫 접속(새로고침 포함) 때 잠깐 뜨는 로딩 화면. 로그인 세션 확인과 파일
// 목록의 첫 로딩이 끝날 때까지 화면 전체를 덮는다 — 그 밑에서는 실제 파일
// 탭이 이미 마운트되어 데이터를 불러오는 중이고, 로딩이 끝나면 이 화면만
// 사라지며 파일 탭으로 자연스럽게 전환된다. 앱의 실제 테마(다크/라이트)와
// 무관하게 항상 라이트 배경으로 고정한다(로그인 화면과 같은 원칙).
export default function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-label="불러오는 중">
      <img className="splash-logo" src="/icons/icon-192.png" alt="" />
    </div>
  );
}
