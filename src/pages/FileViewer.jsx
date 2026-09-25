import { useEffect, useRef, useState } from "react";
import { fetchFileBlob, fileUrl } from "../lib/drive";
import { extractPalette } from "../lib/palette";
import { isImage, isVideo } from "../lib/thumbnail";
import { CloseIcon } from "../components/icons";
import Spinner from "../components/Spinner";
import VideoClipPanel from "../components/VideoClipPanel";
import useDarkOverlay from "../hooks/useDarkOverlay";

const SWIPE_THRESHOLD = 50;

// 이미지·영상 파일을 누르면 다운로드 대신 이 전체화면 뷰어가 뜬다. presigned URL을
// 매번 새로 받아서(download 플래그 없이) <img>/<video>가 그 자리에서 바로 그린다.
// 좌우로 스와이프하면 같은 폴더의 다른 이미지·영상으로 넘어간다(items가 그
// 목록, index는 그 안에서 지금 보고 있는 위치). 영상·움짤(gif/webp)은 열리면
// 바로 재생되고 끝나면 처음부터 반복한다.
//
// paletteMode(팔레트 추출 애드온 v1.1)가 켜져 있으면 별도 모달 없이 이 화면
// 위, 닫기(X) 버튼 쪽 좌측에 상위 5색을 바로 얹어 보여준다.
//
// 영상이면 저장된 하이라이트 클립이 있는지 VideoClipPanel이 스스로 서버에서
// 받아보고, 있으면 닫기(X) 버튼과 같은 줄 아래에 목록을 얹어 보여준다(제목을
// 누르면 그 구간으로 이동해 재생). 새 하이라이트를 만드는 건 스튜디오
// 패널이 맡으므로 여기서는 보기·이름 고치기·지우기만 할 수 있다.
export default function FileViewer({ session, items, initialIndex, onClose, paletteMode = false }) {
  const [index, setIndex] = useState(initialIndex);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [paletteColors, setPaletteColors] = useState(null);
  // 클립 패널이 <video>를 직접 제어해야 해서(구간 이동·재생·정지) ref 대신
  // state로 들고 있는다 — 영상은 presigned URL을 받은 뒤에야 마운트되므로,
  // 패널 쪽 effect가 그 시점에 맞춰 다시 돌아야 한다.
  const [videoEl, setVideoEl] = useState(null);
  // 클립 패널이 실제로 뭔가(시작·끝 버튼이나 클립 목록) 그리고 있는지 —
  // 그래야만 영상을 그만큼 아래로 밀어낸다(패널이 비어 있으면 평소 위치 그대로).
  const [hasClipPanel, setHasClipPanel] = useState(false);
  const swipeStart = useRef(null);
  // 드래그(스와이프) 끝에는 브라우저가 mouseup 위치에서 click 이벤트를 마저
  // 쏘는데, 그 click이 배경까지 전파되면 넘기자마자 뷰어가 닫혀 버린다.
  // 스와이프가 인정된 다음 click 한 번만 무시해서 막는다.
  const suppressNextClick = useRef(false);

  const item = items[index];

  useDarkOverlay();

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

  // 팔레트 추출은 표시용 presigned URL이 아니라 캔버스로 픽셀을 읽어야 하므로
  // (CORS로 오염되지 않게) 별도로 blob을 받아 계산한다. 뷰어 자체는 그대로
  // 위 url로 <img>를 그린다.
  useEffect(() => {
    if (!paletteMode || !item) return;
    let cancelled = false;
    setPaletteColors(null);
    fetchFileBlob(session.token, item.r2_key)
      .then((blob) => extractPalette(blob, 5))
      .then((colors) => {
        if (!cancelled) setPaletteColors(colors);
      })
      .catch(() => {
        if (!cancelled) setPaletteColors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [paletteMode, session.token, item]);

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
      {isVideo(item.mime) && (
        <VideoClipPanel session={session} item={item} video={videoEl} onHasContentChange={setHasClipPanel} />
      )}
      {paletteMode && paletteColors && paletteColors.length > 0 && (
        <ul className="viewer-palette" onClick={(e) => e.stopPropagation()}>
          {paletteColors.map((hex) => (
            <li key={hex} className="palette-row">
              <span className="palette-swatch" style={{ background: hex }} aria-hidden="true" />
              <span className="palette-hex">{hex}</span>
            </li>
          ))}
        </ul>
      )}
      {/* .viewer-content 자체는 화면 전체를 채우는 정렬용 박스라, 클릭 전파 막기는
          실제 보이는 미디어 요소에만 걸어야 한다 — 그래야 미디어 바깥(패딩 여백)을
          눌렀을 때는 배경까지 전파되어 뷰어가 닫힌다. 스와이프 감지는 이 박스
          전체(미디어+여백)에 걸어 둔다. */}
      <div
        className={`viewer-content${hasClipPanel ? " viewer-content--clip" : ""}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {failed && <p className="viewer-note">불러오지 못했습니다</p>}
        {!failed && !url && <p className="viewer-note"><Spinner /></p>}
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
            ref={setVideoEl}
            src={url}
            controls
            autoPlay
            // 클립 목록이 있는 동안은 반복 재생을 끈다(VideoClipPanel이 직접
            // video.loop를 관리한다) — 구간 끝에서 멈춰야 하는데 반복 재생이
            // 영상 끝에서 처음으로 되감아 버리면 그 판정이 어긋난다.
            playsInline
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}
