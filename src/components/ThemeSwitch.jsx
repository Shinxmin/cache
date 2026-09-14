function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M4.6 4.6l1.85 1.85M17.55 17.55l1.85 1.85M2.5 12h2.6M18.9 12h2.6M4.6 19.4l1.85-1.85M17.55 6.45l1.85-1.85" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1z" />
    </svg>
  );
}

// 설정의 테마 행에 쓰는 좌우 스위치. 체크박스(정사각 박스+체크)와는 다른
// 형태로, 트랙 양 끝에 해·달 아이콘을 두고 그 사이를 손잡이가 오간다 —
// 왼쪽이 라이트, 오른쪽이 다크. 구조는 체크박스와 같은 요령(투명 네이티브
// input + 형제 요소가 시각 표현)을 쓴다.
export default function ThemeSwitch({ dark, onChange }) {
  return (
    <span className="theme-switch">
      <input type="checkbox" checked={dark} onChange={(e) => onChange(e.target.checked)} aria-label="다크 모드" />
      <span className="theme-switch-track" aria-hidden="true">
        <span className="theme-switch-icon theme-switch-icon--sun">
          <SunIcon />
        </span>
        <span className="theme-switch-icon theme-switch-icon--moon">
          <MoonIcon />
        </span>
        <span className="theme-switch-thumb" />
      </span>
    </span>
  );
}
