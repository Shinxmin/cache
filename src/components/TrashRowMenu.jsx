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

// 휴지통 각 행의 원형 "더 보기" 버튼. 홈·파일 탭 헤더의 삼점바(HeaderMoreButton)와
// 완전히 같은 모양·애니메이션(평소엔 삼점만 있는 원, 누르면 오른쪽 끝은 그대로 둔
// 채 왼쪽으로 자라나 항목이 드러남)이고, 내용만 업로드·새 폴더 대신 왼쪽부터
// 삭제·복원 아이콘으로 바꿨다. 두 액션 모두 확인 없이 즉시 실행되고, 실행 후
// 그 자리에서 닫는다(어차피 행 자체가 목록에서 사라진다).
export default function TrashRowMenu({ onDelete, onRestore }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`header-more${open ? " open" : ""}`}>
      <div className="header-more-inner">
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label="영구 삭제"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
        >
          <span className="header-more-icon">
            <TrashIcon size={17} />
          </span>
        </button>
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          aria-label="복원"
          onClick={() => {
            setOpen(false);
            onRestore();
          }}
        >
          <span className="header-more-icon">
            <RestoreIcon size={17} />
          </span>
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
