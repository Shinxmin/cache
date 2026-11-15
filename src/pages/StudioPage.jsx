import { useEffect, useRef, useState } from "react";
import BottomSearchBar from "../components/BottomSearchBar";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import { ImportIcon } from "../components/icons";
import { fileUrl } from "../lib/drive";
import { isVideo, looksLikeVideoFile } from "../lib/thumbnail";
import { formatBytes, formatDateTime } from "../lib/format";

// 업로드할 수 있는 파일: 이미지·동영상·움짤만(폴더는 고를 수 없다).
export const STUDIO_ACCEPT =
  "image/*,video/*,.jpeg,.jpg,.png,.apng,.gif,.webp,.mp4,.avi,.mov,.m4v,.mkv,.webm";

const SWIPE_THRESHOLD = 50;

// 스튜디오 화면(편집 기능은 나중에 붙인다). 불러오기·업로드한 파일을 파일 뷰어처럼 한 파일씩 크게 띄우고(좌우로 넘기기),
// 하단바의 스튜디오 영역은 정보 패널처럼 항상 열려 지금 파일의 이름(연필 검색바)·날짜·용량을 보여준다.
// 하단바: <는 홈으로, 설정은 설정 화면(거기서 < 로 나오면 다시 스튜디오), + 안에 업로드·불러오기. 검색은 비활성이다.
export default function StudioPage({ session, files, onUpload, onImport, onOpenSettings, onBack, transfers, onOpenTransfers }) {
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const swipe = useRef(null);
  const item = files[Math.min(index, files.length - 1)] ?? null;
  const at = item ? files.indexOf(item) : -1;

  useEffect(() => {
    if (index > files.length - 1) setIndex(Math.max(0, files.length - 1));
  }, [files.length]);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!item) return undefined;
    let cancelled = false;
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
  }, [item?.id]);

  const go = (d) => setIndex((i) => Math.min(files.length - 1, Math.max(0, i + d)));
  const isVid = item && (isVideo(item.mime) || looksLikeVideoFile(item.name, item.mime));

  const info = item
    ? {
        name: item.name,
        lines: [formatDateTime(item.created_at), `1개 파일, ${formatBytes(item.size || 0)}`],
        onPrev: () => go(-1),
        onNext: () => go(1),
        prevDisabled: at <= 0,
        nextDisabled: at >= files.length - 1,
      }
    : undefined;

  return (
    <>
      <PageHeader title="스튜디오" transfers={transfers} onOpenTransfers={onOpenTransfers} />
      <div className="page page--has-dock page--studio-dock">
        <div
          className="studio-viewport"
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          }}
        >
          {item && failed && <p className="viewer-note">불러오지 못했습니다</p>}
          {item && !failed && !url && <p className="viewer-note"><Spinner /></p>}
          {item && url && !isVid && <img className="studio-media" src={url} alt={item.name} draggable={false} />}
          {item && url && isVid && <video className="studio-media" src={url} controls playsInline />}
        </div>
      </div>
      <BottomSearchBar
        studioDock
        studioInfo={info}
        searchDisabled
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        onUpload={onUpload}
        onNewFolder={onImport}
        plusAccept={STUDIO_ACCEPT}
        plusSecondLabel="불러오기"
        plusSecondIcon={<ImportIcon size={17} />}
      />
    </>
  );
}
