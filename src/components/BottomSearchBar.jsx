import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "./icons";

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

// 스튜디오 툴킷의 이름 바꾸기(연필) 아이콘과 같은 모양. 새 폴더·이름 바꾸기
// 패널이 열려 검색바가 이름 입력창으로 바뀌는 동안 돋보기 대신 이걸 보여준다.
function EditIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
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
// 삭제(휴지통)·이름 바꾸기(연필) 아이콘이나 헤더 삼점 버튼의 "새 폴더"를
// 누르면 이 패널이 검색창 위로 확장되며 제목(과 삭제일 땐 안내 문구, 다중
// 이름 바꾸기일 땐 이전·다음 화살표 + 일괄 처리 버튼)을 보여준다 — 취소
// 버튼은 없고, 검색바를 뺀 화면 어디를 눌러도 취소로 닫힌다(.search-bar-scrim).
// 확인 버튼은 패널이 아니라 검색바 자신의 오른쪽 끝에 뜬다 — 새 폴더·이름
// 바꾸기일 때는 검색바의 돋보기·플레이스홀더도 연필 아이콘·"여기에
// 입력하세요"로 바뀌어 그 입력창에 직접 값을 타이핑한다(별도 입력창을 새로
// 만들지 않는다). 다중 이름 바꾸기도 같은 입력창 하나를 화살표로 넘기며
// 재사용한다 — 그래서 몇 개를 고르든 패널 크기는 항상 같다. 넷 중 둘 이상
// 동시에 열릴 수는 없으므로(App.jsx가 하나를 열 때 나머지를 닫는다) 패널·
// 검색바 내용물은 그때그때 하나만 그린다.
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
}) {
  const [busy, setBusy] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [multiRenameBusy, setMultiRenameBusy] = useState(false);
  const panelOpen = confirmOpen || newFolderOpen || renameOpen || multiRenameOpen;
  // 검색바가 검색 대신 이름을 입력받는 상태(새 폴더·이름 바꾸기·다중 이름
  // 바꾸기 셋 다 공통).
  const textEntryOpen = newFolderOpen || renameOpen || multiRenameOpen;
  const inputRef = useRef(null);

  // 패널이 닫히는 동안(max-height·opacity 트랜지션 0.25~0.35초)에도 DOM은
  // 그대로 남아 있는데, 내용을 live 플래그로 바로 판단하면 그 플래그가 이미
  // false로 바뀐 뒤라 다른 패널 문구로 순간 바뀌어 버린다 — 사라지는 패널
  // 위에 다른 문구가 잠깐 겹쳐 보이던 버그가 이것 때문이었다. 그래서 실제로
  // 열릴 때만 갱신하고, 닫힐 때는 마지막 내용을 그대로 유지한다.
  const initialMode = newFolderOpen ? "newFolder" : renameOpen ? "rename" : multiRenameOpen ? "multiRename" : "confirm";
  const [displayMode, setDisplayMode] = useState(initialMode);
  useEffect(() => {
    if (newFolderOpen) setDisplayMode("newFolder");
    else if (renameOpen) setDisplayMode("rename");
    else if (multiRenameOpen) setDisplayMode("multiRename");
    else if (confirmOpen) setDisplayMode("confirm");
  }, [newFolderOpen, renameOpen, multiRenameOpen, confirmOpen]);

  // 검색바 입력창은 늘 같은 DOM 노드라 textEntryOpen이 켜질 때 autoFocus는
  // 다시 발동하지 않는다(마운트 시 한 번뿐) — 그래서 열릴 때마다 직접 포커스한다.
  useEffect(() => {
    if (textEntryOpen) inputRef.current?.focus();
  }, [textEntryOpen]);

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
  const isLastMultiRenameItem = multiRenameIndex >= (multiRenameItems?.length ?? 1) - 1;

  const textValue = newFolderOpen
    ? newFolderName
    : renameOpen
      ? renameName
      : multiRenameOpen
        ? multiRenameCurrent
        : searchQuery;
  const onTextChange = (value) => {
    if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (renameOpen) onChangeRenameName?.(value);
    else if (multiRenameOpen) onChangeMultiRenameName?.(value);
    else onSearch?.(value);
  };
  const canSubmitText = newFolderOpen ? canSubmitFolder : renameOpen ? canSubmitRename : multiRenameOpen ? canSubmitMultiRename : true;
  const submitText = () => {
    if (newFolderOpen) return submitFolder();
    if (renameOpen) return submitRename();
    if (multiRenameOpen) return submitMultiRename();
    return confirm();
  };
  const onCancelScrim = newFolderOpen
    ? onCancelNewFolder
    : renameOpen
      ? onCancelRename
      : multiRenameOpen
        ? onCancelMultiRename
        : onCancelDelete;

  return (
    <>
      {panelOpen && <div className="search-bar-scrim" onClick={onCancelScrim} />}
      <div className="bottom-search-wrap">
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}`}>
          <div className={`search-bar-confirm-panel${panelOpen ? " is-open" : ""}`} aria-hidden={!panelOpen}>
            {displayMode === "newFolder" ? (
              <p className="search-bar-confirm-title">새 폴더</p>
            ) : displayMode === "rename" ? (
              <p className="search-bar-confirm-title">이름 바꾸기</p>
            ) : displayMode === "multiRename" ? (
              <>
                <div className="search-bar-confirm-title-row">
                  <p className="search-bar-confirm-title">이름 바꾸기</p>
                  <div className="search-bar-confirm-nav">
                    <button
                      type="button"
                      className="search-bar-confirm-nav-btn search-bar-confirm-nav-btn--prev"
                      aria-label="이전 항목"
                      onClick={onPrevMultiRename}
                      disabled={multiRenameIndex <= 0}
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                    <span className="search-bar-confirm-nav-count">
                      {multiRenameIndex + 1}/{multiRenameItems?.length ?? 0}
                    </span>
                    <button
                      type="button"
                      className="search-bar-confirm-nav-btn"
                      aria-label="다음 항목"
                      onClick={onNextMultiRename}
                      disabled={isLastMultiRenameItem}
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                  </div>
                </div>
                <div className="search-bar-confirm-bulk-actions">
                  <button type="button" className="search-bar-confirm-bulk-btn" onClick={onClearAllMultiRename}>
                    전체 지우기
                  </button>
                  <button type="button" className="search-bar-confirm-bulk-btn" onClick={onApplyAllMultiRename}>
                    전체 적용
                  </button>
                  <button type="button" className="search-bar-confirm-bulk-btn" onClick={onAttachNumbersMultiRename}>
                    번호 붙이기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="search-bar-confirm-title">선택한 파일을 삭제하시겠습니까?</p>
                <p className="search-bar-confirm-desc">해당 항목은 휴지통에서 복구 및 삭제할 수 있습니다</p>
              </>
            )}
          </div>
          <div className="search-bar">
            <span className="search-bar-icon">{textEntryOpen ? <EditIcon /> : <SearchIcon />}</span>
            <input
              ref={inputRef}
              className="search-bar-input"
              type={textEntryOpen ? "text" : "search"}
              inputMode={textEntryOpen ? "text" : "search"}
              enterKeyHint={textEntryOpen ? "done" : "search"}
              placeholder={textEntryOpen ? "여기에 입력하세요" : "검색"}
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                // 다중 이름 바꾸기는 엔터로 다음 항목으로 넘어가고, 마지막
                // 항목에서만 엔터가 곧 확인이 된다.
                if (multiRenameOpen && !isLastMultiRenameItem) {
                  onNextMultiRename?.();
                  return;
                }
                // 모바일 키보드의 "검색"/"완료" 확인 버튼도 엔터와 동일한 keydown을 발생시킨다.
                if (textEntryOpen) submitText();
                e.currentTarget.blur();
              }}
            />
            {panelOpen && (
              <button
                type="button"
                className="search-bar-inline-confirm"
                onClick={confirmOpen ? confirm : submitText}
                disabled={confirmOpen ? busy : !canSubmitText}
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
