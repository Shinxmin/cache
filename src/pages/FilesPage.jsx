import { useEffect, useRef, useState } from "react";
import { folderSizes, listFavorites, listFiles, searchFiles, thumbnailUrls } from "../lib/drive";
import { formatBytes } from "../lib/format";
import { isSearchActive, parseSearchQuery } from "../lib/search";
import { CheckIcon, FileIcon, FolderIcon } from "../components/icons";
import { StarIcon } from "../components/toolkitIcons";
import Spinner from "../components/Spinner";
import useLongPress from "../hooks/useLongPress";

// 즐겨찾기된 항목은 제목 바로 오른쪽에 작은 별로 표시한다.
function NameWithStar({ name, favorite, className }) {
  return (
    <span className={className}>
      {name}
      {favorite && (
        <span className="drive-fav-star" aria-label="즐겨찾기">
          <StarIcon size={11} />
        </span>
      )}
    </span>
  );
}

// 정보(i) 아이콘으로 그 항목의 용량 표기를 켰을 때만(item.info_revealed가
// true일 때만) 밑에 보여줄 용량 문구. 블러와 마찬가지로 서버에 저장돼 있어
// 선택을 풀거나 새로고침·재접속해도 계속 표기된 채로 남는다.
// 폴더는 재귀 합산 값이 folderSizeMap에 도착해야 나오고(그 전엔 로딩 중이라
// 아무것도 안 보여준다), 파일은 이미 목록에 들어 있는 size를 바로 쓴다.
// 태그가 붙어 있으면 그 옆에 "#태그명"처럼 덧붙인다.
function sizeLabel(item, revealed, folderSizeMap) {
  if (!revealed) return null;
  const size = item.is_folder ? folderSizeMap[item.id] : item.size;
  if (item.is_folder && size === undefined) return null;
  const text = formatBytes(size);
  return item.tag ? `${text} #${item.tag}` : text;
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
            <NameWithStar className="drive-tile-overlay-title" name={item.name} favorite={item.favorite} />
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
            <NameWithStar className="drive-tile-name" name={item.name} favorite={item.favorite} />
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
        <NameWithStar className="drive-row-name" name={item.name} favorite={item.favorite} />
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
  favorites = false,
  searchQuery,
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
  const thumbsRef = useRef(thumbs);
  thumbsRef.current = thumbs;
  const prevParentIdRef = useRef(parentId);
  const prevSearchActiveRef = useRef(false);
  const searching = isSearchActive(searchQuery ?? "");

  useEffect(() => {
    let cancelled = false;
    // 검색을 새로 시작하거나(폴더 목록 → 검색 결과) 끝낼 때(검색 결과 →
    // 지금 폴더), 또는 검색 중이 아닐 때 실제로 폴더를 옮기면 "불러오는
    // 중…" 화면으로 갈아치운다. 반면 검색어를 한 글자씩 이어 치는 동안이나
    // 같은 폴더에서 태그·정보표시 등 사소한 변경으로 refreshKey만 바뀌었을
    // 땐 이미 떠 있는 화면을 그대로 둔 채 조용히 데이터만 바꿔치기한다 —
    // 안 그러면 실시간 검색인데도 매 타이핑마다 화면이 깜빡이게 된다.
    // favorites(즐겨찾기 화면)는 폴더 대신 즐겨찾기 목록을 보여주는 또 하나의
    // "폴더"처럼 취급한다 — 들어가고 나갈 때 폴더를 옮긴 것과 같이 갈아치운다.
    const sourceKey = favorites ? "favorites" : parentId;
    const changedFolder = !searching && (prevSearchActiveRef.current || prevParentIdRef.current !== sourceKey);
    const enteredSearch = searching && !prevSearchActiveRef.current;
    prevParentIdRef.current = sourceKey;
    prevSearchActiveRef.current = searching;
    if (changedFolder || enteredSearch) {
      setState("loading");
      setItems([]);
      setThumbs({});
    }

    const { name, tag } = parseSearchQuery(searchQuery ?? "");

    (async () => {
      try {
        let rows = searching
          ? await searchFiles(session.token, { name, tag })
          : favorites
            ? await listFavorites(session.token)
            : await listFiles(session.token, parentId);
        // 즐겨찾기 화면 안에서 검색하면 전체 드라이브가 아니라 즐겨찾기된
        // 파일·폴더로만 한정한다(search_files 자체는 전체를 뒤지므로 여기서 거른다).
        if (searching && favorites) rows = rows.filter((r) => r.favorite);
        if (cancelled) return;
        setItems(rows);
        setState("ready");
        onItemsChange?.(rows);

        // 썸네일 URL은 만료되는 presigned URL이라 목록을 받은 뒤 한 번에
        // 발급받는다 — 다만 이미 받아 둔 키는 다시 요청하지 않는다. 같은
        // 이미지인데도 매번 새 서명 URL로 바뀌면 <img src>가 달라져 브라우저가
        // 다시 그리면서 깜빡이기 때문이다.
        const keys = rows.filter((r) => r.thumb_key).map((r) => r.thumb_key);
        const newKeys = keys.filter((k) => !thumbsRef.current[k]);
        if (newKeys.length) {
          const urls = await thumbnailUrls(session.token, newKeys);
          if (!cancelled) setThumbs((prev) => ({ ...prev, ...urls }));
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, parentId, favorites, refreshKey, searchQuery]);

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

  if (state === "loading") return <p className="drive-note"><Spinner /></p>;
  if (state === "error") return <p className="drive-note">파일을 불러오지 못했습니다</p>;
  if (!items.length) {
    return (
      <p className="drive-note">
        {searching ? "검색 결과가 없습니다" : favorites ? "즐겨찾기한 항목이 없습니다" : "아직 파일이 없습니다"}
      </p>
    );
  }

  if (viewMode === "list") {
    return (
      <ul className="drive-list">
        {items.map((item) => (
          <li key={item.id}>
            <ListRow
              item={item}
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
