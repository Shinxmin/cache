import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon } from "./icons";
import { isOptimizableFile, OPTIMIZE_LEVELS, OPTIMIZE_LEVEL_LABELS } from "../lib/optimize";

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
// 삭제(휴지통)·이름 바꾸기(연필)·태그(#)·최적화(용량 압축) 아이콘이나
// 헤더 삼점 버튼의 "새 폴더"를 누르면 이 패널이 검색창 위로 확장되며
// 제목(과 삭제일 땐 안내 문구, 다중 이름 바꾸기·다중 태그일 땐 이전·다음
// 화살표 + 일괄 처리 버튼, 최적화일 땐 대상 요약 한 줄 + 품질 세그먼트)을
// 보여준다 — 취소 버튼은 없고, 검색바를 뺀 화면 어디를 눌러도 취소로
// 닫힌다(.search-bar-scrim). 확인 버튼은 패널이 아니라 검색바 자신의
// 오른쪽 끝에 뜬다 — 새 폴더·이름 바꾸기·태그일 때는 검색바의
// 돋보기·플레이스홀더도 아이콘(연필 또는 #)·"여기에 입력하세요"로 바뀌어
// 그 입력창에 직접 값을 타이핑한다(별도 입력창을 새로 만들지 않는다).
// 다중 이름 바꾸기·다중 태그도 같은 입력창 하나를 화살표로 넘기며
// 재사용한다 — 그래서 몇 개를 고르든 패널 크기는 항상 같다. 최적화는
// 항목마다 값을 받는 게 아니라 고른 품질 하나를 선택 전체에 적용하므로
// (삭제 확인처럼) 검색바 입력창을 전혀 쓰지 않는다. 일곱 개 상태 중
// 둘 이상 동시에 열릴 수는 없으므로(App.jsx가 하나를 열 때 나머지를
// 닫는다) 패널·검색바 내용물은 그때그때 하나만 그린다.
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
  optimizeItems,
  optimizeLevel,
  onChangeOptimizeLevel,
  onConfirmOptimize,
  onCancelOptimize,
}) {
  const [busy, setBusy] = useState(false);
  const [folderBusy, setFolderBusy] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [multiRenameBusy, setMultiRenameBusy] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);
  const [multiTagBusy, setMultiTagBusy] = useState(false);
  const [optimizeBusy, setOptimizeBusy] = useState(false);
  const panelOpen =
    confirmOpen || newFolderOpen || renameOpen || multiRenameOpen || tagOpen || multiTagOpen || optimizeOpen;
  // 검색바가 검색 대신 값을 입력받는 상태(새 폴더·이름 바꾸기·다중 이름
  // 바꾸기·태그·다중 태그 다섯 다 공통).
  const textEntryOpen = newFolderOpen || renameOpen || multiRenameOpen || tagOpen || multiTagOpen;
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
                : "confirm";
  const [displayMode, setDisplayMode] = useState(resolveMode);
  useEffect(() => {
    if (newFolderOpen) setDisplayMode("newFolder");
    else if (renameOpen) setDisplayMode("rename");
    else if (multiRenameOpen) setDisplayMode("multiRename");
    else if (tagOpen) setDisplayMode("tag");
    else if (multiTagOpen) setDisplayMode("multiTag");
    else if (optimizeOpen) setDisplayMode("optimize");
    else if (confirmOpen) setDisplayMode("confirm");
  }, [newFolderOpen, renameOpen, multiRenameOpen, tagOpen, multiTagOpen, optimizeOpen, confirmOpen]);

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

  // 최적화는 이름·태그처럼 항목마다 값을 받지 않고, 고른 품질 하나를
  // 선택 전체에 적용한다 — 그래서 검색바 입력창을 전혀 쓰지 않는다(삭제
  // 확인과 같은 부류). 캔버스로 못 읽는 확장자가 하나라도 섞여 있으면
  // 일부만 압축되는 애매한 결과 대신 확인 버튼 자체를 막는다.
  const hasUnsupportedOptimize = (optimizeItems ?? []).some((it) => !isOptimizableFile(it.name));
  const canSubmitOptimize = Boolean(optimizeItems?.length) && !hasUnsupportedOptimize && !optimizeBusy;
  // 목록을 그대로 늘어놓는 대신 삭제 확인 패널처럼 한 줄로 요약한다 —
  // 첫 번째 파일 이름 뒤에 나머지 개수를 붙인다(하나뿐이면 그 이름만).
  const optimizeSummary =
    (optimizeItems?.length ?? 0) <= 1
      ? (optimizeItems?.[0]?.name ?? "")
      : `${optimizeItems[0].name} 외 ${optimizeItems.length - 1}개 파일`;
  const submitOptimize = async () => {
    if (!canSubmitOptimize) return;
    setOptimizeBusy(true);
    try {
      await onConfirmOptimize();
    } finally {
      setOptimizeBusy(false);
    }
  };

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
                onClick={onCancelScrim}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.bottom, left: 0, right: 0, bottom: 0, height: "auto" }}
              onClick={onCancelScrim}
            />
            {scrimHole.left > 0 && (
              <div
                className="search-bar-scrim"
                style={{ top: scrimHole.top, left: 0, right: "auto", bottom: "auto", width: scrimHole.left, height: scrimHole.bottom - scrimHole.top }}
                onClick={onCancelScrim}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.top, left: scrimHole.right, right: 0, bottom: "auto", height: scrimHole.bottom - scrimHole.top }}
              onClick={onCancelScrim}
            />
          </>
        ) : (
          <div className="search-bar-scrim" onClick={onCancelScrim} />
        ))}
      <div className="bottom-search-wrap">
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}`}>
          <div
            className={`search-bar-confirm-panel${displayMode === "optimize" ? " mode-optimize" : ""}${panelOpen ? " is-open" : ""}`}
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
            ) : displayMode === "optimize" ? (
              <>
                <p className="search-bar-confirm-title">최적화</p>
                <p className="search-bar-confirm-desc">{optimizeSummary}</p>
                {hasUnsupportedOptimize && (
                  <p className="search-bar-confirm-optimize-warn">지원하지 않는 확장자를 가진 파일이 있습니다</p>
                )}
                <div className="optimize-levels">
                  <p className="optimize-quality-label">품질</p>
                  <div className="optimize-seg-group" role="group" aria-label="압축 비율">
                    {OPTIMIZE_LEVELS.map((pct, i) => (
                      <button
                        key={pct}
                        type="button"
                        className={`optimize-seg${optimizeLevel === i ? " active" : ""}`}
                        aria-label={OPTIMIZE_LEVEL_LABELS[i]}
                        aria-pressed={optimizeLevel === i}
                        onClick={() => onChangeOptimizeLevel?.(i)}
                      >
                        <span className="optimize-seg-dot" />
                      </button>
                    ))}
                  </div>
                  <div className="optimize-marks">
                    {OPTIMIZE_LEVEL_LABELS.map((label, i) => (
                      <button
                        key={label}
                        type="button"
                        className={`optimize-mark${optimizeLevel === i ? " active" : ""}`}
                        onClick={() => onChangeOptimizeLevel?.(i)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
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
            {panelOpen && (
              <button
                type="button"
                className="search-bar-inline-confirm"
                onClick={confirmOpen ? confirm : optimizeOpen ? submitOptimize : submitText}
                disabled={confirmOpen ? busy : optimizeOpen ? !canSubmitOptimize : !canSubmitText}
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
