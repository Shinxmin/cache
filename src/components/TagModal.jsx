import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { dedupeStrings } from "../lib/dedupe";
import { CloseIcon, FileIcon, FolderIcon } from "./icons";

// 스튜디오 툴킷의 태그(#) 아이콘으로 여는 태그 모달. 이름 바꾸기 모달과 세부
// 로직이 동일하다.
//  · 단일 선택: 입력창 하나 + "전체 지우기" + 확인 버튼.
//  · 다중 선택: 목록의 각 행이 파일/폴더 이름 옆에 자기만의 태그 입력창을
//    갖는다(처음부터 바로 활성화되어 있다) + "전체 지우기"(모두 비운다)·
//    "전체 적용"(1번째 입력창 값을 모두에게 그대로 적용 — 이 시점엔 전부
//    똑같은 값으로 놔둔다) + 확인 버튼. 확인을 누르는 순간 겹치는 태그가
//    있으면 그때 (1),(2),(3)…을 붙인다.
export default function TagModal({ items, onClose, onSubmit }) {
  useBodyScrollLock();
  const [tags, setTags] = useState(() => items.map((it) => it.tag || ""));
  const [busy, setBusy] = useState(false);
  const multi = items.length > 1;

  const setTagAt = (i, value) => setTags((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  const clearAll = () => setTags((prev) => prev.map(() => ""));
  const applyToAll = () => setTags((prev) => prev.map(() => prev[0]));

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const finalTags = dedupeStrings(tags);
      if (multi) {
        await onSubmit(items.map((it, i) => ({ id: it.id, tag: finalTags[i] })));
      } else {
        await onSubmit(finalTags[0]);
      }
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

        {multi ? (
          <ul className="rename-list" data-scroll-lock-allow>
            {items.map((item, i) => (
              <li className="rename-list-row" key={item.id}>
                <span className="rename-list-icon">
                  {item.is_folder ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                </span>
                <span className="tag-list-item-name">{item.name}</span>
                <input
                  className="tag-list-input"
                  type="text"
                  value={tags[i]}
                  onChange={(e) => setTagAt(i, e.target.value)}
                  maxLength={24}
                />
              </li>
            ))}
          </ul>
        ) : (
          <input
            className="rename-input"
            type="text"
            value={tags[0]}
            onChange={(e) => setTagAt(0, e.target.value)}
            maxLength={24}
            autoFocus
          />
        )}

        <div className="rename-actions">
          <button className="rename-action-btn" type="button" onClick={clearAll}>
            전체 지우기
          </button>
          {multi && (
            <button className="rename-action-btn" type="button" onClick={applyToAll}>
              전체 적용
            </button>
          )}
        </div>

        <button className="auth-submit" type="button" disabled={busy} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
