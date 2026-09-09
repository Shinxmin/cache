import { useState } from "react";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

// 홈·파일 탭 제목 우측의 원형 "더 보기" 버튼. 평소엔 삼점(···)만 있는 원이고,
// 누르면 오른쪽 끝은 그대로 둔 채 왼쪽으로 자라나 업로드·새 폴더 두 액션이
// 나타난다. 다시 삼점(맨 오른쪽 항목)을 누르면 닫힌다.
//
// 애니메이션은 순수 CSS다 — 바깥 박스(overflow:hidden)의 width만 트랜지션하고,
// 안쪽 3항목 행은 항상 justify-content: flex-end로 오른쪽 정렬해 둔다. 그래서
// 닫힌 상태(가로폭 = 삼점 항목 하나 너비)에서는 창 너머로 삼점만 보이고, 여는
// 동안 나머지 두 항목이 왼쪽에서 자연스럽게 드러난다.
//
// 스크롤로는 닫히지 않는다(별도 처리 없음 = 기본 동작). 다른 탭으로 이동하면
// 부모(PageHeader)가 key={resetKey}로 이 컴포넌트를 통째로 새로 마운트시켜
// 자동으로 닫힌 상태가 된다. 업로드/새 폴더를 누르면 그 자리에서 닫는다.
export default function HeaderMoreButton({ onUpload, onNewFolder }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`header-more${open ? " open" : ""}`}>
      <div className="header-more-inner">
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => {
            setOpen(false);
            onUpload?.();
          }}
        >
          <span className="header-more-icon">
            <DocIcon />
          </span>
          <span className="header-more-label">업로드</span>
        </button>
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => {
            setOpen(false);
            onNewFolder?.();
          }}
        >
          <span className="header-more-icon">
            <FolderIcon />
          </span>
          <span className="header-more-label">새 폴더</span>
        </button>
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
