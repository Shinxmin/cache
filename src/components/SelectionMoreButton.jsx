import { useEffect, useState } from "react";
import { FileMoveIcon, InfoIcon, TrashIcon } from "./icons";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

// 파일·폴더를 하나라도 선택하고 있을 때만 하단바의 + 버튼 자리에 나타나는 원형 삼점 버튼.
// 선택이 생기면 폭 0에서 45px로 펼쳐지며 나타나고, 선택이 모두 풀리면 같은 방식으로
// 사라진다(열려 있었다면 닫힌다). 누르면 오른쪽 끝은 그대로 둔 채 왼쪽으로 자라나
// 삭제·이동·정보 세 항목(아이콘 + 아래 글자)이 드러난다. 항목을 누르면 그
// 자리에서 닫히고, 해당 동작의 하단바 패널이 열린다.
export default function SelectionMoreButton({ visible, onDelete, onMove, onInfo, infoDisabled = false, actions }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const items = actions ?? [
    { key: "delete", label: "삭제", icon: <TrashIcon size={17} />, run: onDelete },
    { key: "move", label: "이동", icon: <FileMoveIcon size={17} />, run: onMove },
    // 정보는 하나만 선택했을 때만 쓸 수 있다 — 여러 개를 고르면 표준 비활성 디자인(흐림, 눌리지 않음).
    { key: "info", label: "정보", icon: <InfoIcon size={17} />, run: onInfo, disabled: infoDisabled },
  ];

  return (
    <div
      className={`header-more header-more--selection${visible ? " visible" : ""}${open ? " open" : ""}`}
      // 펼침 폭 = 왼쪽 여백 8 + 항목 폭 48.5 × 개수 + 삼점 버튼 45.
      style={{ "--more-open-w": `${8 + 48.5 * items.length + 45}px` }}
      aria-hidden={!visible}
    >
      <div className="header-more-inner">
        {items.map((item) => (
          <button
            key={item.key}
            className="header-more-item"
            type="button"
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            disabled={item.disabled}
            onClick={() => {
              setOpen(false);
              item.run?.();
            }}
          >
            <span className="header-more-icon">{item.icon}</span>
            <span className="header-more-label">{item.label}</span>
          </button>
        ))}
        <button
          className="header-more-item header-more-toggle"
          type="button"
          tabIndex={visible ? 0 : -1}
          aria-label={open ? "닫기" : "선택 항목 메뉴"}
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
