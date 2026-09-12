import { useEffect, useState } from "react";
import { folderSizes, listFiles, thumbnailUrls } from "../lib/drive";
import { extensionFromMime, formatBytes } from "../lib/format";
import { CheckIcon, FileIcon, FolderIcon } from "../components/icons";
import useLongPress from "../hooks/useLongPress";

// 정보(i) 아이콘으로 그 항목의 용량 표기를 켰을 때만(item.info_revealed가
// true일 때만) 밑에 보여줄 용량 문구. 블러와 마찬가지로 서버에 저장돼 있어
// 선택을 풀거나 새로고침·재접속해도 계속 표기된 채로 남는다.
// 폴더는 재귀 합산 값이 folderSizeMap에 도착해야 나오고(그 전엔 로딩 중이라
// 아무것도 안 보여준다), 파일은 이미 목록에 들어 있는 size를 바로 쓴다.
// 태그가 붙어 있으면 그 옆에 "#태그명"처럼 덧붙인다.
// 리스트형(showExtension)에서는 파일에 한해 끝에 "(.mp4)"처럼 확장자도 붙는다
// — 파일 이름이 아니라 실제 MIME 메타데이터로 알아내므로, 이름에 확장자
// 표기가 없어도 정확하게 나온다(폴더는 확장자 개념이 없어 붙이지 않는다).
function sizeLabel(item, revealed, folderSizeMap, showExtension) {
  if (!revealed) return null;
  const size = item.is_folder ? folderSizeMap[item.id] : item.size;
  if (item.is_folder && size === undefined) return null;
  const text = formatBytes(size);
  let label = item.tag ? `${text} #${item.tag}` : text;
  if (showExtension && !item.is_folder) {
    const ext = extensionFromMime(item.mime);
    if (ext) label += ` (.${ext})`;
  }
  return label;
}

// 갤러리 타일 하나. 꾹 누르면 선택 모드로 들어가고(App.jsx가 스튜디오 툴킷을
// 띄운다), 선택된 동안은 눌린 것처럼 살짝 눌려 보이며 체크 배지가 뜬다.
function GalleryTile({ item, thumb, selected, size, onTap, onLongPress }) {
  const press = useLongPress(onTap, onLongPress);
  return (
    <button className={`drive-tile-btn${selected ? " selected" : ""}`} type="button" {...press}>
      {thumb ? (
        // 썸네일이 있는 이미지·영상: 타일을 꽉 채우고 제목은 좌하단에 겹친다.
        // 블러 처리된 항목은 썸네일에만 블러를 건다(실제로 열어 보면 원본 그대로).
        <span className="drive-tile drive-tile--thumb">
          <img
            className={item.blurred ? "drive-thumb-blurred" : undefined}
            src={thumb}
            alt=""
            loading="lazy"
            draggable={false}
          />
          <span className="drive-tile-overlay-name">
            <span className="drive-tile-overlay-title">{item.name}</span>
            {size && <span className="drive-tile-overlay-size">{size}</span>}
          </span>
          {selected && (
            <span className="drive-select-badge">
              <CheckIcon />
            </span>
          )}
        </span>
      ) : (
        // 썸네일이 없는 폴더·일반 파일도 제목(+용량)을 타일 밖이 아니라 안쪽
        // 아래에 겹쳐서 보여준다(썸네일 타일과 같은 자리).
        <span className="drive-tile">
          {item.is_folder ? (
            <FolderIcon size={44} className="drive-tile-icon-small" />
          ) : (
            // 썸네일이 있어야 하는 이미지·영상인데 아직 안 왔을 때(로딩 중)
            // 잠깐 보이는 이 파일 아이콘도 폴더 아이콘과 같은 작은 크기로.
            <FileIcon size={38} className={item.thumb_key ? "drive-tile-icon-small" : undefined} />
          )}
          {selected && (
            <span className="drive-select-badge">
              <CheckIcon />
            </span>
          )}
          <span className="drive-tile-caption">
            <span className="drive-tile-name">{item.name}</span>
            {size && <span className="drive-tile-size">{size}</span>}
          </span>
        </span>
      )}
    </button>
  );
}

function ListRow({ item, selected, size, onTap, onLongPress }) {
  const press = useLongPress(onTap, onLongPress);
  return (
    <button className={`drive-row${selected ? " selected" : ""}`} type="button" {...press}>
      <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
      <span className="drive-row-text">
        <span className="drive-row-name">{item.name}</span>
        {size && <span className="drive-row-size">{size}</span>}
      </span>
      {selected && (
        <span className="drive-row-check">
          <CheckIcon />
        </span>
      )}
    </button>
  );
}

// 파일 탭 본문(웹드라이브). 갤러리형과 리스트형 두 가지로 보여준다.
//  · 갤러리형: 폴더/일반 파일은 타일 중앙에 아이콘, 제목은 타일 아래.
//    이미지·영상은 타일을 썸네일로 채우고 제목을 타일 좌하단에 겹쳐 올린다.
//  · 리스트형: 왼쪽에 아이콘, 오른쪽에 제목.
// 보기 방식 전환은 스튜디오 툴킷 바의 아이콘이 맡는다.
//
// 선택 모드(selectionMode, 스튜디오 툴킷이 떠 있을 때)에서는 탭이 열기 대신
// 선택을 토글한다. 파일을 꾹 누르면 selectionMode가 아니어도 그 파일을
// 선택하며 진입한다(App.jsx에서 선택이 하나라도 있으면 툴킷이 자동으로 뜬다).
export default function FilesPage({
  session,
  viewMode,
  parentId,
  onOpenFolder,
  onOpenFile,
  refreshKey,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onLongPressItem,
  onItemsChange,
}) {
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [folderSizeMap, setFolderSizeMap] = useState({});
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
        onItemsChange?.(rows);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, parentId, refreshKey]);

  // 용량 표기가 켜진 폴더들의 용량을 받아 온다. 폴더는 자체 용량이 없어
  // 하위 파일을 재귀 합산해야 하므로 서버에 따로 물어본다.
  useEffect(() => {
    const folderIds = items.filter((it) => it.is_folder && it.info_revealed).map((it) => it.id);
    if (!folderIds.length) return;
    let cancelled = false;
    folderSizes(session.token, folderIds).then((sizes) => {
      if (!cancelled) setFolderSizeMap((prev) => ({ ...prev, ...sizes }));
    });
    return () => {
      cancelled = true;
    };
  }, [session.token, items]);

  const openOrToggle = (item) =>
    selectionMode ? onToggleSelect(item) : item.is_folder ? onOpenFolder(item) : onOpenFile(item);

  if (state === "loading") return <p className="drive-note">불러오는 중…</p>;
  if (state === "error") return <p className="drive-note">파일을 불러오지 못했습니다</p>;
  if (!items.length) return <p className="drive-note">아직 파일이 없습니다</p>;

  if (viewMode === "list") {
    return (
      <ul className="drive-list">
        {items.map((item) => (
          <li key={item.id}>
            <ListRow
              item={item}
              selected={selectionMode && selectedIds.has(item.id)}
              size={sizeLabel(item, item.info_revealed, folderSizeMap, true)}
              onTap={() => openOrToggle(item)}
              onLongPress={() => onLongPressItem(item)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="drive-grid">
      {items.map((item) => (
        <li key={item.id}>
          <GalleryTile
            item={item}
            thumb={item.thumb_key ? thumbs[item.thumb_key] : null}
            selected={selectionMode && selectedIds.has(item.id)}
            size={sizeLabel(item, item.info_revealed, folderSizeMap)}
            onTap={() => openOrToggle(item)}
            onLongPress={() => onLongPressItem(item)}
          />
        </li>
      ))}
    </ul>
  );
}
