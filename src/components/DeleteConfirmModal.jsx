import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon } from "./icons";

const CLOSE_ANIMATION_MS = 180;

// 스튜디오 툴킷의 휴지통 아이콘으로 여는 삭제 확인 모달. 다른 모달과 같은
// 카드 껍데기를 쓰지만 목록·입력창 없이 안내 문구 하나와 확인 버튼뿐이다.
// 배경을 탭하거나 제목 줄 우측의 x를 누르면 취소된다.
//
// 등장할 땐 CSS 애니메이션이 마운트와 동시에 자동으로 재생되지만, 사라질 땐
// React가 DOM을 곧바로 지워버려 트랜지션을 볼 틈이 없다. 그래서 취소
// 동작에서는 실제로 onClose를 부르기 전에 "닫히는 중" 상태를 잠깐 켜서
// 퇴장 애니메이션(CSS의 .is-closing)이 끝날 시간을 준 뒤에 부모를 부른다.
export default function DeleteConfirmModal({ count, onClose, onSubmit }) {
  useBodyScrollLock();
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_MS);
  };

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
    <div
      className={`rename-overlay delete-confirm-overlay${closing ? " is-closing" : ""}`}
      onClick={requestClose}
    >
      <div className="rename-card delete-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">삭제</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={requestClose}>
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
