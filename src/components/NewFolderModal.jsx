import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon } from "./icons";

// 헤더 삼점 버튼의 "새 폴더"로 여는 모달. window.prompt 대신 다른 모달들과
// 같은 카드 껍데기를 쓰지만, 목록·아이콘 없이 입력창 하나뿐이라 휴지통
// 삭제 확인 모달처럼 세로폭이 내용만큼만(auto) 줄어드는 .confirm-modal-card를
// 쓴다. 배경을 탭하거나 제목 줄 우측의 작은 x를 누르면 취소된다.
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
      <div className="rename-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">새 폴더</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <input
          className="rename-input"
          type="text"
          placeholder="폴더 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <button className="auth-submit" type="button" disabled={!canSubmit} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
