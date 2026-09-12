import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon } from "./icons";

// 스튜디오 툴킷의 휴지통 아이콘으로 여는 삭제 확인 모달. 다른 모달과 같은
// 카드 껍데기를 쓰지만 목록·입력창 없이 안내 문구 하나와 확인 버튼뿐이다.
// 배경을 탭하거나 제목 줄 우측의 x를 누르면 취소된다.
export default function DeleteConfirmModal({ count, onClose, onSubmit }) {
  useBodyScrollLock();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">삭제</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <p className="delete-confirm-message">{count}개 파일을 삭제하시겠습니까?</p>

        <button className="auth-submit" type="button" disabled={busy} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
