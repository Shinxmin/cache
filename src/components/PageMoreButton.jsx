import { useState } from "react";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

// 휴지통·중복된 파일 화면 제목 우측의 삼점바. 홈·파일 탭 헤더의 더 보기
// 버튼(HeaderMoreButton)과 같은 자리·모양·애니메이션이고, 안의 액션은 화면마다
// actions로 넘긴다 — { key, label, icon, armed, onClick }. 열었을 때의 가로폭은
// 액션 개수에 맞춰 늘어난다(항목 48.5px씩 + 왼쪽 여백 8px + 삼점 45px).
//
// 액션은 두 번 눌러야 실행된다(useArmedConfirm): 첫 번째 누름은 그 항목만 연한
// 빨간 배경(armed)으로 바꾸고 메뉴는 열어 둔다. armed인 항목을 한 번 더 눌러 실제로
// 실행되면 그때 메뉴가 닫힌다.
//
// 목록이 비어 있어도(disabled) 삼점바 자체는 평소처럼 열리고 닫힌다 — 다만 안의
// 액션 버튼만 눌러도 아무 일도 안 일어나게 막는다. 열고 닫는 것까지 막으면 "고장
// 난 버튼"처럼 보이기 때문이다.
export default function PageMoreButton({ actions, disabled }) {
  const [open, setOpen] = useState(false);
  const openWidth = 8 + 48.5 * actions.length + 45;

  return (
    <div className={`header-more${open ? " open" : ""}`} style={{ "--more-open-w": `${openWidth}px` }}>
      <div className="header-more-inner">
        {actions.map((action) => (
          <button
            key={action.key}
            className={`header-more-item${action.armed ? " is-armed" : ""}`}
            type="button"
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            aria-label={action.label}
            data-armed={action.armed ? "true" : undefined}
            disabled={disabled}
            onClick={() => {
              const wasArmed = action.armed;
              action.onClick();
              if (wasArmed) setOpen(false);
            }}
          >
            <span className="header-more-icon">{action.icon}</span>
            <span className="header-more-label">{action.label}</span>
          </button>
        ))}
        <button
          className="header-more-item header-more-toggle"
          type="button"
          aria-label={open ? "닫기" : "더 보기"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="header-more-icon">
            <DotsIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
