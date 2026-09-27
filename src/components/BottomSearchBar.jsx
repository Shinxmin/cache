import { useEffect, useRef, useState } from "react";
import { BackIcon, ChevronRightIcon, FileIcon } from "./icons";
import Spinner from "./Spinner";
import { isOptimizableFile, OPTIMIZE_LEVELS, OPTIMIZE_LEVEL_LABELS } from "../lib/optimize";
import { displayName } from "../lib/filename";
import { formatBytes, formatDuration } from "../lib/format";
import { looksLikeVideoFile } from "../lib/thumbnail";
import useSegmentDrag from "../hooks/useSegmentDrag";
import HighlightRangeSlider from "./HighlightRangeSlider";

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

// 구글 머티리얼 디자인의 "레이어(layers)" 아이콘 — 위쪽 마름모 하나(위
// 레이어)와 그 아래 살짝 떨어진 얇은 갈매기형 띠(아래 레이어)로 이름·
// 태그·압축을 한데 묶은 스튜디오를 상징한다. 검색바 오른쪽 끝의 알약
// 버튼(패널이 닫혀 있을 때만 뜬다)에 쓰인다.
function LayersIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2 3 7.5 12 13 21 7.5 12 2z" />
      <path d="M3 15.5 12 21 21 15.5 18.4 13.9 12 17.7 5.6 13.9 3 15.5z" />
    </svg>
  );
}

// 스튜디오의 이름 바꾸기(연필) 기능 아이콘. 이름 섹션이 열려 검색바가
// 입력창으로 바뀌는 동안 돋보기 대신 이걸 보여주고, 스튜디오 패널의
// 기능 선택 아이콘 줄에서도 같은 모양을 쓴다.
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

// 스튜디오의 태그 기능 아이콘(북마크).
function BookmarkIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

// 스튜디오의 압축 기능 아이콘: 폴더 모양 가운데를 지퍼 이빨(작은 정사각형을
// 세로로 뚫은 구멍)로 관통시켜 압축 폴더임을 나타낸다.
function ZipFolderIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z
           M11.1 9h1.8v1.8h-1.8z
           M11.1 11.7h1.8v1.8h-1.8z
           M11.1 14.4h1.8v1.8h-1.8z
           M11.1 17.1h1.8v1.8h-1.8z"
      />
    </svg>
  );
}

// 스튜디오의 하이라이트 기능 아이콘 — 툴킷 바에 있던 예전 "하이라이트 클립"
// 애드온과 같은 가위(content_cut) 모양을 그대로 쓴다(같은 기능이 옮겨온
// 것이므로 아이콘도 그대로 이어간다).
function ScissorsIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z" />
    </svg>
  );
}

const HIGHLIGHT_CLOSE_ANIMATION_MS = 160;

// 하이라이트 슬라이더(+시간 줄)를 다른 일괄 적용 버튼들처럼 등장·퇴장에
// 페이드+스케일 애니메이션이 붙게 감싸는 래퍼. 등장할 땐 CSS 애니메이션이
// 마운트와 동시에 자동 재생되지만, 사라질 땐 React가 DOM을 곧바로 지워버려
// 트랜지션을 볼 틈이 없다. 그래서 ConfirmModal과 같은 방식으로, 실제 언마운트
// 전에 "닫히는 중" 상태를 잠깐 켜서 퇴장 애니메이션(.is-closing)이 끝날
// 시간을 준 뒤 사라진다.
function HighlightSliderPanel({ visible, children }) {
  const [mounted, setMounted] = useState(visible);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (visible) {
      setClosing(false);
      setMounted(true);
    } else {
      setClosing(true);
      timerRef.current = setTimeout(() => setMounted(false), HIGHLIGHT_CLOSE_ANIMATION_MS);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible]);

  if (!mounted) return null;
  return <div className={`search-bar-highlight-col${closing ? " is-closing" : ""}`}>{children}</div>;
}

// 예전 하단 내비바가 있던 자리에 고정된 검색바. position:fixed라 스크롤을
// 아무리 올리고 내려도 그 자리에서 전혀 움직이지 않는다. 파일 화면(과 그
// 안에서 연 즐겨찾기 화면)에서 항상 떠 있다 — "검색바 항상 활성화" 설정은
// 없어졌고 이제 이게 유일한 동작이다.
//
// 배경·블러·그림자·둥근 모서리는 전부 바깥 껍데기 하나(.search-dock)가
// 맡는다 — 확인 문구(.search-bar-confirm-panel)와 검색창(.search-bar)은 그
// 안의 내용일 뿐, 각자 따로 유리 재질을 두르지 않는다. 스튜디오 툴킷의
// 삭제(휴지통)·이동 아이콘이나 헤더 삼점 버튼의 "새 폴더", 또는 검색바
// 오른쪽 끝의 레이어 아이콘(스튜디오 전용 버튼, 패널이 닫혀 있을 때만
// 뜬다)을 누르면 이 패널이 검색창 위로 확장되며 제목(과 삭제·이동일 땐
// 안내 문구, 다중 스튜디오일 땐 이전·다음 화살표, 이동일 땐 폴더 목록)을
// 보여준다 — 취소 버튼은 없고, 검색바를 뺀 화면 어디를 눌러도 취소로
// 닫힌다(.search-bar-scrim). 확인 버튼은 패널이 아니라 검색바 자신의
// 오른쪽 끝에 뜬다.
//
// 스튜디오 패널은 열리면 먼저 이름·태그·압축 세 기능을 아이콘만으로 늘어
// 놓은 줄(제목 밑 구분선 두 개 사이)을 보여준다 — 압축은 선택된 항목 중
// 하나도 압축 가능한 게 없으면 아예 뜨지 않는다(자리도 차지하지 않는다).
// 아이콘을 누르면 그 줄이 "‹ 아이콘 기능이름"(다중이면 오른쪽에 이전·다음
// 화살표도) 모양으로 접히듯 바뀌고(studioSection 상태), 그 아래 지금 보고
// 있는 파일명이 뜬다. 뒤로(‹) 버튼을 누르면 다시 아이콘 줄로 애니메이션과
// 함께 돌아간다. 이름·태그 섹션은 예전처럼 검색바 자신의 입력창을 그대로
// 쓰고(돋보기 대신 연필·북마크 아이콘으로 바뀐다), 압축 섹션은 품질
// 세그먼트가 패널이 아니라 검색바 확인 버튼 바로 왼쪽에 뜬다. 일괄 적용·
// 일괄 지우기 같은 부가 버튼도 지금 선택된 기능에 해당하는 것만 뜨고
// 나머지는 렌더링조차 되지 않는다. 새 폴더일 때도 같은 입력창을 재사용하고,
// 삭제·이동·스튜디오(아이콘 줄·압축 섹션)처럼 그 입력창을 쓰지 않는 동안은
// 검색을 아예 막도록 입력창 자체를 비활성화한다. 여러 상태 중 둘 이상
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
  onOpenStudio,
  studioOpen,
  studioTargetName,
  studioTargetMime,
  studioTargetIsFolder,
  studioName,
  studioTag,
  studioLevel,
  studioLevelTouched,
  studioHighlightStart,
  studioHighlightEnd,
  studioHighlightDuration,
  studioProgress,
  studioResult,
  onChangeStudioName,
  onChangeStudioTag,
  onChangeStudioLevel,
  onOpenStudioHighlight,
  onChangeStudioHighlightStart,
  onChangeStudioHighlightEnd,
  onConfirmStudio,
  onCancelStudio,
  multiStudioOpen,
  multiStudioItems,
  multiStudioIndex,
  onPrevMultiStudio,
  onNextMultiStudio,
  onApplyAllMultiStudioName,
  onClearAllMultiStudioName,
  onAttachNumbersMultiStudio,
  onApplyAllMultiStudioTag,
  onClearAllMultiStudioTag,
  onApplyAllMultiStudioLevel,
  onClearAllMultiStudioLevel,
  onApplyAllMultiStudioHighlight,
  onClearAllMultiStudioHighlight,
  onConfirmMultiStudio,
  onCancelMultiStudio,
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
  const [studioBusy, setStudioBusy] = useState(false);
  const [multiStudioBusy, setMultiStudioBusy] = useState(false);
  const [moveBusy, setMoveBusy] = useState(false);
  const panelOpen = confirmOpen || newFolderOpen || studioOpen || multiStudioOpen || moveOpen;

  // 스튜디오 패널 안에서 지금 어떤 기능을 보고 있는지 — null이면 아이콘 줄,
  // "name"/"tag"/"quality"면 그 기능의 화면이다. 패널이 새로 열릴 때마다
  // (닫혀 있다가 다시 열릴 때) 항상 아이콘 줄부터 시작하도록 되돌린다.
  const [studioSection, setStudioSection] = useState(null);
  const studioActive = Boolean(studioOpen || multiStudioOpen);
  const wasStudioActiveRef = useRef(false);
  useEffect(() => {
    if (studioActive && !wasStudioActiveRef.current) setStudioSection(null);
    wasStudioActiveRef.current = studioActive;
  }, [studioActive]);

  // 검색바가 검색 대신 값을 입력받는 상태 — 새 폴더, 그리고 스튜디오의
  // 이름·태그 섹션(압축 섹션·아이콘 줄에서는 입력창을 쓰지 않는다).
  const studioTextSection = studioActive && (studioSection === "name" || studioSection === "tag");
  const textEntryOpen = newFolderOpen || studioTextSection;
  // 입력창을 쓰지 않는 패널(삭제 확인·이동·스튜디오 아이콘 줄/압축)이 열려
  // 있을 때는 검색바 입력을 아예 비활성화한다 — 패널이 열려 있는 동안
  // 검색어를 바꿔 지금 폴더 목록 자체가 통째로 달라지는 걸 막기 위해서다.
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
      : studioOpen
        ? "studio"
        : multiStudioOpen
          ? "multiStudio"
          : moveOpen
            ? "move"
            : "confirm";
  const [displayMode, setDisplayMode] = useState(resolveMode);
  useEffect(() => {
    if (newFolderOpen) setDisplayMode("newFolder");
    else if (studioOpen) setDisplayMode("studio");
    else if (multiStudioOpen) setDisplayMode("multiStudio");
    else if (moveOpen) setDisplayMode("move");
    else if (confirmOpen) setDisplayMode("confirm");
  }, [newFolderOpen, studioOpen, multiStudioOpen, moveOpen, confirmOpen]);

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

  // 스튜디오(이름·태그·압축 통합)는 단일이면 studioOpen 하나를, 여러 개면
  // multiStudioOpen을 이전·다음 화살표로 하나씩 넘기며 편집한다 — 아래는 둘
  // 중 열려 있는 쪽 기준의 공통 값들.
  const isMultiStudio = Boolean(multiStudioOpen);
  const multiStudioCurrent = multiStudioItems?.[multiStudioIndex];
  const isLastMultiStudio = multiStudioIndex >= (multiStudioItems?.length ?? 1) - 1;
  const currentStudioName = studioOpen ? studioName : isMultiStudio ? multiStudioCurrent?.name ?? "" : "";
  const currentStudioTag = studioOpen ? studioTag : isMultiStudio ? multiStudioCurrent?.tag ?? "" : "";
  const currentStudioLevel = studioOpen ? studioLevel : isMultiStudio ? multiStudioCurrent?.level ?? 1 : 1;
  const currentStudioMime = studioOpen ? studioTargetMime : isMultiStudio ? multiStudioCurrent?.mime ?? "" : "";
  const currentStudioHighlightStart = studioOpen ? studioHighlightStart : isMultiStudio ? multiStudioCurrent?.highlightStart ?? 0 : 0;
  const currentStudioHighlightEnd = studioOpen ? studioHighlightEnd : isMultiStudio ? multiStudioCurrent?.highlightEnd ?? 10 : 10;
  const currentStudioHighlightDuration = studioOpen
    ? studioHighlightDuration
    : isMultiStudio
      ? multiStudioCurrent?.highlightDuration ?? 0
      : 0;
  const currentStudioOriginalName = studioOpen
    ? studioTargetName
    : isMultiStudio
      ? multiStudioCurrent?.originalName ?? ""
      : "";
  // 선택된 항목이 하나도 없어도(studioTargetId가 null) 스튜디오 패널은
  // 열리지만, 편집할 대상이 없으므로 이름·태그·최적화 아이콘을 전부
  // 비활성화한다 — 다중 모드는 애초에 항목이 2개 이상이어야 열리므로 항상
  // true다.
  const studioHasTarget = studioOpen ? Boolean(studioTargetName) : isMultiStudio ? Boolean(multiStudioItems?.length) : false;
  // 최적화 아이콘은 항상 뜨지만(자리를 차지한다), 선택된 항목이 전부
  // 압축 가능할 때만 눌린다 — 폴더나 미지원 파일이 하나라도 섞여 있으면
  // 보이기만 하고 비활성화된다(단일이든 다중이든 같은 규칙).
  const studioAllOptimizable = studioOpen
    ? !studioTargetIsFolder && isOptimizableFile(studioName || studioTargetName, studioTargetMime)
    : isMultiStudio
      ? Boolean(multiStudioItems?.length) && multiStudioItems.every((it) => !it.is_folder && isOptimizableFile(it.name, it.mime))
      : false;
  // 하이라이트 아이콘도 최적화와 같은 규칙 — 항상 뜨지만 선택된 항목이
  // 전부 영상일 때만 눌린다(다중 선택에 영상·이미지가 섞이면 비활성).
  const studioAllHighlightable = studioOpen
    ? !studioTargetIsFolder && looksLikeVideoFile(studioName || studioTargetName, studioTargetMime)
    : isMultiStudio
      ? Boolean(multiStudioItems?.length) && multiStudioItems.every((it) => !it.is_folder && looksLikeVideoFile(it.name, it.mime))
      : false;
  // 처리 중(진행 바)이거나 결과가 이미 떠 있으면 아이콘 줄·기능 화면 대신
  // 그 화면을 보여준다.
  const studioRunning = Boolean(studioProgress) || Boolean(studioResult);
  // 품질 세그먼트를 탭뿐 아니라 마우스 드래그·손가락 슬라이드로도 고를 수
  // 있게 한다. onChangeStudioLevel은 App.jsx에서 단일/다중 여부를 이미
  // 스스로 판단하므로 여기서는 그대로 전달만 한다.
  const studioSegDrag = useSegmentDrag(OPTIMIZE_LEVELS.length, (level) => onChangeStudioLevel?.(level));

  const canSubmitStudio = studioResult ? true : Boolean(studioName?.trim()) && !studioBusy;
  const submitStudio = async () => {
    if (studioBusy) return;
    setStudioBusy(true);
    try {
      await onConfirmStudio();
    } finally {
      setStudioBusy(false);
    }
  };
  const canSubmitMultiStudio = studioResult
    ? true
    : Boolean(multiStudioItems?.length) && multiStudioItems.every((it) => it.name.trim().length > 0) && !multiStudioBusy;
  const submitMultiStudio = async () => {
    if (multiStudioBusy) return;
    setMultiStudioBusy(true);
    try {
      await onConfirmMultiStudio();
    } finally {
      setMultiStudioBusy(false);
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

  const textValue = newFolderOpen
    ? newFolderName
    : studioSection === "name"
      ? currentStudioName
      : studioSection === "tag"
        ? currentStudioTag
        : searchQuery;
  const onTextChange = (value) => {
    if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (studioActive && studioSection === "name") onChangeStudioName?.(value);
    else if (studioActive && studioSection === "tag") onChangeStudioTag?.(value);
    else onSearch?.(value);
  };
  const canSubmitText = newFolderOpen ? canSubmitFolder : true;
  const submitText = () => {
    if (newFolderOpen) return submitFolder();
    return confirm();
  };
  const onCancelScrim = newFolderOpen
    ? onCancelNewFolder
    : studioOpen
      ? onCancelStudio
      : multiStudioOpen
        ? onCancelMultiStudio
        : moveOpen
          ? onCancelMove
          : onCancelDelete;

  // 스크림이 화면 전체를 덮으면 그 밑에 있는 스튜디오 툴킷 바(전체 선택
  // 체크박스 + 도구 한 줄)도 가려져서 아이콘을 눌러 패널을
  // 전환하는 것도 안 됐다. 그래서 스크림을 통짜 사각형 하나 대신 툴킷 바
  // 전체의 실제 위치만큼 구멍을 낸 네 조각(위·아래·왼쪽·오른쪽)으로 나눠
  // 그린다 — 그 구멍 안에서는 스크림이 아예 존재하지 않으므로 클릭이 진짜
  // 그 바(.studio-toolkit)에 직접 닿는다. 나머지 자리(뒤로가기·더보기·
  // 설정 버튼)는 그대로 스크림이 덮어 취소로 처리된다.
  const [scrimHole, setScrimHole] = useState(null);
  useEffect(() => {
    if (!panelOpen) {
      setScrimHole(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector(".studio-toolkit");
      setScrimHole(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [panelOpen]);

  // 패널이 열려 있어도 파일·폴더 타일을 "꾹 눌러"(또는 탭해) 선택을 켜거나
  // 끌 수 있어야 한다 — 패널을 계속 연 채로 대상을 더하거나 뺄 수 있게
  // 하기 위해서다. 스크림이 화면을 덮고 있어 진짜 포인터다운이 타일
  // 자신에게는 닿지 않으므로, 스크림에서 받은 실제 포인터다운·이동·업
  // 좌표를 그대로 타일에 합성 이벤트로 전달한다 — 그래야 타일의
  // useLongPress 훅이 원래와 똑같이 꾹 누른 시간을 재서 탭/꾹 누르기를
  // 구분할 수 있다(클릭만 흉내 내면 "짧게 탭"밖에 재현할 수 없어 꾹 누르기
  // 자체는 절대 발동하지 않는다).
  //
  // 포인터다운 시점에 찾은 그 타일 참조를 fowardTileRef에 그대로 들고
  // 있다가 이동·업도 같은 타일로 보낸다 — 도중에 좌표로 다시 찾지 않는다.
  // 꾹 눌러 선택이 새로 켜지면(예: 선택이 0개→ 1개) 스튜디오 툴킷 바가
  // 그 자리에 막 나타나 밑에 있던 그리드를 아래로 밀어낼 수 있는데, 그러면
  // 뒤따라오는 네이티브 click이 포인터다운 때와 같은 화면 좌표로 다시
  // elementsFromPoint를 하면 이미 타일이 그 자리를 벗어나 있어 아무것도
  // 못 찾고 "빈 자리를 눌렀다"고 오판해 패널을 취소해 버린다. 그래서
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
    // 최적화 섹션이 열려 있는 동안은 폴더·미지원 파일 타일을 눌러도 선택에
    // 더해지지 않는다 — 그 섹션 안에서는 선택이 항상 전부 압축 가능한
    // 상태를 유지해야 하므로, 눌러도 그냥 무시한다(취소로도 처리하지 않는다).
    if (studioActive && studioSection === "quality" && tile.dataset.optimizable === "false") return;
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
      if (studioActive && studioSection === "quality" && tile.dataset.optimizable === "false") {
        return;
      }
      tile.click();
      return;
    }
    onCancelScrim?.();
  };

  // 검색바 아이콘은 삭제 패널만 빼고, 그 패널을 연 툴킷 아이콘과 똑같은
  // 모양으로 바뀐다(새 폴더→폴더, 스튜디오 이름 섹션→연필, 태그 섹션→
  // 북마크).
  const searchBarIcon = !textEntryOpen ? (
    <SearchIcon />
  ) : newFolderOpen ? (
    <FolderIcon />
  ) : studioSection === "tag" ? (
    <BookmarkIcon />
  ) : (
    <EditIcon />
  );

  // 일괄 적용·일괄 지우기·번호 붙이기 같은 부가 기능은 지금 스튜디오에서
  // 보고 있는 기능(studioSection)에 맞는 것만 보여준다 — 다른 기능의
  // 버튼은 렌더링조차 하지 않아 자리를 차지하지 않는다. 아이콘 줄만 보고
  // 있을 때(기능을 아직 안 골랐을 때)는 아무 버튼도 뜨지 않는다.
  const extraActions =
    displayMode === "multiStudio" && !studioRunning && studioSection === "name"
      ? [
          { key: "clearAll", label: "일괄 지우기", onClick: onClearAllMultiStudioName },
          { key: "applyAll", label: "일괄 적용", onClick: onApplyAllMultiStudioName },
          { key: "numbers", label: "번호 붙이기", onClick: onAttachNumbersMultiStudio },
        ]
      : displayMode === "multiStudio" && !studioRunning && studioSection === "tag"
        ? [
            { key: "clearAll", label: "일괄 지우기", onClick: onClearAllMultiStudioTag },
            { key: "applyAll", label: "일괄 적용", onClick: onApplyAllMultiStudioTag },
          ]
        : displayMode === "multiStudio" && !studioRunning && studioSection === "quality"
          ? [
              { key: "clearAll", label: "일괄 지우기", onClick: onClearAllMultiStudioLevel },
              { key: "applyAll", label: "일괄 적용", onClick: onApplyAllMultiStudioLevel },
            ]
          : displayMode === "multiStudio" && !studioRunning && studioSection === "highlight"
            ? [
                { key: "clearAll", label: "일괄 지우기", onClick: onClearAllMultiStudioHighlight },
                { key: "applyAll", label: "일괄 적용", onClick: onApplyAllMultiStudioHighlight },
              ]
            : [];

  const studioSectionIcon =
    studioSection === "tag" ? (
      <BookmarkIcon size={16} />
    ) : studioSection === "quality" ? (
      <ZipFolderIcon size={16} />
    ) : studioSection === "highlight" ? (
      <ScissorsIcon size={16} />
    ) : (
      <EditIcon size={16} />
    );
  const studioSectionLabel =
    studioSection === "tag"
      ? "태그"
      : studioSection === "quality"
        ? "최적화"
        : studioSection === "highlight"
          ? "하이라이트"
          : "이름 바꾸기";

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
                onPointerDown={handleScrimPointerDown}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.bottom, left: 0, right: 0, bottom: 0, height: "auto" }}
              onClick={handleScrimClick}
              onPointerDown={handleScrimPointerDown}
            />
            {scrimHole.left > 0 && (
              <div
                className="search-bar-scrim"
                style={{ top: scrimHole.top, left: 0, right: "auto", bottom: "auto", width: scrimHole.left, height: scrimHole.bottom - scrimHole.top }}
                onClick={handleScrimClick}
                onPointerDown={handleScrimPointerDown}
              />
            )}
            <div
              className="search-bar-scrim"
              style={{ top: scrimHole.top, left: scrimHole.right, right: 0, bottom: "auto", height: scrimHole.bottom - scrimHole.top }}
              onClick={handleScrimClick}
              onPointerDown={handleScrimPointerDown}
            />
          </>
        ) : (
          <div className="search-bar-scrim" onClick={handleScrimClick} onPointerDown={handleScrimPointerDown} />
        ))}
      <div className="bottom-search-wrap">
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}`}>
          <div
            className={`search-bar-confirm-panel${displayMode === "studio" || displayMode === "multiStudio" ? " mode-studio" : ""}${displayMode === "move" ? " mode-move" : ""}${extraActions.length > 0 ? " has-extras" : ""}${panelOpen ? " is-open" : ""}`}
            aria-hidden={!panelOpen}
          >
            {displayMode === "newFolder" ? (
              <p className="search-bar-confirm-title search-bar-confirm-title--studio">새 폴더</p>
            ) : displayMode === "studio" || displayMode === "multiStudio" ? (
              studioResult ? (
                // 확인 후 압축까지 전부 끝났을 때: 단일·다중 공통으로 처리
                // 시간·용량 변화·절약한 용량을 보여준다. 패널은 스크림을
                // 누르거나 아이콘을 다시 눌러야 닫힌다(결과를 본 뒤 사용자가
                // 직접).
                <>
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">스튜디오</p>
                  <p className="search-bar-confirm-desc">{studioResult.total}개 파일 처리 완료</p>
                  <div className="optimize-result-stats">
                    <div className="optimize-result-row">
                      <span className="optimize-result-label">처리 시간</span>
                      <span className="optimize-result-value">{(studioResult.elapsedMs / 1000).toFixed(1)}초</span>
                    </div>
                    <div className="optimize-result-row">
                      <span className="optimize-result-label">용량 변화</span>
                      <span className="optimize-result-value">
                        {formatBytes(studioResult.totalOriginal)} → {formatBytes(studioResult.totalCompressed)}
                      </span>
                    </div>
                    <div className="optimize-result-row">
                      <span className="optimize-result-label">절약한 용량</span>
                      <span className="optimize-result-value">
                        {formatBytes(Math.max(0, studioResult.totalOriginal - studioResult.totalCompressed))}
                      </span>
                    </div>
                  </div>
                </>
              ) : studioProgress ? (
                // 확인을 누른 직후부터 압축이 전부 끝나기 전까지: 파일 하나가
                // 끝날 때마다 채워지는 진행 바 + "148 / 200" 카운트만 보여준다.
                <>
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">스튜디오</p>
                  <div className="optimize-progress-track">
                    <div
                      className="optimize-progress-fill"
                      style={{ width: `${Math.round((studioProgress.done / studioProgress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="optimize-progress-count">
                    {studioProgress.done} / {studioProgress.total}
                  </p>
                </>
              ) : (
                <>
                  <p className="search-bar-confirm-title search-bar-confirm-title--studio">스튜디오</p>
                  <div className="search-bar-studio-divider" />
                  <div className="search-bar-studio-switcher" data-mode={studioSection ? "detail" : "list"}>
                    <div className="search-bar-studio-icon-list">
                      <button
                        type="button"
                        className="search-bar-studio-icon-btn"
                        aria-label="이름 바꾸기"
                        disabled={!studioHasTarget}
                        onClick={() => setStudioSection("name")}
                      >
                        <EditIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="search-bar-studio-icon-btn"
                        aria-label="태그"
                        disabled={!studioHasTarget}
                        onClick={() => setStudioSection("tag")}
                      >
                        <BookmarkIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="search-bar-studio-icon-btn"
                        aria-label="최적화"
                        disabled={!studioHasTarget || !studioAllOptimizable}
                        onClick={() => setStudioSection("quality")}
                      >
                        <ZipFolderIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="search-bar-studio-icon-btn"
                        aria-label="하이라이트"
                        disabled={!studioHasTarget || !studioAllHighlightable}
                        onClick={() => {
                          setStudioSection("highlight");
                          onOpenStudioHighlight?.();
                        }}
                      >
                        <ScissorsIcon size={16} />
                      </button>
                    </div>
                    <div className="search-bar-studio-detail">
                      <button
                        type="button"
                        className="search-bar-studio-back"
                        aria-label="뒤로"
                        onClick={() => setStudioSection(null)}
                      >
                        <ChevronRightIcon size={14} />
                      </button>
                      <span className="search-bar-studio-detail-icon">{studioSectionIcon}</span>
                      <span className="search-bar-studio-detail-label">{studioSectionLabel}</span>
                      {isMultiStudio && (
                        <div className="search-bar-confirm-nav">
                          <button
                            type="button"
                            className="search-bar-confirm-nav-btn search-bar-confirm-nav-btn--prev"
                            aria-label="이전 항목"
                            onClick={() => {
                              const nextIndex = Math.max(0, multiStudioIndex - 1);
                              onPrevMultiStudio?.();
                              if (studioSection === "highlight") onOpenStudioHighlight?.(nextIndex);
                            }}
                            disabled={multiStudioIndex <= 0}
                          >
                            <ChevronRightIcon size={14} />
                          </button>
                          <span className="search-bar-confirm-nav-count">
                            {multiStudioIndex + 1}/{multiStudioItems?.length ?? 0}
                          </span>
                          <button
                            type="button"
                            className="search-bar-confirm-nav-btn"
                            aria-label="다음 항목"
                            onClick={() => {
                              const nextIndex = Math.min((multiStudioItems?.length ?? 1) - 1, multiStudioIndex + 1);
                              onNextMultiStudio?.();
                              if (studioSection === "highlight") onOpenStudioHighlight?.(nextIndex);
                            }}
                            disabled={isLastMultiStudio}
                          >
                            <ChevronRightIcon size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="search-bar-studio-divider" />
                  {studioSection && (
                    <p className="search-bar-confirm-filename search-bar-confirm-filename--studio">
                      {displayName({ name: currentStudioOriginalName, mime: currentStudioMime })}
                    </p>
                  )}
                  {studioSection === "highlight" && (
                    <p className="search-bar-highlight-times-inline">
                      {formatDuration(currentStudioHighlightStart)}
                      {" - "}
                      {formatDuration(currentStudioHighlightEnd)}
                    </p>
                  )}
                </>
              )
            ) : displayMode === "move" ? (
              <>
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">이동</p>
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
                <p className="search-bar-confirm-title search-bar-confirm-title--studio">삭제</p>
                <p className="search-bar-confirm-desc">해당 항목은 휴지통에서 복구 및 삭제할 수 있습니다</p>
              </>
            )}
            {/* 일괄 적용·일괄 지우기·번호 붙이기 같은 부가 기능은 패널 맨
                아래, 바로 밑 검색바의 확인 버튼 쪽으로 붙여 오른쪽 정렬해
                둔다 — 항목이 없는 패널(새 폴더, 스튜디오 단일·아이콘 줄,
                이동, 삭제 확인 등)에서는 아무것도 뜨지 않는다. */}
            {extraActions.length > 0 && (
              <div className="search-bar-confirm-extras">
                {extraActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className="search-bar-confirm-extras-btn"
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
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
              maxLength={studioSection === "tag" ? 24 : undefined}
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
            {/* 스튜디오를 여는 전용 버튼 — 검색바 오른쪽 끝 원형 버튼으로,
                다른 패널이 하나도 열려 있지 않을 때만 뜬다(패널이 열리면
                그 자리를 확인 버튼이나 품질 세그먼트가 대신 차지한다). 선택된
                항목이 없으면 onOpenStudio가 조용히 아무 것도 하지 않는다
                (다른 스튜디오 진입 동작과 같은 규칙). 닫을 땐 버튼이 아니라
                빈 화면(스크림)을 눌러 닫는다. */}
            {!panelOpen && (
              <button
                type="button"
                className="search-bar-open-studio-btn"
                aria-label="스튜디오 열기"
                onClick={onOpenStudio}
              >
                <LayersIcon size={18} />
              </button>
            )}
            {/* 압축 섹션이 열려 있을 때만 확인 버튼 바로 왼쪽에 품질 세그먼트가
                뜬다 — 패널 본문이 아니라 검색바 쪽에 있던 예전 최적화 패널
                자리 그대로다. */}
            {studioActive && studioSection === "quality" && !studioRunning && (
              <div className="search-bar-optimize-seg-group" role="group" aria-label="압축 비율" {...studioSegDrag}>
                {OPTIMIZE_LEVELS.map((pct, i) => (
                  <button
                    key={pct}
                    type="button"
                    className={`search-bar-optimize-seg${currentStudioLevel === i ? " active" : ""}`}
                    aria-pressed={currentStudioLevel === i}
                    onClick={() => onChangeStudioLevel?.(i)}
                  >
                    {OPTIMIZE_LEVEL_LABELS[i]}
                  </button>
                ))}
              </div>
            )}
            {/* 하이라이트 섹션이 열려 있을 때만 확인 버튼 바로 왼쪽에 뜨는 구간
                슬라이더 — 품질 세그먼트와 같은 자리다. 시작·끝 시간은
                패널 본문의 파일명 밑으로 옮겼고, 값 조정은 이 슬라이더를
                직접 드래그해서만 한다. */}
            <HighlightSliderPanel visible={studioActive && studioSection === "highlight" && !studioRunning && panelOpen}>
              <HighlightRangeSlider
                duration={currentStudioHighlightDuration}
                start={currentStudioHighlightStart}
                end={currentStudioHighlightEnd}
                onChangeStart={onChangeStudioHighlightStart}
                onChangeEnd={onChangeStudioHighlightEnd}
                disabled={!currentStudioHighlightDuration}
              />
            </HighlightSliderPanel>
            {panelOpen && (
              <button
                type="button"
                className="search-bar-inline-confirm"
                onClick={
                  confirmOpen
                    ? confirm
                    : studioOpen
                      ? submitStudio
                      : multiStudioOpen
                        ? submitMultiStudio
                        : moveOpen
                          ? submitMove
                          : submitText
                }
                disabled={
                  confirmOpen
                    ? busy
                    : studioOpen
                      ? !canSubmitStudio
                      : multiStudioOpen
                        ? !canSubmitMultiStudio
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
