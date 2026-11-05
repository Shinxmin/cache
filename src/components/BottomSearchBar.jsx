import { useEffect, useRef, useState } from "react";
import { BackIcon, CheckIcon, DockBackIcon, DownloadIcon, EditIcon, FileIcon, SettingsIcon } from "./icons";
import HeaderMoreButton from "./HeaderMoreButton";
import SelectionMoreButton from "./SelectionMoreButton";
import CheckboxVisual from "./Checkbox";
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

// 접힌 하단바 가운데의 꺾쇠(⌄). 뒤로 가기 꺾쇠와 같은 두께 2의 선.
function ChevronDownIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M5.5 9 12 15.5 18.5 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
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
// 배경·블러·그림자·둥근 모서리는 전부 바깥 껍데기 하나(.search-dock)가 맡는다. 삭제·이동·
// 이름 바꾸기·새 폴더를 열면 이 독이 검색창 위로 확장되며 패널을 보여준다 — 취소 버튼은 없고,
// 하단바를 뺀 화면 어디를 눌러도 취소로 닫힌다(.search-bar-scrim, 열려 있는 동안 나머지 화면
// 전체에 같은 블러가 걸린다). 확인 버튼은 검색바 자신의 오른쪽 끝에 뜬다.
// 새 폴더·이름 바꾸기일 때는 검색창을 이름 입력창으로 재사용하고(돋보기 대신 연필 아이콘),
// 삭제·이동처럼 입력창을 쓰지 않는 동안은 검색을 막도록 입력창 자체를 비활성화한다.
// 여러 상태 중 둘 이상 동시에 열릴 수는 없으므로(App.jsx가 하나를 열 때 나머지를 닫는다)
// 패널·검색바 내용물은 그때그때 하나만 그린다.
export default function BottomSearchBar({
  inactive = false,
  // 파일 뷰어 위에 뜰 때: 검색바는 비활성, < 는 뷰어 닫기, 가운데는 다운로드, 오른쪽 끝은 설정 대신 선택 메뉴(삼점). 뷰어보다 위에 그려진다.
  viewerMode = false,
  // 휴지통처럼 일부 버튼만 막는 화면용: 설정/+ 버튼 비활성, 선택 메뉴 항목 교체, 선택 중에도 좌우 버튼(<·설정)을
  // 전체 선택/다운로드로 바꾸지 않기, 삭제 패널 제목 교체.
  settingsDisabled = false,
  plusDisabled = false,
  selectionActions,
  swapSideButtons = true,
  confirmTitle,
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
  onRenameSelected,
  onInfoSelected,
  infoLocked,
  infoLockDisabled,
  onToggleInfoLock,
  unlockOpen,
  unlockPw,
  onChangeUnlockPw,
  onConfirmUnlock,
  onCancelUnlock,
  allSelected,
  onToggleSelectAll,
  onDownloadSelected,
  onConfirmInfo,
  infoDisabled,
  infoOpen,
  infoLines,
  onCancelInfo,
  onOpenSettings,
  renameOpen,
  renameName,
  onChangeRenameName,
  onConfirmRename,
  onCancelRename,
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
  const [moveBusy, setMoveBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const selMode = hasSelection && !viewerMode;
  const panelOpen = confirmOpen || newFolderOpen || renameOpen || moveOpen || infoOpen || unlockOpen;

  // 검색바가 검색 대신 값을 입력받는 상태 — 새 폴더·이름 바꾸기.
  const textEntryOpen = newFolderOpen || renameOpen || infoOpen || unlockOpen;
  // 입력창을 쓰지 않는 패널(삭제 확인·이동)이 열려 있을 때는 검색바
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
    : unlockOpen
      ? "unlock"
      : renameOpen
      ? "rename"
      : infoOpen
        ? "info"
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

  const textValue = newFolderOpen ? newFolderName : unlockOpen ? unlockPw : renameOpen || infoOpen ? renameName : searchQuery;
  const onTextChange = (value) => {
    if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (unlockOpen) onChangeUnlockPw?.(value);
    else if (renameOpen || infoOpen) onChangeRenameName?.(value);
    else onSearch?.(value);
  };
  // 정보 패널의 검색바는 이름 입력창이다 — 기존 이름이 채워져 있고, 확인하면 이름이 바뀌었을 때만 바꾼다.
  const canSubmitInfo = Boolean(renameName?.trim()) && !renameBusy;
  const submitInfo = async () => {
    if (!canSubmitInfo) return;
    setRenameBusy(true);
    try {
      await onConfirmInfo();
    } finally {
      setRenameBusy(false);
    }
  };
  // 잠긴 항목의 암호 입력: 확인(엔터)하면 맞을 때만 열리고 틀리면 아무 일도 없다.
  const [unlockBusy, setUnlockBusy] = useState(false);
  const canSubmitUnlock = Boolean(unlockPw) && !unlockBusy;
  const submitUnlock = async () => {
    if (!canSubmitUnlock) return;
    setUnlockBusy(true);
    try {
      await onConfirmUnlock();
    } finally {
      setUnlockBusy(false);
    }
  };
  const submitText = () => (unlockOpen ? submitUnlock() : newFolderOpen ? submitFolder() : renameOpen ? submitRename() : infoOpen ? submitInfo() : undefined);
  const onCancelScrim = newFolderOpen
    ? onCancelNewFolder
    : unlockOpen
      ? onCancelUnlock
      : renameOpen
      ? onCancelRename
      : infoOpen
        ? onCancelInfo
        : moveOpen
        ? onCancelMove
        : onCancelDelete;

  // 패널이 열려 있는 동안 화면의 어느 곳을 눌러도(파일·폴더 타일 포함) 그 기능은 취소되고 하단바 패널이
  // 닫힌다. 타일을 눌러도 선택은 건드리지 않는다 — 열어 둔 기능의 대상(선택)이 도중에 바뀌지 않게 한다.
  const handleScrimClick = () => onCancelScrim?.();

  // 스크롤하는 동안 하단바를 가운데 작은 가로 알약(⌄만 보임)으로 접고, 스크롤이 멈추면(250ms 동안 스크롤
  // 이벤트가 없으면) 다시 펼친다. 패널이 열려 있거나 검색창에 입력 중일 때는 접지 않는다.
  const [scrolling, setScrolling] = useState(false);
  useEffect(() => {
    let timer = 0;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, []);
  const typing = typeof document !== "undefined" && document.activeElement === inputRef.current && inputRef.current != null;
  const collapsed = scrolling && !panelOpen && !typing;

  // 검색바 아이콘은 이름을 입력받는 동안(새 폴더·이름 바꾸기) 돋보기 대신 연필 아이콘이 된다.
  const searchBarIcon = textEntryOpen ? <EditIcon size={20} /> : <SearchIcon />;

  return (
    <>
      {panelOpen && (
        <div className={`search-bar-scrim is-blurred${viewerMode ? " is-elevated" : ""}`} onClick={handleScrimClick} />
      )}
      <div className={`bottom-search-wrap${viewerMode ? " is-elevated" : ""}`}>
        <div
          className={`search-dock${panelOpen ? " has-confirm" : ""}${collapsed ? " is-collapsed" : ""}${inactive ? " is-inactive" : ""}${viewerMode ? " is-viewer" : ""}`}
          onClick={(e) => {
            // 패널이 열려 있을 때 하단바 안의 빈 곳(제목·여백·버튼 사이)을 눌러도 바깥 빈 곳과 같이 취소한다.
            // 버튼·입력창·이동 목록처럼 실제로 눌리는 것은 제외.
            if (!panelOpen) return;
            if (e.target.closest("button, input, a, .move-list, .move-path")) return;
            onCancelScrim?.();
          }}
        >
          {/* 스크롤하는 동안 하단바가 접혀 가운데 작은 가로 알약이 되면 이 꺾쇠(⌄) 하나만 보인다. */}
          <span className="search-dock-collapsed-icon" aria-hidden="true">
            <ChevronDownIcon />
          </span>
          <div className="search-dock-body" aria-hidden={collapsed}>
          <div className="search-dock-body-inner">
          <div
            className={`search-bar-confirm-panel${displayMode === "move" ? " mode-move" : ""}${displayMode === "info" ? " mode-info" : ""}${panelOpen ? " is-open" : ""}`}
            aria-hidden={!panelOpen}
          >
            <div className="search-bar-confirm-content" key={displayMode}>
              {displayMode === "newFolder" ? (
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">새 폴더</p>
              ) : displayMode === "rename" ? (
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">이름 수정</p>
              ) : displayMode === "unlock" ? (
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">암호</p>
              ) : displayMode === "info" ? (
                <>
                  <div className="search-bar-confirm-title-row">
                    <p className="search-bar-confirm-title search-bar-confirm-title--studio">정보</p>
                    {/* 암호화: 제목 바로 오른쪽의 작은 체크박스. 통합 암호가 없으면 표준 비활성 디자인으로 흐려지고 눌리지 않는다. */}
                    <label className={`info-lock${infoLockDisabled ? " is-disabled" : ""}`}>
                      <span className="checkbox">
                        <input type="checkbox" checked={Boolean(infoLocked)} disabled={infoLockDisabled} onChange={() => onToggleInfoLock?.()} />
                        <CheckboxVisual />
                      </span>
                      <span className="info-lock-label">암호화</span>
                    </label>
                  </div>
                  {/* 삭제 패널 본문과 같은 글꼴·색·위치(패널 맨 아래 왼쪽)에서 시작하는 두 줄. */}
                  <div className="search-bar-confirm-info">
                    <p className="search-bar-confirm-desc">{infoLines?.[0] ?? "\u00a0"}</p>
                    <p className="search-bar-confirm-desc">{infoLines?.[1] ?? "\u00a0"}</p>
                  </div>
                </>
              ) : displayMode === "move" ? (
                <>
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">이동</p>
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
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">{confirmTitle ?? "삭제"}</p>
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
              type={unlockOpen ? "password" : textEntryOpen ? "text" : "search"}
              autoComplete={unlockOpen ? "off" : undefined}
              inputMode={textEntryOpen ? "text" : "search"}
              enterKeyHint={textEntryOpen ? "done" : "search"}
              placeholder={textEntryOpen ? "여기에 입력하세요" : "검색"}
              value={textValue}
              disabled={inputDisabled || ((inactive || viewerMode) && !panelOpen)}
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
                onClick={confirmOpen ? confirm : unlockOpen ? submitUnlock : infoOpen ? submitInfo : moveOpen ? submitMove : submitText}
                disabled={confirmOpen ? busy : unlockOpen ? !canSubmitUnlock : infoOpen ? !canSubmitInfo : moveOpen ? !canSubmitMove : renameOpen ? !canSubmitRename : !canSubmitFolder}
              >
                확인
              </button>
            )}
          </div>
          {/* 하단바 아래쪽 줄: 오른쪽 끝에 설정 버튼, 그 왼쪽에 원형 + 버튼(업로드·새 폴더). 파일·폴더를
              선택하는 동안은 + 버튼 자리를 선택 메뉴(삼점: 삭제·이동·정보)가 대신 쓰고,
              선택이 풀리면(동작을 마치면 선택이 풀린다) 다시 + 버튼으로 돌아온다. 둘 다 누르면
              왼쪽으로 펼쳐진다. */}
          <div className="search-dock-actions">
            {/* 왼쪽 끝 버튼: 파일·폴더를 선택하는 동안은 전체 선택/해제(체크 아이콘), 아니면 뒤로 가기.
                뒤로 가기는 최상위(홈)에서도 자리는 지키되 표준 비활성 투명도로 흐려지고 눌리지 않는다. */}
            {selMode && swapSideButtons ? (
              <button
                className="header-settings dock-back"
                type="button"
                aria-label={allSelected ? "전체 해제" : "전체 선택"}
                aria-pressed={Boolean(allSelected)}
                onClick={() => onToggleSelectAll?.(!allSelected)}
              >
                <CheckIcon size={18} strokeWidth={2.3} />
              </button>
            ) : (
              <button
                className="header-settings dock-back"
                type="button"
                aria-label="뒤로"
                disabled={!canGoBack}
                onClick={onBack}
              >
                <DockBackIcon />
              </button>
            )}
            {/* 가운데 버튼: 선택 중(기본)·뷰어 위에서는 다운로드, 아니면 +.
                휴지통처럼 좌우 버튼을 바꾸지 않는 화면(swapSideButtons=false)은 예전처럼 + 자리에 삼점이 온다. */}
            {(selMode && swapSideButtons) || viewerMode ? (
              <button className="header-settings" type="button" aria-label="다운로드" onClick={onDownloadSelected}>
                <DownloadIcon size={19} />
              </button>
            ) : selMode ? (
              <SelectionMoreButton
                visible
                actions={selectionActions}
                onDelete={onDeleteSelected}
                onMove={onMoveSelected}
                onInfo={onInfoSelected}
                infoDisabled={infoDisabled}
              />
            ) : (
              <HeaderMoreButton onUpload={onUpload} onNewFolder={onNewFolder} disabled={inactive || plusDisabled || viewerMode} />
            )}
            {/* 오른쪽 끝 버튼: 선택 중이거나 뷰어 위에서는 삼점(삭제·이동·정보), 아니면 설정. */}
            {(selMode && swapSideButtons) || viewerMode ? (
              <SelectionMoreButton
                visible
                actions={selectionActions}
                onDelete={onDeleteSelected}
                onMove={onMoveSelected}
                onInfo={onInfoSelected}
                infoDisabled={infoDisabled}
              />
            ) : (
              (onOpenSettings || inactive || settingsDisabled) && (
                <button className="header-settings" type="button" aria-label="설정" disabled={inactive || settingsDisabled} onClick={onOpenSettings}>
                  <SettingsIcon size={19} />
                </button>
              )
            )}
          </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
