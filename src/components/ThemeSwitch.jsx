function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M8.5 20h7M12 16.5V20" />
    </svg>
  );
}

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

const OPTIONS = [
  { value: "system", label: "시스템 설정", icon: SystemIcon },
  { value: "light", label: "라이트 모드", icon: SunIcon },
  { value: "dark", label: "다크 모드", icon: MoonIcon },
];

// 설정의 테마 행에 쓰는 3단 스위치 — 맨 왼쪽이 "시스템 설정"(기기 설정을
// 그대로 따름), 가운데가 라이트, 오른쪽이 다크. 고른 자리로 손잡이가
// 미끄러지듯 옮겨가고, 손잡이가 있는 자리의 아이콘만 배경색과 대비되는
// 색으로 바뀐다.
export default function ThemeSwitch({ mode, onChange }) {
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === mode));
  return (
    <span className="theme-switch" role="radiogroup" aria-label="테마">
      <span className="theme-switch-track">
        <span className="theme-switch-thumb" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={`theme-switch-option${value === mode ? " is-active" : ""}`}
            role="radio"
            aria-checked={value === mode}
            aria-label={label}
            onClick={() => onChange(value)}
          >
            <Icon />
          </button>
        ))}
      </span>
    </span>
  );
}
