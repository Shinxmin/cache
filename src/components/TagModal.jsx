import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { CloseIcon, FileIcon, FolderIcon } from "./icons";

// 스튜디오 툴킷의 태그(#) 아이콘으로 여는 태그 모달. 이름 바꾸기 모달과 같은
// 카드 껍데기를 쓴다.
//  · 단일 선택: 입력창 하나 + 확인 버튼.
//  · 다중 선택(공유 입력 모드, 처음 열렸을 때): 목록은 읽기 전용으로 이름만
//    보여주고, 그 아래 공유 태그 입력창 하나 + "전체 지우기"·"전체 적용".
//    "전체 적용"을 누르면 지금 입력한 값이 전부에게 적용되면서 항목별 모드로
//    바뀐다 — 공유 입력창은 사라지고, 목록의 각 행이 자기만의 태그 입력창을
//    갖게 되어 그때부터는 항목마다 다르게 고칠 수 있다(이름과 달리 태그는
//    여러 항목이 같아도 되므로 "전체 적용"에 중복 방지 번호를 붙이지 않는다).
//    항목별 모드에서 "전체 지우기"는 전부 비우고, "전체 적용"은 1번째 항목의
//    지금 값을 나머지에 복사한다.
export default function TagModal({ items, onClose, onSubmit }) {
  useBodyScrollLock();
  // 선택한 항목이 전부 같은 태그면 그 값을 보여주고, 섞여 있으면 빈 채로 시작한다.
  const initial = items.every((it) => (it.tag || "") === (items[0].tag || "")) ? items[0].tag || "" : "";
  const [sharedTag, setSharedTag] = useState(initial);
  // null이면 아직 공유 입력 모드, 배열이면 항목별 모드(각 항목의 태그 값).
  const [perItemTags, setPerItemTags] = useState(null);
  const [busy, setBusy] = useState(false);
  const multi = items.length > 1;
  const perItemMode = multi && perItemTags !== null;

  const setPerItemTagAt = (i, value) => setPerItemTags((prev) => prev.map((t, idx) => (idx === i ? value : t)));

  const clearAll = () => {
    if (perItemMode) setPerItemTags((prev) => prev.map(() => ""));
    else setSharedTag("");
  };

  const applyToAll = () => {
    if (perItemMode) setPerItemTags((prev) => prev.map(() => prev[0]));
    else setPerItemTags(items.map(() => sharedTag));
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (perItemMode) {
        await onSubmit(items.map((it, i) => ({ id: it.id, tag: perItemTags[i] })));
      } else {
        await onSubmit(sharedTag);
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

        {multi && (
          <ul className="rename-list" data-scroll-lock-allow>
            {items.map((item, i) => (
              <li className="rename-list-row" key={item.id}>
                <span className="rename-list-icon">
                  {item.is_folder ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                </span>
                {perItemMode ? (
                  <>
                    <span className="tag-list-item-name">{item.name}</span>
                    <input
                      className="tag-list-input"
                      type="text"
                      value={perItemTags[i]}
                      onChange={(e) => setPerItemTagAt(i, e.target.value)}
                      maxLength={24}
                    />
                  </>
                ) : (
                  <span className="rename-list-name">{item.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {!perItemMode && (
          <input
            className="rename-input tag-input"
            type="text"
            value={sharedTag}
            onChange={(e) => setSharedTag(e.target.value)}
            placeholder=""
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
