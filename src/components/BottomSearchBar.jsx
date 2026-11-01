import { useEffect, useRef, useState } from "react";
import { BackIcon, EditIcon, FileIcon, SettingsIcon } from "./icons";
import HeaderMoreButton from "./HeaderMoreButton";
import SelectionMoreButton from "./SelectionMoreButton";
import Spinner from "./Spinner";

// 하단바 아이콘(단일 solid fill, currentColor)과 같은 방식으로 그린 돋보기 아이콘.
// 링은 두 원을 evenodd로 겹쳐 만든 진짜 구멍(반투명 색에서도 이중 톤이 생기지
// 않는다 — 겹치는 영역이 아니라 "안 칠해지는" 영역이라 알파가 쌓이지 않음)이고,
// 손잡이는 링 바깥 경계에 딱 맞닿게 배치해 링과 겹치는 면적이 생기지 않게 했다.
function SearchIcon({ size = 20 }) {
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

// 헤더 삼점 버튼의 "새 폴더" 아이콘과 같은 모양.
function FolderIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

// 예전 하단 내비바가 있던 자리에 고정된 하단바. position:fixed라 스크롤을 아무리 올리고 내려도
// 그 자리에서 전혀 움직이지 않는다. 위쪽 줄은 검색창, 아래쪽 줄은 업로드·새 폴더를 여는 원형
// + 버튼(HeaderMoreButton)이다.
//
// 배경·블러·그림자·둥근 모서리는 전부 바깥 껍데기 하나(.search-dock)가 맡는다. 삭제·이동·복사·
// 이름 바꾸기·새 폴더를 열면 이 독이 검색창 위로 확장되며 패널을 보여준다 — 취소 버튼은 없고,
// 하단바를 뺀 화면 어디를 눌러도 취소로 닫힌다(.search-bar-scrim, 열려 있는 동안 나머지 화면
// 전체에 같은 블러가 걸린다). 확인 버튼은 검색바 자신의 오른쪽 끝에 뜬다.
// 새 폴더·이름 바꾸기일 때는 검색창을 이름 입력창으로 재사용하고(돋보기 대신 연필 아이콘),
// 삭제·이동·복사처럼 입력창을 쓰지 않는 동안은 검색을 막도록 입력창 자체를 비활성화한다.
// 여러 상태 중 둘 이상 동시에 열릴 수는 없으므로(App.jsx가 하나를 열 때 나머지를 닫는다)
// 패널·검색바 내용물은 그때그때 하나만 그린다.
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
  onUpload,
  onNewFolder,
  canGoBack,
  onBack,
  hasSelection,
  onDeleteSelected,
  onMoveSelected,
  onCopySelected,
  onRenameSelected,
  onOpenSettings,
  renameOpen,
  renameName,
  onChangeRenameName,
  onConfirmRename,
  onCancelRename,
  moveOpen,
  moveMode = "move",
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
  const [moveBusy, setMoveBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const panelOpen = confirmOpen || newFolderOpen || renameOpen || moveOpen;

  // 검색바가 검색 대신 값을 입력받는 상태 — 새 폴더·이름 바꾸기.
  const textEntryOpen = newFolderOpen || renameOpen;
  // 입력창을 쓰지 않는 패널(삭제 확인·이동·복사)이 열려 있을 때는 검색바
  // 입력을 아예 비활성화한다 — 패널이 열려 있는 동안 검색어를 바꿔 지금 폴더
  // 목록 자체가 통째로 달라지는 걸 막기 위해서다.
  const inputDisabled = panelOpen && !textEntryOpen;
  const inputRef = useRef(null);

  // 패널이 닫히는 동안(max-height·opacity 트랜지션 0.25~0.35초)에도 DOM은
  // 그대로 남아 있는데, 내용을 live 플래그로 바로 판단하면 그 플래그가 이미
  // false로 바뀐 뒤라 다른 패널 문구로 순간 바뀌어 버린다. 그래서 실제로 열릴
  // 때만 갱신하고, 닫힐 때는 마지막 내용을 그대로 유지한다. ref는 렌더 중에
  // 곧바로 갱신되므로, live 플래그가 true로 바뀌는 바로 그 렌더에서 이미 새
  // 모드가 반영돼 "빈 패널" 한 프레임이 생기지 않는다.
  const liveMode = newFolderOpen
    ? "newFolder"
    : renameOpen
      ? "rename"
      : moveOpen
        ? "move"
        : confirmOpen
          ? "confirm"
          : null;
  const displayModeRef = useRef(liveMode ?? "confirm");
  if (liveMode !== null) displayModeRef.current = liveMode;
  const displayMode = displayModeRef.current;

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

  const textValue = newFolderOpen ? newFolderName : renameOpen ? renameName : searchQuery;
  const onTextChange = (value) => {
    if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (renameOpen) onChangeRenameName?.(value);
    else onSearch?.(value);
  };
  const submitText = () => (newFolderOpen ? submitFolder() : renameOpen ? submitRename() : undefined);
  const onCancelScrim = newFolderOpen
    ? onCancelNewFolder
    : renameOpen
      ? onCancelRename
      : moveOpen
        ? onCancelMove
        : onCancelDelete;

  // 패널이 열려 있어도 파일·폴더 타일을 "꾹 눌러"(또는 탭해) 선택을 켜거나
  // 끌 수 있어야 한다 — 패널을 계속 연 채로 대상을 더하거나 뺄 수 있게
  // 하기 위해서다. 스크림이 화면을 덮고 있어 진짜 포인터다운이 타일
  // 자신에게는 닿지 않으므로, 스크림에서 받은 실제 포인터다운·이동·업
  // 좌표를 그대로 타일에 합성 이벤트로 전달한다 — 그래야 타일의
  // useLongPress 훅이 원래와 똑같이 꾹 누른 시간을 재서 탭/꾹 누르기를
  // 구분할 수 있다(클릭만 흉내 내면 "짧게 탭"밖에 재현할 수 없어 꾹 누르기
  // 자체는 절대 발동하지 않는다).
  //
  // 포인터다운 시점에 찾은 그 타일 참조를 forwardTileRef에 그대로 들고
  // 있다가 이동·업도 같은 타일로 보낸다 — 도중에 좌표로 다시 찾지 않는다.
  // 포인터다운에서 이미 타일을 찾아 처리했다면, 뒤이은 click은 좌표를 다시
  // 확인하지 않고 그냥 건너뛴다(handledByPointerRef).
  const forwardTileRef = useRef(null);
  const handledByPointerRef = useRef(false);
  const dispatchToTile = (tile, type, e) => {
    tile.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: e.pointerId,
        pointerType: e.pointerType,
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
      })
    );
  };
  const stopForwardingToTile = () => {
    window.removeEventListener("pointermove", onForwardTileMove);
    window.removeEventListener("pointerup", onForwardTileUp);
    window.removeEventListener("pointercancel", onForwardTileUp);
    forwardTileRef.current = null;
  };
  function onForwardTileMove(e) {
    const tile = forwardTileRef.current;
    if (!tile) return;
    dispatchToTile(tile, "pointermove", e);
  }
  function onForwardTileUp(e) {
    const tile = forwardTileRef.current;
    stopForwardingToTile();
    if (!tile) return;
    dispatchToTile(tile, e.type === "pointercancel" ? "pointercancel" : "pointerup", e);
  }
  const handleScrimPointerDown = (e) => {
    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    const tile = stack.find((el) => el.classList?.contains("drive-tile-btn") || el.classList?.contains("drive-row"));
    if (!tile) return;
    forwardTileRef.current = tile;
    handledByPointerRef.current = true;
    dispatchToTile(tile, "pointerdown", e);
    window.addEventListener("pointermove", onForwardTileMove);
    window.addEventListener("pointerup", onForwardTileUp);
    window.addEventListener("pointercancel", onForwardTileUp);
  };
  // 패널이 닫히는 등으로 컴포넌트가 도중에 사라져도 걸어 둔 window 리스너가
  // 남지 않게 정리한다.
  useEffect(() => stopForwardingToTile, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 위 포인터다운에서 이미 타일을 찾아 눌러 처리했다면, 뒤이은 click은
  // 다시 좌표를 확인하지 않고 넘어간다(handledByPointerRef 설명 참고).
  // 그 외(포인터 이벤트를 못 쓰는 환경 등)에는 예전처럼 클릭 좌표로 타일을
  // 찾아 탭을 흉내 내고, 타일도 아니면 빈 자리를 눌렀다고 보고 취소한다.
  const handleScrimClick = (e) => {
    if (handledByPointerRef.current) {
      handledByPointerRef.current = false;
      return;
    }
    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    const tile = stack.find((el) => el.classList?.contains("drive-tile-btn") || el.classList?.contains("drive-row"));
    if (tile) {
      tile.click();
      return;
    }
    onCancelScrim?.();
  };

  // 검색바 아이콘은 이름을 입력받는 동안(새 폴더·이름 바꾸기) 돋보기 대신 연필 아이콘이 된다.
  const searchBarIcon = textEntryOpen ? <EditIcon size={20} /> : <SearchIcon />;

  return (
    <>
      {panelOpen && (
        <div className="search-bar-scrim is-blurred" onClick={handleScrimClick} onPointerDown={handleScrimPointerDown} />
      )}
      <div className="bottom-search-wrap">
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}`}>
          <div
            className={`search-bar-confirm-panel${displayMode === "move" ? " mode-move" : ""}${panelOpen ? " is-open" : ""}`}
            aria-hidden={!panelOpen}
          >
            <div className="search-bar-confirm-content" key={displayMode}>
              {displayMode === "newFolder" ? (
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">새 폴더</p>
              ) : displayMode === "rename" ? (
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">이름 바꾸기</p>
              ) : displayMode === "move" ? (
                <>
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">{moveMode === "copy" ? "복사" : "이동"}</p>
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
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">삭제</p>
                  <p className="search-bar-confirm-desc search-bar-confirm-desc--bottom">해당 항목은 휴지통에서 복구 및 삭제할 수 있습니다</p>
                </>
              )}
            </div>
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
              value={textValue}
              disabled={inputDisabled}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // 모바일 키보드의 "검색"/"완료" 확인 버튼도 엔터와 동일한 keydown을 발생시킨다.
                if (textEntryOpen) submitText();
                e.currentTarget.blur();
              }}
            />
            {panelOpen && (
              <button
                type="button"
                className="search-bar-inline-confirm"
                onClick={confirmOpen ? confirm : moveOpen ? submitMove : submitText}
                disabled={confirmOpen ? busy : moveOpen ? !canSubmitMove : renameOpen ? !canSubmitRename : !canSubmitFolder}
              >
                확인
              </button>
            )}
          </div>
          {/* 하단바 아래쪽 줄: 오른쪽 끝에 설정 버튼, 그 왼쪽에 원형 + 버튼(업로드·새 폴더). 파일·폴더를
              선택하는 동안은 + 버튼 자리를 선택 메뉴(삼점: 삭제·이동·복사·이름 바꾸기)가 대신 쓰고,
              선택이 풀리면(동작을 마치면 선택이 풀린다) 다시 + 버튼으로 돌아온다. 둘 다 누르면
              왼쪽으로 펼쳐진다. */}
          <div className="search-dock-actions">
            {/* 하위 폴더(또는 즐겨찾기 화면)에 들어와 있을 때만 왼쪽 끝에 뜨는 뒤로 가기. */}
            {canGoBack && (
              <button className="dock-back" type="button" aria-label="뒤로" onClick={onBack}>
                <BackIcon size={24} />
              </button>
            )}
            <HeaderMoreButton onUpload={onUpload} onNewFolder={onNewFolder} hidden={Boolean(hasSelection)} />
            <SelectionMoreButton
              visible={Boolean(hasSelection)}
              onDelete={onDeleteSelected}
              onMove={onMoveSelected}
              onCopy={onCopySelected}
              onRename={onRenameSelected}
            />
            {onOpenSettings && (
              <button className="header-settings" type="button" aria-label="설정" onClick={onOpenSettings}>
                <SettingsIcon size={19} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
