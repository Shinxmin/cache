import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon, FolderIcon } from "./icons";

// 헤더 삼점 버튼의 "새 폴더"로 여는 모달. window.prompt 대신 다른 모달들과
// 같은 카드 껍데기·리스트 레이아웃(아이콘 + 입력창 한 줄)을 쓴다 — 다만
// 이름 바꾸기와 달리 대상이 하나뿐이라 "전체 지우기" 같은 다중 선택용
// 액션 버튼은 없다. 배경을 탭하거나 제목 줄 우측의 작은 x를 누르면 취소된다.
export default function NewFolderModal({ onClose, onSubmit }) {
  useBodyScrollLock();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">새 폴더</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <ul className="rename-list" data-scroll-lock-allow>
          <li className="rename-list-row">
            <span className="rename-list-icon">
              <FolderIcon size={18} />
            </span>
            <input
              className="rename-input"
              type="text"
              placeholder="폴더 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </li>
        </ul>

        <button className="auth-submit" type="button" disabled={!canSubmit} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
