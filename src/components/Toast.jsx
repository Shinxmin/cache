// 하단 내비바 바로 위에 잠깐 떠서 페이드 인·아웃하는 안내 문구. 표시 시간은
// 부모(App.jsx)가 관리한다 — message가 있을 때만 마운트되고, CSS 애니메이션
// (toast-in-out)이 2초 동안 나타났다 사라지는 것까지 맡는다.
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
