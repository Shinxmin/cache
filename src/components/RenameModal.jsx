import { useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { dedupeStrings } from "../lib/dedupe";
import { CloseIcon, FileIcon, FolderIcon } from "./icons";

// 스튜디오 툴킷의 편집(연필) 아이콘으로 여는 이름 바꾸기 모달. 배경을 탭하거나
// 제목 줄 우측의 작은 x를 누르면 취소된다.
//  · 단일 선택: 입력창 하나 + 확인 버튼.
//  · 다중 선택: 선택한 항목을 각각 편집할 수 있는 입력창 목록 + "전체 지우기"
//    (모든 입력창을 비운다)·"전체 적용"(1번째 입력창 값을 모두에게 그대로
//    적용 — 이 시점엔 전부 똑같은 값으로 놔둔다)·"번호 붙이기"(1번째 값 끝의
//    숫자를 기준점 삼아 순서대로 번호를 잇는다) + 확인 버튼. 이름은 중복될 수
//    없으므로, 중복 여부는 "전체 적용" 때가 아니라 확인을 누르는 순간에
//    판단해 그때 겹치는 이름에만 (1),(2),(3)…을 붙인다.
export default function RenameModal({ items, onClose, onSubmit }) {
  useBodyScrollLock();
  const [names, setNames] = useState(() => items.map((it) => it.name));
  const [busy, setBusy] = useState(false);
  const multi = items.length > 1;

  const setNameAt = (i, value) => setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)));
  const clearAll = () => setNames((prev) => prev.map(() => ""));
  // 1번째 입력창 값을 모두에게 그대로 적용한다. 중복 처리는 여기서 하지
  // 않는다 — 확인을 누를 때 비로소 판단한다.
  const applyToAll = () => setNames((prev) => prev.map(() => prev[0]));
  // 첫 번째 항목의 값을 기준점으로 삼는다: 끝에 붙은 숫자를 뽑아 그 숫자부터
  // 순서대로 이어 붙인다 (예: 1번째가 "17"이면 17,18,19…). 숫자가 없으면
  // 1번째 이름을 그대로 접두사로 삼아(공백을 끼워 넣지 않는다 — "테스트ABC"면
  // "테스트ABC1", "테스트ABC2"…가 되고, 끝에 공백을 직접 넣어 뒀다면 그 공백까지
  // 그대로 이어진다) 1부터 매긴다.
  const attachNumbers = () =>
    setNames((prev) => {
      const first = prev[0] || "";
      const match = first.match(/^(.*?)(\d+)$/);
      const prefix = match ? match[1] : first;
      const base = match ? parseInt(match[2], 10) : 1;
      return prev.map((_, i) => `${prefix}${base + i}`);
    });

  const canSubmit = names.every((n) => n.trim().length > 0) && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const finalNames = dedupeStrings(names.map((n) => n.trim()));
      await onSubmit(items.map((it, i) => ({ id: it.id, name: finalNames[i] })));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">이름 바꾸기</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        {multi ? (
          <>
            <ul className="rename-list" data-scroll-lock-allow>
              {items.map((item, i) => (
                <li className="rename-list-row" key={item.id}>
                  <span className="rename-list-icon">
                    {item.is_folder ? <FolderIcon size={18} /> : <FileIcon size={18} />}
                  </span>
                  <input
                    className="rename-input"
                    type="text"
                    value={names[i]}
                    onChange={(e) => setNameAt(i, e.target.value)}
                  />
                </li>
              ))}
            </ul>
            <div className="rename-actions">
              <button className="rename-action-btn" type="button" onClick={clearAll}>
                전체 지우기
              </button>
              <button className="rename-action-btn" type="button" onClick={applyToAll}>
                전체 적용
              </button>
              <button className="rename-action-btn" type="button" onClick={attachNumbers}>
                번호 붙이기
              </button>
            </div>
          </>
        ) : (
          <input
            className="rename-input"
            type="text"
            value={names[0]}
            onChange={(e) => setNameAt(0, e.target.value)}
            autoFocus
          />
        )}

        <button className="auth-submit" type="button" disabled={!canSubmit} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
