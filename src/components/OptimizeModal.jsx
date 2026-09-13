import { useMemo, useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { isOptimizableFile } from "../lib/optimize";
import { CloseIcon, FileIcon } from "./icons";

// 스튜디오 툴킷의 용량 압축(원그래프) 아이콘으로 여는 최적화 모달. 선택된
// 파일들(폴더 제외)을 보여주는 목록은 다른 모달과 같은 리스트 레이아웃을
// 쓰되, 이름은 고정 표시만 하고(수정 불가) 그 아래 프로그레스 바 형태의
// 3단계(25%·50%·75%) 구간 중 하나를 골라 확인을 누르면 그 비율만큼 각
// 파일의 용량을 줄인다. 캔버스가 못 읽는 확장자(동영상·PDF 등)가 섞여
// 있으면 그 파일 이름 옆에 빨간 경고를 붙이고, 하나라도 있으면 확인
// 버튼 자체를 막는다 — 일부만 압축되고 일부는 조용히 실패하는 애매한
// 결과 대신, 선택에서 빼고 다시 시도하게 한다.
const LEVELS = [25, 50, 75];

export default function OptimizeModal({ items, onClose, onSubmit }) {
  useBodyScrollLock();
  const [level, setLevel] = useState(1);
  const [busy, setBusy] = useState(false);
  const hasUnsupported = useMemo(() => items.some((it) => !isOptimizableFile(it.name)), [items]);

  const submit = async () => {
    if (busy || hasUnsupported) return;
    setBusy(true);
    try {
      await onSubmit(LEVELS[level]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">최적화</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <ul className="rename-list" data-scroll-lock-allow>
          {items.map((item) => {
            const supported = isOptimizableFile(item.name);
            return (
              <li className="rename-list-row" key={item.id}>
                <span className="rename-list-icon">
                  <FileIcon size={18} />
                </span>
                <span className="rename-list-name">{item.name}</span>
                {!supported && <span className="optimize-warn">지원하지 않는 확장자</span>}
              </li>
            );
          })}
        </ul>

        <div className="optimize-levels">
          <p className="optimize-quality-label">품질</p>
          <div className="optimize-bar" role="group" aria-label="압축 비율">
            {LEVELS.flatMap((pct, i) => [
              i > 0 && <span key={`line-${pct}`} className={`optimize-line${i <= level ? " filled" : ""}`} />,
              <button
                key={pct}
                type="button"
                className={`optimize-dot${i <= level ? " filled" : ""}`}
                aria-label={`${pct}%`}
                aria-pressed={level === i}
                onClick={() => setLevel(i)}
              />,
            ])}
          </div>
          <div className="optimize-marks">
            {LEVELS.map((pct, i) => (
              <button
                key={pct}
                type="button"
                className={`optimize-mark${level === i ? " active" : ""}`}
                onClick={() => setLevel(i)}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <button className="auth-submit" type="button" disabled={busy || hasUnsupported} onClick={submit}>
          확인
        </button>
      </div>
    </div>
  );
}
