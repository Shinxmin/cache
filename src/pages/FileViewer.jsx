import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../lib/drive";
import { isImage, isVideo } from "../lib/thumbnail";
import { CloseIcon } from "../components/icons";

const SWIPE_THRESHOLD = 50;

// 이미지·영상 파일을 누르면 다운로드 대신 이 전체화면 뷰어가 뜬다. presigned URL을
// 매번 새로 받아서(download 플래그 없이) <img>/<video>가 그 자리에서 바로 그린다.
// 좌우로 스와이프하면 같은 폴더의 다른 이미지·영상으로 넘어간다(items가 그
// 목록, index는 그 안에서 지금 보고 있는 위치). 영상·움짤(gif/webp)은 열리면
// 바로 재생되고 끝나면 처음부터 반복한다.
export default function FileViewer({ session, items, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const swipeStart = useRef(null);
  // 드래그(스와이프) 끝에는 브라우저가 mouseup 위치에서 click 이벤트를 마저
  // 쏘는데, 그 click이 배경까지 전파되면 넘기자마자 뷰어가 닫혀 버린다.
  // 스와이프가 인정된 다음 click 한 번만 무시해서 막는다.
  const suppressNextClick = useRef(false);

  const item = items[index];

  useEffect(() => {
    if (!item) return;
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
  }, [session.token, item]);

  if (!item) return null;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(items.length - 1, i + 1));

  // 좌우로 SWIPE_THRESHOLD px 넘게 움직이면 스와이프로 친다(세로 스크롤/탭과
  // 헷갈리지 않도록 가로 이동이 세로 이동보다 클 때만).
  const onPointerDown = (e) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      suppressNextClick.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
  };
  const onOverlayClick = () => {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    onClose();
  };

  return (
    <div className="viewer-overlay" onClick={onOverlayClick}>
      <button className="viewer-close" type="button" aria-label="닫기" onClick={onClose}>
        <CloseIcon />
      </button>
      {/* .viewer-content 자체는 화면 전체를 채우는 정렬용 박스라, 클릭 전파 막기는
          실제 보이는 미디어 요소에만 걸어야 한다 — 그래야 미디어 바깥(패딩 여백)을
          눌렀을 때는 배경까지 전파되어 뷰어가 닫힌다. 스와이프 감지는 이 박스
          전체(미디어+여백)에 걸어 둔다. */}
      <div className="viewer-content" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        {failed && <p className="viewer-note">불러오지 못했습니다</p>}
        {!failed && !url && <p className="viewer-note">불러오는 중…</p>}
        {url && isImage(item.mime) && (
          <img
            className="viewer-media"
            src={url}
            alt={item.name}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {url && isVideo(item.mime) && (
          <video
            className="viewer-media"
            src={url}
            controls
            autoPlay
            loop
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}
