import { useEffect, useState } from "react";
import { fileUrl } from "../lib/drive";
import { isImage, isVideo } from "../lib/thumbnail";
import { CloseIcon } from "../components/icons";

// 이미지·영상 파일을 누르면 다운로드 대신 이 전체화면 뷰어가 뜬다. presigned URL을
// 매번 새로 받아서(download 플래그 없이) <img>/<video>가 그 자리에서 바로 그린다.
export default function FileViewer({ session, item, onClose }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    fileUrl(session.token, item.r2_key)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, item.r2_key]);

  return (
    <div className="viewer-overlay" onClick={onClose}>
      <button className="viewer-close" type="button" aria-label="닫기" onClick={onClose}>
        <CloseIcon />
      </button>
      {/* .viewer-content 자체는 화면 전체를 채우는 정렬용 박스라, 클릭 전파 막기는
          실제 보이는 미디어 요소에만 걸어야 한다 — 그래야 미디어 바깥(패딩 여백)을
          눌렀을 때는 배경까지 전파되어 뷰어가 닫힌다. */}
      <div className="viewer-content">
        {failed && <p className="viewer-note">불러오지 못했습니다</p>}
        {!failed && !url && <p className="viewer-note">불러오는 중…</p>}
        {url && isImage(item.mime) && (
          <img className="viewer-media" src={url} alt={item.name} onClick={(e) => e.stopPropagation()} />
        )}
        {url && isVideo(item.mime) && (
          <video
            className="viewer-media"
            src={url}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}
