import { useState } from "react";
import { RestoreIcon, TrashIcon } from "./icons";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

// 휴지통 화면 제목 우측의 삼점바. 홈·파일 탭 헤더의 더 보기 버튼(HeaderMoreButton)과
// 같은 자리·모양·애니메이션이고, 내용만 업로드·새 폴더 대신 전체 삭제·전체 복원으로
// 바꿨다(왼쪽부터 삭제, 복원). 휴지통에 있는 모든 항목이 대상이다. 개별 항목의
// 삭제·복원은 각 행 오른쪽의 아이콘이 맡는다.
//
// 휴지통이 비어 있어도(disabled) 삼점바 자체는 평소처럼 열리고 닫힌다 — 다만
// 안의 두 액션 버튼만 눌러도 아무 일도 안 일어나게 막는다. 열고 닫는 것까지
// 막으면 "고장 난 버튼"처럼 보이지만, 열어서 액션이 비활성화된 걸 보여주는
// 편이 훨씬 자연스럽다.
export default function TrashMoreButton({ onDeleteAll, onRestoreAll, disabled }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`header-more${open ? " open" : ""}`}>
      <div className="header-more-inner">
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label="전체 삭제"
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onDeleteAll();
          }}
        >
          <span className="header-more-icon">
            <TrashIcon size={17} />
          </span>
          <span className="header-more-label">전체 삭제</span>
        </button>
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label="전체 복원"
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onRestoreAll();
          }}
        >
          <span className="header-more-icon">
            <RestoreIcon size={17} />
          </span>
          <span className="header-more-label">전체 복원</span>
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
