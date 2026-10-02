import { useEffect, useRef, useState } from "react";
import { BackIcon, ChevronRightIcon, CloseIcon, FileIcon } from "./icons";
import Spinner from "./Spinner";
import { isOptimizableFile } from "../lib/optimize";
import { displayName } from "../lib/filename";
import { formatBytes } from "../lib/format";

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

// 스튜디오의 이미지 비교 기능 아이콘 — 나란히 놓인 두 블록으로, 두 이미지를
// 나란히 두고 비교하는 스플릿 비교 기능을 상징화한 모양이다.
function CompareIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="2" y="4" width="9" height="16" rx="2" />
      <rect x="13" y="4" width="9" height="16" rx="2" />
    </svg>
  );
}

// 스튜디오 메뉴바: 파일 / 이미지 / 편집 / 설정. 설정은 아직 미구현(눌러도 아무 일도 없다).
const STUDIO_MENUS = [
  { key: "file", label: "파일" },
  { key: "image", label: "이미지" },
  { key: "edit", label: "편집" },
  { key: "settings", label: "설정" },
];
// 이미지 메뉴 항목 → 스튜디오 기능(섹션). 최적화는 고정 품질(중간)이라 슬라이더가 없다.
const SECTION_LABELS = { name: "이름 바꾸기", tag: "태그", quality: "최적화" };

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
  studioProgress,
  studioResult,
  onChangeStudioName,
  onChangeStudioTag,
  onChangeStudioLevel,
  onOpenStudioQuality,
  onConfirmStudio,
  onCancelStudio,
  onEndStudio,
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
  onConfirmMultiStudio,
  onConfirmCompare,
  onCancelMultiStudio,
  studioPreviewUrl,
  studioSessionHidden,
  importMode,
  importCount,
  onStartImport,
  onConfirmImport,
  onClearCurrentStudio,
  onApplyCurrentStudio,
  onSaveStudio,
  onStartSaveAs,
  saveAsName,
  onChangeSaveAsName,
  studioSaving,
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
  // 확인 진행 막대가 떠 있거나 저장 중인 동안은 스튜디오의 모든 기능·버튼 터치를 막는다.
  const studioLocked = Boolean(studioProgress) || Boolean(studioSaving);
  // 스튜디오 메뉴바의 드롭다운(파일·이미지·편집: 글자 대각선 오른쪽 아래에 뜨는 작은 불투명
  // 팝업). 바깥을 누르거나 패널이 닫히면 닫힌다.
  const [openMenu, setOpenMenu] = useState(null);
  // 메뉴 항목이 넘칠 때 마우스로도 끌어서 위아래로 스크롤한다(터치는 브라우저 기본 스와이프). 실제로
  // 끈 뒤에 이어지는 클릭은 무시해 항목이 잘못 눌리지 않게 한다.
  const menuDragRef = useRef(null);
  const menuSuppressRef = useRef(false);
  const menuDrag = {
    onPointerDown: (e) => {
      if (e.pointerType !== "mouse") return;
      menuDragRef.current = { y: e.clientY, top: e.currentTarget.scrollTop, moved: false };
    },
    onPointerMove: (e) => {
      const st = menuDragRef.current;
      if (!st) return;
      if (!st.moved && Math.abs(e.clientY - st.y) < 4) return;
      st.moved = true;
      e.currentTarget.scrollTop = st.top - (e.clientY - st.y);
    },
    onPointerUp: () => {
      if (menuDragRef.current?.moved) menuSuppressRef.current = true;
      menuDragRef.current = null;
    },
    onPointerLeave: () => {
      menuDragRef.current = null;
    },
    onClickCapture: (e) => {
      if (menuSuppressRef.current) {
        menuSuppressRef.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
  useEffect(() => {
    if (!panelOpen) setOpenMenu(null);
  }, [panelOpen]);
  useEffect(() => {
    if (!openMenu) return undefined;
    const onDown = (e) => {
      if (!e.target.closest?.(".studio-menu-wrap")) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [openMenu]);

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
  // 다른이름으로 저장 모드(importMode이면서 saveAsName이 있을 때)에서는 검색바가 저장할 이름 입력창이다.
  const saveNameEntry = Boolean(importMode) && typeof saveAsName === "string";
  const textEntryOpen = newFolderOpen || studioTextSection || saveNameEntry;
  // 입력창을 쓰지 않는 패널(삭제 확인·이동·스튜디오 아이콘 줄/압축)이 열려
  // 있을 때는 검색바 입력을 아예 비활성화한다 — 패널이 열려 있는 동안
  // 검색어를 바꿔 지금 폴더 목록 자체가 통째로 달라지는 걸 막기 위해서다.
  const inputDisabled = (panelOpen && !textEntryOpen) || studioLocked;
  const inputRef = useRef(null);

  // 패널이 닫히는 동안(max-height·opacity 트랜지션 0.25~0.35초)에도 DOM은
  // 그대로 남아 있는데, 내용을 live 플래그로 바로 판단하면 그 플래그가 이미
  // false로 바뀐 뒤라 다른 패널 문구로 순간 바뀌어 버린다 — 사라지는 패널
  // 위에 다른 문구가 잠깐 겹쳐 보이던 버그가 이것 때문이었다. 그래서 실제로
  // 열릴 때만 갱신하고, 닫힐 때는 마지막 내용을 그대로 유지한다.
  //
  // 이걸 useState+useEffect로 하면, 어떤 패널이 닫히자마자(다음 렌더에서
  // 아직 live 플래그가 전부 false인 채로) 다른 패널이 곧바로 열릴 때 한
  // 프레임이 붕 뜬다 — className은 이미 새로 열리는 패널 기준으로
  // is-open이 붙지만, displayMode는 useEffect가 아직 못 돌아 이전 패널
  // 값 그대로라 최대 높이(mode-studio 200px 등)는 이전 패널 것을 쓰면서
  // 내용은 (선택 등 다른 상태가 이미 바뀌어) 텅 비어 보이는 "빈 패널"
  // 이 한 순간 보였다가 다음 렌더에서야 제대로 된 높이·내용으로
  // 바뀌는 버그였다. ref는 렌더 중에 곧바로 갱신되므로, live 플래그가
  // true로 바뀌는 바로 그 렌더에서 이미 새 모드가 반영돼 이 프레임이
  // 생기지 않는다.
  const liveMode = newFolderOpen
    ? "newFolder"
    : studioOpen
      ? "studio"
      : multiStudioOpen
        ? "multiStudio"
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
  // 이미지 비교는 단일 선택(studioOpen)에서는 애초에 성립하지 않고, 다중
  // 선택이어도 정확히 두 개가 선택돼 있고 둘 다 움짤·동영상 등이 아닌
  // 순수 정지 이미지일 때만 눌린다(하나만 선택하거나 세 개 이상이면
  // 비활성). 정지 이미지 판정은 최적화 가능 여부(isOptimizableFile)와
  // 같은 확장자 기준을 그대로 재사용한다 — 둘 다 "캔버스가 다룰 수 있는
  // 애니메이션 없는 래스터 이미지"라는 같은 조건이기 때문이다.
  const studioAllComparable =
    isMultiStudio &&
    multiStudioItems?.length === 2 &&
    multiStudioItems.every((it) => !it.is_folder && isOptimizableFile(it.name, it.mime));
  // 처리 중(진행 바)이거나 결과가 이미 떠 있으면 아이콘 줄·기능 화면 대신
  // 그 화면을 보여준다.
  const studioRunning = Boolean(studioProgress) || Boolean(studioResult);
  // 선택된 항목이 없어 편집 대상이 없을 때(studioHasTarget이 false)의 확인은
  // 할 일이 없으니 그냥 패널을 닫는 버튼으로 동작한다 — 비활성으로 두면 열린
  // 패널의 확인이 죽어 있는 것처럼 보인다.
  const canSubmitStudio = studioResult || !studioHasTarget ? true : Boolean(studioName?.trim()) && !studioBusy;
  const submitStudio = async () => {
    if (!studioHasTarget && !studioResult) {
      onCancelStudio?.();
      return;
    }
    if (studioBusy) return;
    setStudioBusy(true);
    try {
      await onConfirmStudio();
    } finally {
      setStudioBusy(false);
    }
  };
  // 확인(적용): 모든 항목의 이름이 비어 있지 않아야 하고, 진행 중·저장 중에는 누를 수 없다.
  const canSubmitMultiStudio =
    Boolean(multiStudioItems?.length) && multiStudioItems.every((it) => it.name.trim().length > 0) && !studioLocked && !multiStudioBusy;
  const submitMultiStudio = async () => {
    if (multiStudioBusy || studioLocked) return;
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

  const textValue = saveNameEntry
    ? saveAsName
    : newFolderOpen
    ? newFolderName
    : studioSection === "name"
      ? currentStudioName
      : studioSection === "tag"
        ? currentStudioTag
        : searchQuery;
  const onTextChange = (value) => {
    if (saveNameEntry) onChangeSaveAsName?.(value);
    else if (newFolderOpen) onChangeNewFolderName?.(value);
    else if (studioActive && studioSection === "name") onChangeStudioName?.(value);
    else if (studioActive && studioSection === "tag") onChangeStudioTag?.(value);
    else onSearch?.(value);
  };
  const canSubmitText = newFolderOpen ? canSubmitFolder : true;
  const submitText = () => {
    if (newFolderOpen) return submitFolder();
    // 스튜디오 이름·태그 입력 중 엔터는 입력만 마치는 것이다(삭제 확인으로 새지 않게 막는다).
    return undefined;
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

  // 검색바 아이콘은 새 폴더 패널에서만 폴더 아이콘으로 바뀐다. 스튜디오의 이름·
  // 태그 같은 기능이 열려 있어도 기존 검색 아이콘을 그대로 유지한다.
  const searchBarIcon = newFolderOpen ? <FolderIcon /> : <SearchIcon />;

  // ── 메뉴 항목 정의 ──
  const multiCount = multiStudioItems?.length ?? 0;
  const hasSection = studioActive && (studioSection === "name" || studioSection === "tag" || studioSection === "quality");
  const isMultiple = isMultiStudio && multiCount > 1;
  const itemsLoaded = isMultiStudio && multiCount > 0;
  const clearAllHandler =
    studioSection === "name" ? onClearAllMultiStudioName : studioSection === "tag" ? onClearAllMultiStudioTag : onClearAllMultiStudioLevel;
  const applyAllHandler =
    studioSection === "name" ? onApplyAllMultiStudioName : studioSection === "tag" ? onApplyAllMultiStudioTag : onApplyAllMultiStudioLevel;
  const selectSection = (key) => {
    setStudioSection(key);
    if (key === "quality") onOpenStudioQuality?.();
  };
  const MENU_ITEMS = {
    file: [
      { key: "import", label: "불러오기", disabled: false, run: () => onStartImport?.() },
      { key: "save", label: "저장하기", disabled: !itemsLoaded || studioLocked, run: () => onSaveStudio?.() },
      { key: "saveAs", label: "다른이름으로 저장하기", disabled: !itemsLoaded || studioLocked, run: () => onStartSaveAs?.() },
    ],
    image: [
      { key: "name", label: "이름 바꾸기", disabled: !studioHasTarget, run: () => selectSection("name") },
      { key: "tag", label: "태그", disabled: !studioHasTarget, run: () => selectSection("tag") },
      { key: "quality", label: "최적화", disabled: !studioHasTarget || !studioAllOptimizable, run: () => selectSection("quality") },
    ],
    // 편집: 지우기·적용은 지금 선택된 기능의 현재 항목 하나에, 일괄 지우기·일괄 적용은 여러 개를 불러왔을
    // 때만 쓸 수 있고(현재 항목부터 뒤쪽 전부 / 전체), 번호 붙이기는 이름 바꾸기 중에만 쓸 수 있다.
    edit: [
      { key: "clear", label: "지우기", disabled: !hasSection, run: () => onClearCurrentStudio?.(studioSection) },
      { key: "clearAll", label: "일괄 지우기", disabled: !hasSection || !isMultiple, run: () => clearAllHandler?.() },
      {
        key: "apply",
        label: "적용",
        disabled: !hasSection,
        run: () => {
          if (studioSection === "quality") onApplyCurrentStudio?.(studioSection);
          else document.activeElement?.blur?.();
        },
      },
      { key: "applyAll", label: "일괄 적용", disabled: !hasSection || !isMultiple, run: () => applyAllHandler?.() },
      { key: "numbers", label: "번호 붙이기", disabled: studioSection !== "name" || !studioActive, run: () => onAttachNumbersMultiStudio?.() },
    ],
  };

  // 이미지 비교는 정확히 두 장을 한 쌍으로 다루는 기능이라, 다른 기능처럼
  // 다중 선택 항목을 하나씩 넘겨보는 이전·다음 화살표(1/2 카운터)가 필요
  // 없다 — 그래서 다중 모드라도 이 섹션에서는 내비게이션을 아예 숨긴다.
  const showMultiStudioNav = isMultiStudio && (multiStudioItems?.length ?? 0) > 1;
  // "테스트_1.jpg 외 1개 파일"처럼, 먼저 선택한 파일 이름(확장자는 메타데이터로
  // 보정)에 나머지 개수를 붙인다. 이미지 비교는 항상 정확히 두 장이므로
  // "외 1개"로 고정된다.
  const compareBodyText = isMultiStudio && multiStudioItems?.length
    ? `${displayName(multiStudioItems[0])} 외 ${multiStudioItems.length - 1}개 파일`
    : "";

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
        {/* 스튜디오 세션이 숨겨져 있을 때(패널을 닫아 둔 채 대상이 남아 있을 때) 검색바 바로 위에
            안내를 띄운다. 다른 패널이 열려 있는 동안은 숨긴다. */}
        {studioSessionHidden && !panelOpen && <p className="studio-session-note">저장되지 않은 세션이 있습니다</p>}
        <div className={`search-dock${panelOpen ? " has-confirm" : ""}${(panelOpen && (displayMode === "studio" || displayMode === "multiStudio")) || importMode ? " studio-mode" : ""}`}>
          <div
            className={`search-bar-confirm-panel${displayMode === "studio" || displayMode === "multiStudio" ? " mode-studio" : ""}${displayMode === "move" ? " mode-move" : ""}${panelOpen ? " is-open" : ""}${studioLocked ? " is-locked" : ""}`}
            aria-hidden={!panelOpen}
          >
            <div
              className="search-bar-confirm-content"
              key={displayMode === "studio" || displayMode === "multiStudio" ? "studio" : displayMode}
            >
            {displayMode === "newFolder" ? (
              <p className="search-bar-confirm-title search-bar-confirm-title--studio">새 폴더</p>
            ) : displayMode === "studio" || displayMode === "multiStudio" ? (
              (
                <>
                  <div className="studio-head">
                    <p className="search-bar-confirm-title search-bar-confirm-title--studio">스튜디오</p>
                    <div className="studio-head-right">
                    {showMultiStudioNav && (
                      <div className="search-bar-confirm-nav">
                        <button
                          type="button"
                          className="search-bar-confirm-nav-btn search-bar-confirm-nav-btn--prev"
                          aria-label="이전 항목"
                          onClick={onPrevMultiStudio}
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
                          onClick={onNextMultiStudio}
                          disabled={isLastMultiStudio}
                        >
                          <ChevronRightIcon size={14} />
                        </button>
                      </div>
                    )}
                      {/* 스튜디오 세션 종료: 패널을 닫고 열어 둔 대상·입력값·진행을 전부 지운다.
                          (스크림이나 스튜디오 버튼으로 닫는 건 임시 숨김이라 세션이 유지된다.) */}
                      <button type="button" className="studio-close-btn" aria-label="스튜디오 종료" disabled={studioLocked} onClick={onEndStudio}>
                        <CloseIcon size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="search-bar-studio-divider" />
                  {/* 메뉴바: 일시적 미구현 — 모양만 있고 눌러도 아무 일도 일어나지 않는다. */}
                  <div className="studio-menubar" role="menubar">
                    {STUDIO_MENUS.map((menu) =>
                      MENU_ITEMS[menu.key] ? (
                        <div key={menu.key} className="studio-menu-wrap">
                          <button
                            type="button"
                            role="menuitem"
                            aria-haspopup="menu"
                            aria-expanded={openMenu === menu.key}
                            className="studio-menubar-item"
                            onClick={() => setOpenMenu((v) => (v === menu.key ? null : menu.key))}
                          >
                            {menu.label}
                          </button>
                          {openMenu === menu.key && (
                            <div className="studio-file-menu" role="menu" {...menuDrag}>
                              {MENU_ITEMS[menu.key].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  role="menuitem"
                                  className={`studio-file-menu-item${menu.key === "image" && studioSection === item.key ? " is-active" : ""}`}
                                  disabled={item.disabled}
                                  onClick={() => {
                                    setOpenMenu(null);
                                    item.run();
                                  }}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <button key={menu.key} type="button" role="menuitem" className="studio-menubar-item">
                          {menu.label}
                        </button>
                      )
                    )}
                  </div>
                  <div className="search-bar-studio-divider" />
                  {/* 뷰포트: 지금 넘겨 보고 있는 선택 파일의 미리보기(이미지가 아니면 파일 아이콘). */}
                  <div className={`studio-viewport${studioHasTarget ? " has-file" : ""}`}>
                    {studioPreviewUrl ? (
                      <img className="studio-viewport-img" src={studioPreviewUrl} alt="" draggable={false} />
                    ) : (
                      <span className="studio-viewport-empty">
                        <FileIcon size={40} />
                      </span>
                    )}
                  </div>
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
              placeholder={saveNameEntry ? "저장할 이름" : textEntryOpen ? "여기에 입력하세요" : "검색"}
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
            {!panelOpen &&
              (importMode ? (
                // 불러오기 모드: 스튜디오 버튼 대신 확인 버튼. 누르면 고른 항목으로 스튜디오가 다시 열린다.
                <button
                  type="button"
                  className="search-bar-inline-confirm"
                  onClick={onConfirmImport}
                  disabled={!importCount}
                >
                  확인
                </button>
              ) : (
                <button
                  type="button"
                  className="search-bar-open-studio-btn"
                  aria-label="스튜디오 열기"
                  onClick={onOpenStudio}
                >
                  <LayersIcon size={18} />
                </button>
              ))}
            {/* 확인(적용) 진행 막대: 확인 버튼 바로 왼쪽, 세로는 확인 버튼의 1/2, 가로는 3배. 가운데에
                진행도를 %로 쓴다. 다 끝나면 1초 뒤 사라진다(App.jsx). 있는 동안 스튜디오는 잠긴다. */}
            {studioActive && studioProgress && (
              <div
                className="studio-confirm-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((studioProgress.fraction ?? studioProgress.done / studioProgress.total) * 100)}
              >
                <div
                  className="studio-confirm-progress-fill"
                  style={{ width: `${Math.round((studioProgress.fraction ?? studioProgress.done / studioProgress.total) * 100)}%` }}
                />
                <span className="studio-confirm-progress-text">
                  {Math.round((studioProgress.fraction ?? studioProgress.done / studioProgress.total) * 100)}%
                </span>
              </div>
            )}
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
