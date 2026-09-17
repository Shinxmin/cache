import { useEffect, useState } from "react";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import { fetchFileBlob } from "../lib/drive";
import { extractPalette } from "../lib/palette";
import { CloseIcon } from "./icons";
import Spinner from "./Spinner";

// 팔레트 추출 애드온의 결과 모달. 선택한 이미지를 작게 띄우고 그 밑에
// 지배적인 상위 5색을 "● #RRGGBB"(●는 그 색을 칠한 작은 원) 한 줄씩으로
// 보여준다. 확인을 누르면 닫힌다. 다른 모달과 같은 카드 껍데기를 쓰되
// 내용만큼만 세로로 차지한다(.confirm-modal-card).
export default function PaletteModal({ session, item, onClose }) {
  useBodyScrollLock();
  const [preview, setPreview] = useState(null);
  const [colors, setColors] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    (async () => {
      try {
        const blob = await fetchFileBlob(session.token, item.r2_key);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview(objectUrl);
        const palette = await extractPalette(blob, 5);
        if (!cancelled) setColors(palette);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session.token, item.r2_key]);

  return (
    <div className="rename-overlay" onClick={onClose}>
      <div className="rename-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="rename-card-header">
          <h2 className="rename-title">팔레트 추출</h2>
          <button className="rename-close" type="button" aria-label="취소" onClick={onClose}>
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="palette-preview">
          {preview ? <img src={preview} alt="" draggable={false} /> : <Spinner />}
        </div>

        {failed && <p className="confirm-modal-message">색상을 추출하지 못했습니다</p>}
        {!failed && colors && (
          <ul className="palette-list">
            {colors.map((hex) => (
              <li key={hex} className="palette-row">
                <span className="palette-swatch" style={{ background: hex }} aria-hidden="true" />
                <span className="palette-hex">{hex}</span>
              </li>
            ))}
          </ul>
        )}

        <button className="auth-submit" type="button" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
