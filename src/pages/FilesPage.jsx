import { useEffect, useRef, useState } from "react";
import { listFavorites, listFiles, searchFiles, thumbnailUrls } from "../lib/drive";
import { isOptimizableFile } from "../lib/optimize";
import { isSearchActive, parseSearchQuery } from "../lib/search";
import { CheckIcon, FileIcon, FolderIcon } from "../components/icons";
import { StarIcon } from "../components/toolkitIcons";
import Spinner from "../components/Spinner";
import useLongPress from "../hooks/useLongPress";

// 즐겨찾기된 항목은 이름 맨 앞(제일 왼쪽)에 작은 별로 표시한다.
function NameWithStar({ name, favorite, className }) {
  return (
    <span className={className}>
      {favorite && (
        <span className="drive-fav-star" aria-label="즐겨찾기">
          <StarIcon size={11} />
        </span>
      )}
      {name}
    </span>
  );
}

// 태그가 붙은 항목은 이름 밑(갤러리형)·오른쪽(리스트형)에 "#태그명"을
// 작은 글씨로 항상 표기한다. 용량은 타일에 표기하지 않는다 — 정보(i)
// 아이콘을 누르면 뜨는 정보 패널에서 선택 항목 전체의 용량·개수를 본다.
function tagLabel(item) {
  return item.tag ? `#${item.tag}` : null;
}

// 갤러리 타일 하나. 꾹 누르면 선택 모드로 들어가고(App.jsx가 스튜디오 툴킷을
// 띄운다), 선택된 동안은 눌린 것처럼 살짝 눌려 보이며 체크 배지가 뜬다.
function GalleryTile({ item, thumb, selected, tagText, onTap, onLongPress }) {
  const press = useLongPress(onTap, onLongPress);
  const optimizable = !item.is_folder && isOptimizableFile(item.name, item.mime);
  return (
    <button
      className={`drive-tile-btn${selected ? " selected" : ""}`}
      type="button"
      data-optimizable={optimizable ? "true" : "false"}
      {...press}
    >
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
            {tagText && <span className="drive-tile-overlay-size">{tagText}</span>}
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
            {tagText && <span className="drive-tile-size">{tagText}</span>}
          </span>
        </span>
      )}
    </button>
  );
}

function ListRow({ item, selected, tagText, onTap, onLongPress }) {
  const press = useLongPress(onTap, onLongPress);
  const optimizable = !item.is_folder && isOptimizableFile(item.name, item.mime);
  return (
    <button
      className={`drive-row${selected ? " selected" : ""}`}
      type="button"
      data-optimizable={optimizable ? "true" : "false"}
      {...press}
    >
      <span className="drive-row-icon">{item.is_folder ? <FolderIcon size={20} /> : <FileIcon size={20} />}</span>
      <span className="drive-row-text">
        <NameWithStar className="drive-row-name" name={item.name} favorite={item.favorite} />
        {tagText && <span className="drive-row-size">{tagText}</span>}
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
  onReady,
}) {
  const [items, setItems] = useState([]);
  const [thumbs, setThumbs] = useState({});
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
        onReady?.();

        // 썸네일 URL은 만료되는 presigned URL이라 목록을 받은 뒤 한 번에
        // 발급받는다 — 다만 이미 받아 둔 키는 다시 요청하지 않는다. 같은
        // 이미지인데도 매번 새 서명 URL로 바뀌면 <img src>가 달라져 브라우저가
        // 다시 그리면서 깜빡이기 때문이다. 폴더도 폴더 썸네일(정보 패널)로 지정한
        // folder_thumb_key가 있으면 파일과 똑같이 이 배치에 끼워 함께 받는다.
        const keys = rows.filter((r) => r.thumb_key || r.folder_thumb_key).map((r) => r.thumb_key || r.folder_thumb_key);
        const newKeys = keys.filter((k) => !thumbsRef.current[k]);
        if (newKeys.length) {
          const urls = await thumbnailUrls(session.token, newKeys);
          if (!cancelled) setThumbs((prev) => ({ ...prev, ...urls }));
        }
      } catch {
        if (!cancelled) {
          setState("error");
          onReady?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token, parentId, favorites, refreshKey, searchQuery]);

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
              tagText={tagLabel(item)}
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
            thumb={item.thumb_key ? thumbs[item.thumb_key] : item.folder_thumb_key ? thumbs[item.folder_thumb_key] : null}
            selected={selectionMode && selectedIds.has(item.id)}
            tagText={tagLabel(item)}
            onTap={() => openOrToggle(item)}
            onLongPress={() => onLongPressItem(item)}
          />
        </li>
      ))}
    </ul>
  );
}
