import { useEffect, useState } from "react";
import { listFiles, thumbnailUrls } from "../lib/drive";
import { FileIcon, FolderIcon } from "../components/icons";

// 파일 탭 본문(웹드라이브). 갤러리형과 리스트형 두 가지로 보여준다.
//  · 갤러리형: 폴더/일반 파일은 타일 중앙에 아이콘, 제목은 타일 아래.
//    이미지·영상은 타일을 썸네일로 채우고 제목을 타일 좌하단에 겹쳐 올린다.
//  · 리스트형: 왼쪽에 아이콘, 오른쪽에 제목.
// 보기 방식 전환은 스튜디오 툴킷 바의 아이콘이 맡는다.
export default function FilesPage({ session, viewMode, parentId, onOpenFolder, onOpenFile, refreshKey }) {
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [state, setState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    (async () => {
      try {
        const rows = await listFiles(session.token, parentId);
        if (cancelled) return;
        setItems(rows);
        setState("ready");

        // 썸네일 URL은 만료되는 presigned URL이라 목록을 받은 뒤 한 번에 발급받는다.
        const keys = rows.filter((r) => r.thumb_key).map((r) => r.thumb_key);
        if (keys.length) {
          const urls = await thumbnailUrls(session.token, keys);
          if (!cancelled) setThumbs(urls);
        } else {
          setThumbs({});
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session.token, parentId, refreshKey]);

  const open = (item) => (item.is_folder ? onOpenFolder(item) : onOpenFile(item));

  if (state === "loading") return <p className="drive-note">불러오는 중…</p>;
  if (state === "error") return <p className="drive-note">파일을 불러오지 못했습니다</p>;
  if (!items.length) return <p className="drive-note">아직 파일이 없습니다</p>;

  if (viewMode === "list") {
    return (
      <ul className="drive-list">
        {items.map((item) => (
          <li key={item.id}>
            <button className="drive-row" type="button" onClick={() => open(item)}>
              <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
              <span className="drive-row-name">{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="drive-grid">
      {items.map((item) => {
        const thumb = item.thumb_key ? thumbs[item.thumb_key] : null;
        return (
          <li key={item.id}>
            <button className="drive-tile-btn" type="button" onClick={() => open(item)}>
              {thumb ? (
                // 썸네일이 있는 이미지·영상: 타일을 꽉 채우고 제목은 좌하단에 겹친다.
                <span className="drive-tile drive-tile--thumb">
                  <img src={thumb} alt="" loading="lazy" />
                  <span className="drive-tile-overlay-name">{item.name}</span>
                </span>
              ) : (
                <>
                  <span className="drive-tile">
                    {item.is_folder ? <FolderIcon size={44} /> : <FileIcon size={38} />}
                  </span>
                  <span className="drive-tile-name">{item.name}</span>
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
