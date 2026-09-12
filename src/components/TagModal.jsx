import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon, FileIcon, FolderIcon } from "./icons";

// 스튜디오 툴킷의 태그(#) 아이콘으로 여는 태그 모달. 이름 바꾸기 모달과 같은
// 카드 껍데기를 쓴다. 선택한 항목 전체에 같은 태그 하나를 붙인다 — 개별
// 이름과 달리 태그는 항목마다 다르게 줄 이유가 없어 입력창이 하나뿐이다.
// 다중 선택시에는 어떤 항목에 적용되는지 보여주는 목록을 스크롤 가능하게
// 띄우고, 그 아래에 "전체 지우기"를 둔다(입력창을 비우는 것뿐이고, 실제
// 반영은 확인을 눌러야 된다 — 빈 채로 확인하면 태그가 지워진다).
export default function TagModal({ items, onClose, onSubmit }) {
  useBodyScrollLock();
  // 선택한 항목이 전부 같은 태그면 그 값을 보여주고, 섞여 있으면 빈 채로 시작한다.
  const initial = items.every((it) => (it.tag || "") === (items[0].tag || "")) ? items[0].tag || "" : "";
  const [tag, setTag] = useState(initial);
  const [busy, setBusy] = useState(false);
  const multi = items.length > 1;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(tag);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">태그</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {multi && (
          <ul className="rename-list">
            {items.map((item) => (
              <li className="rename-list-row" key={item.id}>
                <span className="rename-list-icon">
                  {item.is_folder ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                </span>
                <span className="rename-list-name">{item.name}</span>
              </li>
            ))}
          </ul>
        )}

        <input
          className="rename-input"
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="태그 이름"
          maxLength={24}
          autoFocus
        />

        <div className="rename-actions">
          <button className="rename-action-btn" type="button" onClick={() => setTag("")}>
            전체 지우기
          </button>
        </div>

        <button className="auth-submit" type="button" disabled={busy} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
