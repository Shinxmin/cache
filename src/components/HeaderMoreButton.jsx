import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "./icons";

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

// 하단바(검색창 아래 줄)의 원형 "+" 버튼. 평소엔 +만 있는 원(지름 45px)이고, 누르면 오른쪽 끝은
// 그대로 둔 채 왼쪽으로 자라나(150px) 업로드·새 폴더 두 액션이 나타난다. 다시 +(맨 오른쪽
// 항목)를 누르면 닫힌다.
//
// 애니메이션은 순수 CSS다 — 바깥 박스(overflow:hidden)의 width만 트랜지션하고, 안쪽 3항목 행은
// 항상 justify-content: flex-end로 오른쪽 정렬해 둔다. 업로드/새 폴더를 누르면 그 자리에서 닫는다.
export default function HeaderMoreButton({ onUpload, onNewFolder, hidden = false }) {
  const [open, setOpen] = useState(false);
  // 파일·폴더를 선택하는 동안에는 이 자리를 선택 메뉴(삼점)가 대신 쓴다 — 접히며 사라지고(열려
  // 있었다면 닫힌다), 선택이 풀리면 다시 펼쳐지며 돌아온다.
  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);
  const fileInputRef = useRef(null);

  const toggle = () => setOpen((v) => !v);

  return (
    <div className={`header-more header-more--add${open ? " open" : ""}${hidden ? " is-hidden" : ""}`} aria-hidden={hidden}>
      {/* 업로드 클릭 시 아이폰에서는 사진/파일 선택 팝업을, PC에서는 OS 파일 선택
          대화상자를 그대로 띄우는 네이티브 파일 입력(화면에는 보이지 않음). */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          onUpload?.(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="header-more-inner">
        <button
          className="header-more-item"
          type="button"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => {
            setOpen(false);
            fileInputRef.current?.click();
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
          aria-label={open ? "닫기" : "추가"}
          aria-expanded={open}
          onClick={toggle}
        >
          <span className="header-more-icon">
            <PlusIcon size={22} />
          </span>
        </button>
      </div>
    </div>
  );
}
