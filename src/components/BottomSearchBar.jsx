import { useEffect, useRef, useState } from "react";
import { BackIcon, ChevronRightIcon, FileIcon } from "./icons";
import Spinner from "./Spinner";
import { isOptimizableFile, OPTIMIZE_LEVELS, OPTIMIZE_LEVEL_LABELS } from "../lib/optimize";
import useSegmentDrag from "../hooks/useSegmentDrag";

// 하단바 아이콘(단일 solid fill, currentColor)과 같은 방식으로 그린 돋보기 아이콘.
// 링은 두 원을 evenodd로 겹쳐 만든 진짜 구멍(반투명 색에서도 이중 톤이 생기지
// 않는다 — 겹치는 영역이 아니라 "안 칠해지는" 영역이라 알파가 쌓이지 않음)이고,
// 손잡이는 링 바깥 경계에 딱 맞닿게 배치해 링과 겹치는 면적이 생기지 않게 했다.
function SearchIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M17 10A7 7 0 1 1 3 10a7 7 0 0 1 14 0Zm-2.8 0a4.2 4.2 0 1 0-8.4 0 4.2 4.2 0 0 0 8.4 0Z"
      />
      <rect fill="currentColor" x="17" y="8.7" width="6.5" height="2.6" rx="1.3" transform="rotate(45 10 10)" />
    </svg>
  );
}

// 스튜디오 툴킷의 이름 바꾸기(연필) 아이콘과 같은 모양. 이름 바꾸기·다중
// 이름 바꾸기 패널이 열려 검색바가 입력창으로 바뀌는 동안 돋보기 대신
// 이걸 보여준다.
function EditIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

// 헤더 삼점 버튼의 "새 폴더" 아이콘과 같은 모양.
function FolderIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

// 스튜디오 툴킷의 태그(북마크) 아이콘과 같은 모양.
function BookmarkIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

// 예전 하단 내비바가 있던 자리에 고정된 검색바. position:fixed라 스크롤을
// 아무리 올리고 내려도 그 자리에서 전혀 움직이지 않는다. 파일 화면(과 그
// 안에서 연 즐겨찾기 화면)에서 항상 떠 있다 — "검색바 항상 활성화" 설정은
// 없어졌고 이제 이게 유일한 동작이다.
//
// 배경·블러·그림자·둥근 모서리는 전부 바깥 껍데기 하나(.search-dock)가
// 맡는다 — 확인 문구(.search-bar-confirm-panel)와 검색창(.search-bar)은 그
// 안의 내용일 뿐, 각자 따로 유리 재질을 두르지 않는다. 스튜디오 툴킷의
// 삭제(휴지통)·이름 바꾸기(연필)·태그(#)·최적화(용량 압축)·이동 아이콘이나
// 헤더 삼점 버튼의 "새 폴더"를 누르면 이 패널이 검색창 위로 확장되며
// 제목(과 삭제·이동일 땐 안내 문구, 다중 이름 바꾸기·다중 태그·다중
// 최적화일 땐 이전·다음 화살표, 이동일 땐 폴더 목록)을 보여준다 — 취소
// 버튼은 없고, 검색바를 뺀 화면 어디를 눌러도 취소로 닫힌다
// (.search-bar-scrim). 확인 버튼은 패널이 아니라 검색바 자신의 오른쪽
// 끝에 뜬다 — 새 폴더·이름 바꾸기·태그일 때는 검색바의 돋보기·
// 플레이스홀더도 아이콘(연필 또는 #)·"여기에 입력하세요"로 바뀌어 그
// 입력창에 직접 값을 타이핑하고(별도 입력창을 새로 만들지 않는다), 삭제·
// 이동·최적화처럼 그 입력창을 쓰지 않는 패널이 열려 있을 땐 검색을 아예
// 막도록 입력창 자체를 비활성화한다. 다중 이름 바꾸기·다중 태그도 같은
// 입력창 하나를 화살표로 넘기며 재사용한다 — 그래서 몇 개를 고르든 패널
// 크기는 항상 같다. 최적화의 품질(낮음/중간/높음) 세그먼트는 패널이 아니라
// 검색바 자신의 확인 버튼 바로 왼쪽에 뜬다 — 단일이든 다중이든 항목마다
// 따로 고를 수 있고(다중은 이전·다음으로 넘기며), 검색바 입력창 자체는
// 쓰지 않는다. 여러 상태 중 둘 이상 동시에 열릴 수는 없으므로(App.jsx가
// 하나를 열 때 나머지를 닫는다) 패널·검색바 내용물은 그때그때 하나만
// 그린다.
export default function BottomSearchBar({
  searchQuery,
  onSearch,
  confirmOpen,
  onConfirmDelete,
  onCancelDelete,
  newFolderOpen,
  newFolderName,
  onChangeNewFolderName,
  onConfirmNewFolder,
  onCancelNewFolder,
  renameOpen,
  renameName,
  onChangeRenameName,
  onConfirmRename,
  onCancelRename,
  multiRenameOpen,
  multiRenameItems,
  multiRenameIndex,
  onChangeMultiRenameName,
  onPrevMultiRename,
  onNextMultiRename,
  onClearAllMultiRename,
  onApplyAllMultiRename,
  onAttachNumbersMultiRename,
  onConfirmMultiRename,
  onCancelMultiRename,
  tagOpen,
  tagValue,
  onChangeTagValue,
  onConfirmTag,
  onCancelTag,
  multiTagOpen,
  multiTagItems,
  multiTagIndex,
  onChangeMultiTagValue,
  onPrevMultiTag,
  onNextMultiTag,
  onClearAllMultiTag,
  onApplyAllMultiTag,
  onConfirmMultiTag,
  onCancelMultiTag,
  optimizeOpen,
  optimizeTargetName,
  optimizeLevel,
  onChangeOptimizeLevel,
  onConfirmOptimize,
  onCancelOptimize,
  multiOptimizeOpen,
  multiOptimizeItems,
  multiOptimizeIndex,
  onChangeMultiOptimizeLevel,
  onApplyAllMultiOptimize,
  onPrevMultiOptimize,
  onNextMultiOptimize,
  onConfirmMultiOptimize,
  onCancelMultiOptimize,
  moveOpen,
  moveItemCount,
  movePath,
  moveRows,
  moveRowsState,
  moveExcludedIds,
  onMoveInto,
  onMoveBack,
  onConfirmMove,
  onCancelMove,
}) {
  const [busy, setBusy] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [multiRenameBusy, setMultiRenameBusy] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [multiTagBusy, setMultiTagBusy] = useState(false);
  const [optimizeBusy, setOptimizeBusy] = useState(false);
  const [multiOptimizeBusy, setMultiOptimizeBusy] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);
  const panelOpen =
    confirmOpen ||
    newFolderOpen ||
    renameOpen ||
    multiRenameOpen ||
    tagOpen ||
    multiTagOpen ||
    optimizeOpen ||
    multiOptimizeOpen ||
    moveOpen;
  // 검색바가 검색 대신 값을 입력받는 상태(새 폴더·이름 바꾸기·다중 이름
  // 바꾸기·태그·다중 태그 다섯 다 공통).
  const textEntryOpen = newFolderOpen || renameOpen || multiRenameOpen || tagOpen || multiTagOpen;
  // 입력창을 쓰지 않는 패널(삭제 확인·이동·최적화)이 열려 있을 때는 검색바
  // 입력을 아예 비활성화한다 — 패널이 열려 있는 동안 검색어를 바꿔 지금
  // 폴더 목록 자체가 통째로 달라지는 걸 막기 위해서다.
  const inputDisabled = panelOpen && !textEntryOpen;
  const inputRef = useRef(null);

  // 패널이 닫히는 동안(max-height·opacity 트랜지션 0.25~0.35초)에도 DOM은
  // 그대로 남아 있는데, 내용을 live 플래그로 바로 판단하면 그 플래그가 이미
  // false로 바뀐 뒤라 다른 패널 문구로 순간 바뀌어 버린다 — 사라지는 패널
  // 위에 다른 문구가 잠깐 겹쳐 보이던 버그가 이것 때문이었다. 그래서 실제로
  // 열릴 때만 갱신하고, 닫힐 때는 마지막 내용을 그대로 유지한다.
  const resolveMode = () =>
    newFolderOpen
      ? "newFolder"
      : renameOpen
        ? "rename"
        : multiRenameOpen
          ? "multiRename"
          : tagOpen
            ? "tag"
            : multiTagOpen
              ? "multiTag"
              : optimizeOpen
                ? "optimize"
                : multiOptimizeOpen
                  ? "multiOptimize"
                  : moveOpen
                    ? "move"
                    : "confirm";
  const [displayMode, setDisplayMode] = useState(resolveMode);
  useEffect(() => {
    if (newFolderOpen) setDisplayMode("newFolder");
    else if (renameOpen) setDisplayMode("rename");
    else if (multiRenameOpen) setDisplayMode("multiRename");
    else if (tagOpen) setDisplayMode("tag");
    else if (multiTagOpen) setDisplayMode("multiTag");
    else if (optimizeOpen) setDisplayMode("optimize");
    else if (multiOptimizeOpen) setDisplayMode("multiOptimize");
    else if (moveOpen) setDisplayMode("move");
    else if (confirmOpen) setDisplayMode("confirm");
  }, [
    newFolderOpen,
    renameOpen,
    multiRenameOpen,
    tagOpen,
    multiTagOpen,
    optimizeOpen,
    multiOptimizeOpen,
    moveOpen,
    confirmOpen,
  ]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirmDelete();
    } finally {
      setBusy(false);
    }
  };

  const canSubmitFolder = Boolean(newFolderName?.trim()) && !folderBusy;
  const submitFolder = async () => {
    if (!canSubmitFolder) return;
    setFolderBusy(true);
    try {
      await onConfirmNewFolder();
    } finally {
      setFolderBusy(false);
    }
  };

  const canSubmitRename = Boolean(renameName?.trim()) && !renameBusy;
  const submitRename = async () => {
    if (!canSubmitRename) return;
    setRenameBusy(true);
    try {
      await onConfirmRename();
    } finally {
      setRenameBusy(false);
    }
  };

  const multiRenameCurrent = multiRenameItems?.[multiRenameIndex]?.name ?? "";
  const canSubmitMultiRename =
    Boolean(multiRenameItems?.length) && multiRenameItems.every((it) => it.name.trim().length > 0) && !multiRenameBusy;
  const submitMultiRename = async () => {
    if (!canSubmitMultiRename) return;
    setMultiRenameBusy(true);
    try {
      await onConfirmMultiRename();
    } finally {
      setMultiRenameBusy(false);
    }
  };

  // 태그는 이름과 달리 비어 있어도 유효한 값(태그를 지운다는 뜻)이라
  // 값이 없다고 확인을 막지 않는다.
  const canSubmitTag = !tagBusy;
  const submitTag = async () => {
    if (!canSubmitTag) return;
    setTagBusy(true);
    try {
      await onConfirmTag();
    } finally {
      setTagBusy(false);
    }
  };

  const multiTagCurrent = multiTagItems?.[multiTagIndex]?.tag ?? "";
  const canSubmitMultiTag = Boolean(multiTagItems?.length) && !multiTagBusy;
  const submitMultiTag = async () => {
    if (!canSubmitMultiTag) return;
    setMultiTagBusy(true);
    try {
      await onConfirmMultiTag();
    } finally {
      setMultiTagBusy(false);
    }
  };

  // 최적화는 이름·태그와 똑같은 단일/다중 구조를 쓴다 — 다만 고르는 값이
  // 품질 단계(낮음/중간/높음)라 검색바 입력창은 쓰지 않는다(삭제·이동과
  // 같은 부류). 캔버스로 못 읽는 확장자가 있으면 그 항목의 품질을 뭘로
  // 고르든 일부만 압축되는 애매한 결과라 확인 버튼 자체를 막는다.
  const isMultiOptimize = Boolean(multiOptimizeOpen);
  const multiOptimizeCurrent = multiOptimizeItems?.[multiOptimizeIndex];
  const hasUnsupportedOptimize = optimizeOpen
    ? Boolean(optimizeTargetName) && !isOptimizableFile(optimizeTargetName)
    : isMultiOptimize
      ? (multiOptimizeItems ?? []).some((it) => !isOptimizableFile(it.name))
      : false;
  // 검색바 옆으로 옮긴 품질 세그먼트가 지금 반영해야 하는 값·바꾸는 방법 —
  // 단일이면 optimizeLevel 하나, 다중이면 지금 보고 있는(multiOptimizeIndex
  // 번째) 항목의 값이다.
  const currentOptimizeLevel = optimizeOpen ? optimizeLevel : isMultiOptimize ? (multiOptimizeCurrent?.level ?? 1) : 1;
  const changeCurrentOptimizeLevel = (level) => {
    if (optimizeOpen) onChangeOptimizeLevel?.(level);
    else if (isMultiOptimize) onChangeMultiOptimizeLevel?.(level);
  };
  // 품질 세그먼트를 탭뿐 아니라 마우스 드래그·손가락 슬라이드로도 고를 수
  // 있게 한다.
  const optimizeSegDrag = useSegmentDrag(OPTIMIZE_LEVELS.length, changeCurrentOptimizeLevel);
  const canSubmitOptimize = Boolean(optimizeTargetName) && !hasUnsupportedOptimize && !optimizeBusy;
  const submitOptimize = async () => {
    if (!canSubmitOptimize) return;
    setOptimizeBusy(true);
    try {
      await onConfirmOptimize();
    } finally {
      setOptimizeBusy(false);
    }
  };
  const canSubmitMultiOptimize = Boolean(multiOptimizeItems?.length) && !hasUnsupportedOptimize && !multiOptimizeBusy;
  const submitMultiOptimize = async () => {
    if (!canSubmitMultiOptimize) return;
    setMultiOptimizeBusy(true);
    try {
      await onConfirmMultiOptimize();
    } finally {
      setMultiOptimizeBusy(false);
    }
  };

  // 이동은 태그처럼 비어 있어도(최상위로 옮기는 것도 유효한 목적지라)
  // 확인을 막지 않는다 — 옮길 대상이 하나 이상 있기만 하면 된다.
  const canSubmitMove = Boolean(moveItemCount) && !moveBusy;
  const submitMove = async () => {
    if (!canSubmitMove) return;
    setMoveBusy(true);
    try {
      await onConfirmMove();
    } finally {
      setMoveBusy(false);
    }
  };
  // 이동 패널의 폴더 목록에서, 지금 옮기는 중인 항목 자신은 목적지가 될 수
  // 없다(자기 안으로 들어가면 그 가지가 트리에서 떨어져 나간다). 서버도
  // 막지만 목록에서 미리 눌리지 않게 해 둔다.
  const moveExcluded = moveExcludedIds ?? new Set();

  // 다중 이름 바꾸기·다중 태그는 검색바 입력창 하나를 이전·다음 화살표로
  // 넘기며 재사용한다 — 아래는 둘 중 열려 있는 쪽 기준의 공통 값들.
  const isMultiRename = Boolean(multiRenameOpen);
  const isMultiTag = Boolean(multiTagOpen);
  const multiIndex = isMultiRename ? multiRenameIndex : isMultiTag ? multiTagIndex : 0;
  const multiItems = isMultiRename ? multiRenameItems : isMultiTag ? multiTagItems : [];
  const isLastMultiItem = multiIndex >= (multiItems?.length ?? 1) - 1;
  const onPrevMulti = isMultiRename ? onPrevMultiRename : onPrevMultiTag;
  const onNextMulti = isMultiRename ? onNextMultiRename : onNextMultiTag;

  const textValue = newFolderOpen
    ? newFolderName
    : renameOpen
      ? renameName
      : multiRenameOpen
        ? multiRenameCurrent
        : tagOpen
          ? tagValue
          : multiTagOpen
            ? multiTagCurrent
            : searchQuery;
  const onTextChange = (value) => {
    if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (renameOpen) onChangeRenameName?.(value);
    else if (multiRenameOpen) onChangeMultiRenameName?.(value);
    else if (tagOpen) onChangeTagValue?.(value);
    else if (multiTagOpen) onChangeMultiTagValue?.(value);
    else onSearch?.(value);
  };
  const canSubmitText = newFolderOpen
    ? canSubmitFolder
    : renameOpen
      ? canSubmitRename
      : multiRenameOpen
        ? canSubmitMultiRename
        : tagOpen
          ? canSubmitTag
          : multiTagOpen
            ? canSubmitMultiTag
            : true;
  const submitText = () => {
    if (newFolderOpen) return submitFolder();
    if (renameOpen) return submitRename();
    if (multiRenameOpen) return submitMultiRename();
    if (tagOpen) return submitTag();
    if (multiTagOpen) return submitMultiTag();
    return confirm();
  };
  const onCancelScrim = newFolderOpen
    ? onCancelNewFolder
    : renameOpen
      ? onCancelRename
      : multiRenameOpen
        ? onCancelMultiRename
        : tagOpen
          ? onCancelTag
          : multiTagOpen
            ? onCancelMultiTag
            : optimizeOpen
              ? onCancelOptimize
              : multiOptimizeOpen
                ? onCancelMultiOptimize
                : moveOpen
                  ? onCancelMove
                  : onCancelDelete;

  // 스크림이 화면 전체를 덮으면 그 밑에 있는 스튜디오 툴킷 아이콘 줄도
  // 가려져서, 아이콘을 누르는 것도(패널 전환) 좌우로 드래그해 넘치는
  // 아이콘을 보는 것도 안 됐다. 그래서 스크림을 통짜 사각형 하나 대신
  // 툴킷 아이콘 줄의 실제 위치만큼 구멍을 낸 네 조각(위·아래·왼쪽·오른쪽)
  // 으로 나눠 그린다 — 그 구멍 안에서는 스크림이 아예 존재하지 않으므로
  // 클릭도 드래그 스크롤도 진짜 그 아이콘 줄(.studio-toolkit-icons)에 직접
  // 닿는다. 나머지 자리(뒤로가기·더보기·설정·전체 선택 체크박스 포함)는
  // 그대로 스크림이 덮어 취소로 처리된다.
  const [scrimHole, setScrimHole] = useState(null);
  useEffect(() => {
    if (!panelOpen) {
      setScrimHole(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(".studio-toolkit-icons");
      setScrimHole(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [panelOpen]);

  // 패널이 열려 있어도 파일·폴더 타일을 탭하면(스크림에 가려져 있어도)
  // 취소 대신 그 타일의 선택을 켜거나 끈다 — 패널을 계속 연 채로 대상을
  // 더하거나 뺄 수 있게 하기 위해서다. elementsFromPoint로 클릭 지점의
  // 실제 요소 스택을 살펴 타일(.drive-tile-btn/.drive-row)이 있으면 그
  // 버튼을 대신 눌러준다(App.jsx의 선택 상태가 바뀌면 열려 있던 패널이
  // 알아서 새 선택에 맞게 다시 계산된다). 타일이 아닌 빈 자리를 눌렀을
  // 때만 원래대로 취소로 처리된다.
  const handleScrimClick = (e) => {
    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    const tile = stack.find((el) => el.classList?.contains("drive-tile-btn") || el.classList?.contains("drive-row"));
    if (tile) {
      tile.click();
      return;
    }
    onCancelScrim?.();
  };

  // 검색바 아이콘은 삭제 패널만 빼고, 그 패널을 연 툴킷 아이콘과 똑같은
  // 모양으로 바뀐다(새 폴더→폴더, 이름 바꾸기→연필, 태그→북마크).
  const isTagMode = tagOpen || multiTagOpen;
  const searchBarIcon = !textEntryOpen ? (
    <SearchIcon />
  ) : newFolderOpen ? (
    <FolderIcon />
  ) : isTagMode ? (
    <BookmarkIcon />
  ) : (
    <EditIcon />
  );

  return (
    <>
      {panelOpen &&
        (scrimHole ? (
          <>
            {scrimHole.top > 0 && (
              <div
                className="search-bar-scrim"
                style={{ top: 0, left: 0, right: 0, bottom: "auto", height: scrimHole.top }}
                onClick={handleScrimClick}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.bottom, left: 0, right: 0, bottom: 0, height: "auto" }}
              onClick={handleScrimClick}
            />
            {scrimHole.left > 0 && (
              <div
                className="search-bar-scrim"
                style={{ top: scrimHole.top, left: 0, right: "auto", bottom: "auto", width: scrimHole.left, height: scrimHole.bottom - scrimHole.top }}
                onClick={handleScrimClick}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.top, left: scrimHole.right, right: 0, bottom: "auto", height: scrimHole.bottom - scrimHole.top }}
              onClick={handleScrimClick}
            />
          </>
        ) : (
          <div className="search-bar-scrim" onClick={handleScrimClick} />
        ))}
      <div className="bottom-search-wrap">
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}`}>
          <div
            className={`search-bar-confirm-panel${displayMode === "optimize" || displayMode === "multiOptimize" ? " mode-optimize" : ""}${displayMode === "move" ? " mode-move" : ""}${panelOpen ? " is-open" : ""}`}
            aria-hidden={!panelOpen}
          >
            {displayMode === "newFolder" ? (
              <p className="search-bar-confirm-title">새 폴더</p>
            ) : displayMode === "rename" ? (
              <p className="search-bar-confirm-title">이름 바꾸기</p>
            ) : displayMode === "tag" ? (
              <p className="search-bar-confirm-title">태그</p>
            ) : displayMode === "multiRename" || displayMode === "multiTag" ? (
              <>
                <div className="search-bar-confirm-title-row">
                  <p className="search-bar-confirm-title">{displayMode === "multiRename" ? "이름 바꾸기" : "태그"}</p>
                  <div className="search-bar-confirm-nav">
                    <button
                      type="button"
                      className="search-bar-confirm-nav-btn search-bar-confirm-nav-btn--prev"
                      aria-label="이전 항목"
                      onClick={onPrevMulti}
                      disabled={multiIndex <= 0}
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                    <span className="search-bar-confirm-nav-count">
                      {multiIndex + 1}/{multiItems?.length ?? 0}
                    </span>
                    <button
                      type="button"
                      className="search-bar-confirm-nav-btn"
                      aria-label="다음 항목"
                      onClick={onNextMulti}
                      disabled={isLastMultiItem}
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                  </div>
                </div>
                <div className="search-bar-confirm-bulk-actions">
                  <button
                    type="button"
                    className="search-bar-confirm-bulk-btn"
                    onClick={displayMode === "multiRename" ? onClearAllMultiRename : onClearAllMultiTag}
                  >
                    전체 지우기
                  </button>
                  <button
                    type="button"
                    className="search-bar-confirm-bulk-btn"
                    onClick={displayMode === "multiRename" ? onApplyAllMultiRename : onApplyAllMultiTag}
                  >
                    전체 적용
                  </button>
                  {displayMode === "multiRename" && (
                    <button type="button" className="search-bar-confirm-bulk-btn" onClick={onAttachNumbersMultiRename}>
                      번호 붙이기
                    </button>
                  )}
                </div>
              </>
            ) : displayMode === "optimize" || displayMode === "multiOptimize" ? (
              <>
                {displayMode === "multiOptimize" ? (
                  <>
                    <div className="search-bar-confirm-title-row">
                      <p className="search-bar-confirm-title">최적화</p>
                      <div className="search-bar-confirm-nav">
                        <button
                          type="button"
                          className="search-bar-confirm-nav-btn search-bar-confirm-nav-btn--prev"
                          aria-label="이전 항목"
                          onClick={onPrevMultiOptimize}
                          disabled={multiOptimizeIndex <= 0}
                        >
                          <ChevronRightIcon size={14} />
                        </button>
                        <span className="search-bar-confirm-nav-count">
                          {multiOptimizeIndex + 1}/{multiOptimizeItems?.length ?? 0}
                        </span>
                        <button
                          type="button"
                          className="search-bar-confirm-nav-btn"
                          aria-label="다음 항목"
                          onClick={onNextMultiOptimize}
                          disabled={multiOptimizeIndex >= (multiOptimizeItems?.length ?? 1) - 1}
                        >
                          <ChevronRightIcon size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="search-bar-confirm-bulk-actions">
                      {/* 지금 보고 있는 항목의 품질을 자신과 뒤에 남은 항목에만
                          적용한다 — 앞서 따로 골라 둔 항목은 그대로 둔다. */}
                      <button type="button" className="search-bar-confirm-bulk-btn" onClick={onApplyAllMultiOptimize}>
                        전체 적용
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="search-bar-confirm-title">최적화</p>
                )}
                {hasUnsupportedOptimize && (
                  <p className="search-bar-confirm-optimize-warn">지원하지 않는 확장자를 가진 파일이 있습니다</p>
                )}
              </>
            ) : displayMode === "move" ? (
              <>
                <p className="search-bar-confirm-title">이동</p>
                <p className="search-bar-confirm-desc">{moveItemCount}개 파일</p>
                {movePath.length > 0 && (
                  <div className="move-path">
                    <button type="button" className="move-path-back" aria-label="상위 폴더로" onClick={onMoveBack}>
                      <BackIcon size={16} />
                    </button>
                    <span className="move-path-name">{movePath[movePath.length - 1].name}</span>
                  </div>
                )}
                <ul className="move-list">
                  {moveRowsState === "loading" ? (
                    <li className="move-note">
                      <Spinner />
                    </li>
                  ) : moveRowsState === "error" ? (
                    <li className="move-note">불러오지 못했습니다</li>
                  ) : moveRows.length === 0 ? (
                    <li className="move-note">이 폴더는 비어 있습니다</li>
                  ) : (
                    moveRows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="move-row"
                          disabled={!row.is_folder || moveExcluded.has(row.id)}
                          onClick={() => onMoveInto?.(row)}
                        >
                          <span className="move-row-icon">
                            {row.is_folder ? <FolderIcon size={16} /> : <FileIcon size={16} />}
                          </span>
                          <span className="move-row-name">{row.name}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            ) : (
              <>
                <p className="search-bar-confirm-title">선택한 파일을 삭제하시겠습니까?</p>
                <p className="search-bar-confirm-desc">해당 항목은 휴지통에서 복구 및 삭제할 수 있습니다</p>
              </>
            )}
          </div>
          <div className="search-bar">
            <span className="search-bar-icon">{searchBarIcon}</span>
            {/* 패널이 열릴 때 여기에 자동으로 포커스를 주지 않는다 — 모바일에서
                패널이 뜨자마자 키패드까지 같이 올라오는 걸 막기 위해서다. 직접
                입력창을 탭해야 키패드가 뜬다. */}
            <input
              ref={inputRef}
              className="search-bar-input"
              type={textEntryOpen ? "text" : "search"}
              inputMode={textEntryOpen ? "text" : "search"}
              enterKeyHint={textEntryOpen ? "done" : "search"}
              placeholder={textEntryOpen ? "여기에 입력하세요" : "검색"}
              maxLength={isTagMode ? 24 : undefined}
              value={textValue}
              disabled={inputDisabled}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // 다중 이름 바꾸기·다중 태그는 엔터로 다음 항목으로 넘어가고,
                // 마지막 항목에서만 엔터가 곧 확인이 된다.
                if ((isMultiRename || isMultiTag) && !isLastMultiItem) {
                  onNextMulti?.();
                  return;
                }
                // 모바일 키보드의 "검색"/"완료" 확인 버튼도 엔터와 동일한 keydown을 발생시킨다.
                if (textEntryOpen) submitText();
                e.currentTarget.blur();
              }}
            />
            {(optimizeOpen || multiOptimizeOpen) && (
              <div className="search-bar-optimize-seg-group" role="group" aria-label="압축 비율" {...optimizeSegDrag}>
                {OPTIMIZE_LEVELS.map((pct, i) => (
                  <button
                    key={pct}
                    type="button"
                    className={`search-bar-optimize-seg${currentOptimizeLevel === i ? " active" : ""}`}
                    aria-pressed={currentOptimizeLevel === i}
                    onClick={() => changeCurrentOptimizeLevel(i)}
                  >
                    {OPTIMIZE_LEVEL_LABELS[i]}
                  </button>
                ))}
              </div>
            )}
            {panelOpen && (
              <button
                type="button"
                className="search-bar-inline-confirm"
                onClick={
                  confirmOpen
                    ? confirm
                    : optimizeOpen
                      ? submitOptimize
                      : multiOptimizeOpen
                        ? submitMultiOptimize
                        : moveOpen
                          ? submitMove
                          : submitText
                }
                disabled={
                  confirmOpen
                    ? busy
                    : optimizeOpen
                      ? !canSubmitOptimize
                      : multiOptimizeOpen
                        ? !canSubmitMultiOptimize
                        : moveOpen
                          ? !canSubmitMove
                          : !canSubmitText
                }
              >
                확인
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
