import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "./components/PageHeader";
import BottomSearchBar from "./components/BottomSearchBar";
import SplashScreen from "./components/SplashScreen";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import FilesPage from "./pages/FilesPage";
import TransfersPage from "./pages/TransfersPage";
import TrashPage from "./pages/TrashPage";
import TagsPage from "./pages/TagsPage";
import FileViewer from "./pages/FileViewer";
import SplitCompareViewer from "./pages/SplitCompareViewer";
import Toast from "./components/Toast";
import AddonStorePage from "./pages/AddonStorePage";
import {
  clearSession,
  loadSession,
  saveSession,
  setToolkitAlwaysOn as persistToolkitAlwaysOn,
  setToolkitLayout as persistToolkitLayout,
  verifySession,
} from "./lib/session";
import {
  clearFolderThumbnail,
  createFolder,
  createSplitPreset,
  downloadFile,
  downloadFolderAsZip,
  downloadSelectionAsZip,
  downloadSplitPresetFiles,
  listFiles,
  moveFiles,
  optimizeFiles,
  renameFiles,
  setBlur,
  setFavorite,
  setFolderThumbnail,
  setInfoRevealed,
  setTag,
  splitPresetParts,
  trashFiles,
  uploadFile,
} from "./lib/drive";
import { isImage, isVideo } from "./lib/thumbnail";
import { isSearchActive } from "./lib/search";
import { loadTheme, saveTheme } from "./lib/theme";
import { BASE_TOOL_IDS, installedAddonIds, normalizeLayout } from "./lib/toolkit";
import { isOptimizableFile, OPTIMIZE_LEVELS } from "./lib/optimize";
import { dedupeStrings } from "./lib/dedupe";

const TOAST_MS = 2000;

const THEME_COLORS = { dark: "#1B1B1B", light: "#F5F5F7" };

export default function App() {
  // 설정의 테마 스위치가 고른 값 — "system"(기기 설정을 그대로 따름) |
  // "light" | "dark". 기기에 저장된 값이 있으면 그걸 따르고, 처음
  // 접속이라 저장된 값이 없으면 "system"이 기본값이다.
  const [themeMode, setThemeMode] = useState(() => loadTheme() ?? "system");
  // themeMode가 "system"일 때 실제로 적용할 밝기는 OS 설정을 실시간으로
  // 따라간다 — 다른 모드와 달리 여기서만 앱을 열어 둔 채로 기기 설정이
  // 바뀌어도 즉시 반영된다.
  const [systemDark, setSystemDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const theme = themeMode === "system" ? (systemDark ? "dark" : "light") : themeMode;

  const handleChangeThemeMode = (mode) => {
    setThemeMode(mode);
    saveTheme(mode);
  };

  // 저장된 토큰이 서버에서도 유효한지 확인될 때까지는 아무것도 그리지 않는다
  // (로그인 화면이 잠깐 번쩍이는 것을 막기 위함).
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  // 세션 확인이 끝난 뒤에도, 파일 탭의 첫 목록을 실제로 다 받아 오기
  // 전까지는 스플래시 화면을 계속 띄운다(아래 FilesPage의 onReady가 켠다).
  // 새로고침할 때마다 이 상태도 처음(false)으로 돌아가므로 매번 다시 뜬다.
  const [initialFilesReady, setInitialFilesReady] = useState(false);

  // 로그인 화면(AuthPage)은 기기·앱 설정과 무관하게 항상 라이트모드로
  // 고정한다 — session이 없는 동안은 아래에서 AuthPage만 그려지므로, 그
  // 사이엔 실제 theme 대신 강제로 "light"를 적용한다.
  useEffect(() => {
    const effectiveTheme = session ? theme : "light";
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[effectiveTheme]);
  }, [theme, session]);

  // 설정의 "스튜디오 툴킷 항상 활성화" 체크박스 값. 실제로 툴킷이 보이는지는
  // 아래 toolkitVisible이 결정한다(이 설정이 꺼져 있어도 선택 중이면 뜬다).
  const [toolkitAlwaysOn, setToolkitAlwaysOn] = useState(false);
  // 스튜디오 툴킷 도구 순서(애드온 포함). 계정(app_users.toolkit_layout)에
  // 저장되며 애드온 스토어의 추가, 설정의 사용자 정렬·휴지통 삭제가 바꾼다.
  const [toolkitLayout, setToolkitLayoutState] = useState(() => normalizeLayout(BASE_TOOL_IDS));
  // 파일 탭 헤더의 톱니바퀴 버튼으로 여는 설정 화면. 그 안의 즐겨찾기·
  // 애드온 스토어 행이 각각 showFavorites·showAddonStore를 켜는 동안에도
  // showSettings 자신은 꺼지지 않은 채로 남아 있어서, 즐겨찾기·애드온
  // 스토어에서 뒤로가기하면 파일 화면이 아니라 설정 화면으로 돌아간다
  // (휴지통·태그도 같은 방식).
  const [showSettings, setShowSettings] = useState(false);
  // 설정 → 즐겨찾기. true면 파일 화면 자리에 즐겨찾기 목록(FilesPage)이
  // 뜨고 검색·스튜디오 툴킷이 파일 화면과 똑같이 동작한다.
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAddonStore, setShowAddonStore] = useState(false);
  // 팔레트 추출 애드온(v1.1)의 대상 파일. null이면 닫힌 상태 — 열리면 별도
  // 모달이 아니라 FileViewer를 paletteMode로 띄운다.
  const [paletteViewerItem, setPaletteViewerItem] = useState(null);
  // 스플릿 비교 애드온의 대상 두 파일 [A, B]. null이면 닫힌 상태.
  const [splitCompareTargets, setSplitCompareTargets] = useState(null);
  // 하이라이트 클립 애드온의 대상 동영상. null이면 닫힌 상태 — 열리면
  // FileViewer가 clipMode로 떠서 구간을 찍고 목록을 보여준다.
  const [clipViewerItem, setClipViewerItem] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(0);

  // 파일 탭(웹드라이브) 상태
  const [viewMode, setViewMode] = useState("gallery");
  const [folderPath, setFolderPath] = useState([]); // [{id, name}] — 루트는 빈 배열
  const [refreshKey, setRefreshKey] = useState(0);
  // 검색바에 입력된 원문. 비어 있지 않으면 FilesPage가 지금 폴더 대신 전체
  // 드라이브 검색 결과를 보여준다(파싱은 src/lib/search.js).
  const [searchQuery, setSearchQuery] = useState("");
  // 지금 폴더에서 FilesPage가 실제로 보여주고 있는 항목들. "전체 선택"과
  // 선택 항목 다운로드/삭제가 파일의 r2_key 등 전체 정보를 봐야 해서 필요하다.
  const [visibleItems, setVisibleItems] = useState([]);
  // 꾹 눌러(또는 전체 선택으로) 선택된 항목의 id 집합.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [showTags, setShowTags] = useState(false);
  // 스튜디오 툴킷의 삭제(휴지통) 아이콘을 누르면 켜진다. 이 동작만 별도
  // 모달 대신 하단 검색바가 위로 확장되며 그 자리에서 확인을 받는다
  // (BottomSearchBar 참고) — 다른 삭제·복원 확인은 전부 그대로 ConfirmModal.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // 스튜디오 툴킷의 편집(연필) 아이콘으로 연 이름 바꾸기. 삭제 확인·새 폴더와
  // 같은 방식으로 하단 검색바가 확장되는 패널을 쓴다. 단일 선택이면
  // 이름 하나만 편집하는 renameOpen을, 여러 개 선택이면 이전·다음 화살표로
  // 하나씩 넘기며 편집하는(검색바 입력창 하나를 계속 재사용) multiRenameOpen을
  // 쓴다 — 패널 자체는 항상 같은 크기를 유지한다.
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [multiRenameOpen, setMultiRenameOpen] = useState(false);
  const [multiRenameItems, setMultiRenameItems] = useState([]);
  const [multiRenameIndex, setMultiRenameIndex] = useState(0);
  // 스튜디오 툴킷의 이동(→) 아이콘. 삭제 확인과 같은 방식으로 하단 검색바가
  // 확장되는 패널을 쓴다. 패널 안에서 드라이브를 폴더별로 눌러 내려가다가
  // 확인을 누르면 지금 들어와 있는 폴더로 옮긴다(movePath가 빈 배열이면
  // 최상위). moveRows는 지금 보고 있는 폴더의 목록이다.
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePath, setMovePath] = useState([]); // [{ id, name }]
  const [moveRows, setMoveRows] = useState([]);
  const [moveRowsState, setMoveRowsState] = useState("loading"); // loading | ready | error
  // 스튜디오 툴킷의 태그(#) 아이콘. 이름 바꾸기와 똑같은 구조로 단일/다중
  // 패널로 나뉜다 — 다만 태그는 비어 있어도 되고(전부 지우는 것도 유효한
  // 값) 값이 같아도 되므로 확인 버튼이 빈 값이라고 비활성화되지 않고,
  // 다중 패널에도 "번호 붙이기"는 없다(전체 지우기·전체 적용만 있다).
  const [tagOpen, setTagOpen] = useState(false);
  const [tagValue, setTagValue] = useState("");
  const [tagTargetId, setTagTargetId] = useState(null);
  const [multiTagOpen, setMultiTagOpen] = useState(false);
  const [multiTagItems, setMultiTagItems] = useState([]);
  const [multiTagIndex, setMultiTagIndex] = useState(0);
  // 스튜디오 툴킷의 용량 압축(원그래프) 아이콘. 이름 바꾸기·태그와 똑같은
  // 단일/다중 구조를 쓴다 — 다만 편집하는 값이 이름이나 태그 문자열이
  // 아니라 품질 단계(0=낮음/1=중간/2=높음)다. 폴더나 이미지가 아닌 파일은
  // 대상에서 빠진다(캔버스로 다시 인코딩할 수 있는 게 이미지뿐이라서).
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeTargetId, setOptimizeTargetId] = useState(null);
  const [optimizeLevel, setOptimizeLevel] = useState(1);
  const [multiOptimizeOpen, setMultiOptimizeOpen] = useState(false);
  const [multiOptimizeItems, setMultiOptimizeItems] = useState([]); // [{ id, name, level }]
  const [multiOptimizeIndex, setMultiOptimizeIndex] = useState(0);
  // 폴더 썸네일 애드온(인물 아이콘). 이동 패널과 같은 폴더 탐색 UI를 재사용해,
  // 그 안에서 이미지·움짤·동영상 파일 하나를 골라 지금 선택된 폴더의 대표
  // 썸네일로 지정한다. 이름 바꾸기·태그·최적화와 같은 단일/다중 구조를
  // 쓰되, 폴더가 아닌 항목은 애초에 대상에서 빠진다(파일에서 실행하면 조용히
  // 아무 일도 하지 않는다). thumbnailPath/Rows/RowsState는 단일·다중 공통 —
  // 지금 활성화된 대상 하나에 대해서만 의미 있는 탐색 상태다.
  const [thumbnailOpen, setThumbnailOpen] = useState(false);
  const [thumbnailTargetId, setThumbnailTargetId] = useState(null);
  const [thumbnailSourceId, setThumbnailSourceId] = useState(null);
  const [multiThumbnailOpen, setMultiThumbnailOpen] = useState(false);
  const [multiThumbnailItems, setMultiThumbnailItems] = useState([]); // [{ id, name, sourceId }]
  const [multiThumbnailIndex, setMultiThumbnailIndex] = useState(0);
  const [thumbnailPath, setThumbnailPath] = useState([]); // [{ id, name }]
  const [thumbnailRows, setThumbnailRows] = useState([]);
  const [thumbnailRowsState, setThumbnailRowsState] = useState("loading"); // loading | ready | error
  // 헤더 삼점 버튼의 "새 폴더". 별도 모달 대신 삭제 확인과 같은 방식으로
  // 하단 검색바가 위로 확장되며 그 자리에서 이름을 입력받는다(BottomSearchBar
  // 참고). 둘 다 같은 패널 자리를 쓰므로 동시에 열리지 않는다.
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 전송(업로드/다운로드) 상태. 진행 중인 것이 있을 때만 헤더에 버튼이 뜬다.
  const [transfers, setTransfers] = useState([]);
  const [showTransfers, setShowTransfers] = useState(false);
  // 헤더 버튼 테두리에 도는 원형 게이지용 전체 진행도(0~1). 여러 파일을 한 번에
  // 올릴 때는 "지금 파일까지의 진행률"이 아니라 배치 전체 기준으로 계산한다.
  const [transferRing, setTransferRing] = useState(0);

  // 이미지·영상은 누르면 다운로드하지 않고 이 화면에서 바로 크게 보여준다.
  // 뷰어 안에서 스와이프로 이전/다음으로 넘기려면 지금 폴더의 미디어 목록과
  // 그 안에서 몇 번째를 열었는지가 필요하다.
  const [viewerIndex, setViewerIndex] = useState(null);
  // 스플릿 프리셋 항목(split_pair가 있는 항목)은 일반 뷰어로 스와이프해
  // 넘어가는 목록에서 뺀다 — 그 항목은 항상 직접 탭해서 스플릿 비교 화면
  // 으로만 열려야 하기 때문이다(handleOpenFile 참고).
  const mediaItems = useMemo(
    () => visibleItems.filter((it) => (isImage(it.mime) || isVideo(it.mime)) && !it.split_pair),
    [visibleItems]
  );

  useEffect(() => {
    const stored = loadSession();
    if (!stored?.token) {
      setCheckingSession(false);
      return;
    }
    let cancelled = false;
    verifySession(stored.token).then((valid) => {
      if (cancelled) return;
      if (valid) {
        saveSession(valid);
        setSession(valid);
      } else {
        clearSession();
      }
      setCheckingSession(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 세션이 (처음 로드되거나 막 로그인해서) 준비되면, 계정에 저장돼 있던
  // "스튜디오 툴킷 항상 활성화" 값을 그대로 불러온다 — 다른 기기에서
  // 로그인해도 이 설정이 유지되게 하기 위함이다.
  useEffect(() => {
    if (session) {
      setToolkitAlwaysOn(Boolean(session.toolkitAlwaysOn));
      setToolkitLayoutState(normalizeLayout(session.toolkitLayout ?? BASE_TOOL_IDS));
    }
  }, [session]);

  // 체크박스를 바꾸면 서버에 먼저 저장하고, 저장이 확인된 뒤에야 화면에
  // 반영한다 — 먼저 화면부터 바꿔 버리면(낙관적 갱신) 저장 요청이 끝나기도
  // 전에 아이폰 PWA를 백그라운드로 보내거나 완전히 종료했을 때 요청이
  // 중간에 끊겨 실제로는 저장되지 않았는데도 사용자는 저장된 줄 알고
  // 넘어가 버리는 문제가 있었다(재접속하면 사라져 있는 것처럼 보임).
  const handleToggleToolkitAlwaysOn = async (value) => {
    try {
      await persistToolkitAlwaysOn(session.token, value);
      setToolkitAlwaysOn(value);
    } catch {
      window.alert("설정을 저장하지 못했습니다");
    }
  };

  // 툴킷 레이아웃 변경(애드온 추가·삭제, 정렬)도 마찬가지로 서버 저장이
  // 성공한 뒤에만 화면(체크 표시·툴킷 바)에 반영한다 — 위와 같은 이유로,
  // 추가한 순간 바로 체크 표시부터 뜨면 실제 저장 여부와 무관하게 성공한
  // 것처럼 보여 왔다.
  const changeToolkitLayout = async (nextLayout, action, addon = null) => {
    const next = normalizeLayout(nextLayout);
    try {
      await persistToolkitLayout(session.token, next, action, addon);
      setToolkitLayoutState(next);
    } catch {
      window.alert("툴킷 설정을 저장하지 못했습니다");
    }
  };

  const showToast = (message) => {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const parentId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const activeTransfer = useMemo(() => transfers.find((t) => t.status === "active"), [transfers]);

  // 폴더를 옮기거나 검색어가 바뀌면(검색 결과 자체가 통째로 달라지므로)
  // 이전에 보이던 항목 기준의 선택은 의미가 없다.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [parentId, searchQuery, showFavorites]);

  // 삭제 확인 패널이 열려 있는 동안 검색바에 검색어를 입력하면(패널이 열려
  // 있어도 검색바 자체는 계속 눌린다) 폴더/검색 결과가 바뀌어 선택이 통째로
  // 풀릴 수 있다 — 그러면 확인 대상 자체가 없어진 것이므로 패널도 닫는다.
  useEffect(() => {
    if (!deleteConfirmOpen) return;
    if (selectedIds.size === 0) setDeleteConfirmOpen(false);
  }, [selectedIds, deleteConfirmOpen]);

  // 단일 이름 바꾸기 패널도 대상 선택이 통째로 사라지면 같은 이유로 닫는다.
  useEffect(() => {
    if (!renameOpen) return;
    if (selectedIds.size === 0) {
      setRenameOpen(false);
      setRenameName("");
      setRenameTargetId(null);
    }
  }, [selectedIds, renameOpen]);

  // 다중 이름 바꾸기 패널도 마찬가지.
  useEffect(() => {
    if (!multiRenameOpen) return;
    if (selectedIds.size === 0) {
      setMultiRenameOpen(false);
      setMultiRenameItems([]);
      setMultiRenameIndex(0);
    }
  }, [selectedIds, multiRenameOpen]);

  // 단일/다중 태그 패널도 마찬가지.
  useEffect(() => {
    if (!tagOpen) return;
    if (selectedIds.size === 0) {
      setTagOpen(false);
      setTagValue("");
      setTagTargetId(null);
    }
  }, [selectedIds, tagOpen]);
  useEffect(() => {
    if (!multiTagOpen) return;
    if (selectedIds.size === 0) {
      setMultiTagOpen(false);
      setMultiTagItems([]);
      setMultiTagIndex(0);
    }
  }, [selectedIds, multiTagOpen]);
  // 최적화 패널은 폴더가 대상에서 빠지므로(용량 압축은 이미지 파일만
  // 가능하다) "선택이 0개"가 아니라 "폴더를 뺀 대상이 0개"일 때 닫아야
  // 한다 — 그래서 아래 재계산 효과 안에서 함께 처리한다(단독 효과 없음).

  // 이름 바꾸기 패널이 열린 채로도 다른 파일을 탭해 선택을 더하거나 뺄 수
  // 있다(빈 화면 스크림에 뚫린 구멍을 통해 타일 클릭이 그대로 전달된다).
  // 그러면 이 효과가 선택이 바뀔 때마다 편집 중인 항목을 다시 계산한다 —
  // 이미 입력해 둔 값(단일 칸이든 다중 배열의 항목이든)은 그대로 이어가고,
  // 새로 추가된 항목은 파일의 원래 이름을 기본값으로 채운다. 선택이 1개로
  // 줄면 단일 패널로, 2개 이상이면 다중 패널로 자동 전환된다. 선택이
  // 0개가 되는 경우는 위 두 효과가 이미 처리하므로 여기서는 손대지 않는다.
  useEffect(() => {
    if (!renameOpen && !multiRenameOpen) return;
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length === 0) return;
    const valueFor = (it) => {
      const fromMulti = multiRenameItems.find((x) => x.id === it.id);
      if (fromMulti) return fromMulti.name;
      if (renameOpen && renameTargetId === it.id) return renameName;
      return it.name;
    };
    if (targets.length === 1) {
      const only = targets[0];
      const nextName = valueFor(only);
      setMultiRenameOpen(false);
      setMultiRenameItems([]);
      setMultiRenameIndex(0);
      setRenameTargetId(only.id);
      setRenameName(nextName);
      setRenameOpen(true);
      return;
    }
    const nextItems = targets.map((it) => ({ id: it.id, name: valueFor(it), originalName: it.name, mime: it.mime }));
    setRenameOpen(false);
    setRenameName("");
    setRenameTargetId(null);
    setMultiRenameItems(nextItems);
    setMultiRenameIndex((i) => Math.min(i, nextItems.length - 1));
    setMultiRenameOpen(true);
  }, [selectedIds]);

  // 태그 패널도 같은 방식으로 선택 변화에 맞춰 다시 계산한다.
  useEffect(() => {
    if (!tagOpen && !multiTagOpen) return;
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length === 0) return;
    const valueFor = (it) => {
      const fromMulti = multiTagItems.find((x) => x.id === it.id);
      if (fromMulti) return fromMulti.tag;
      if (tagOpen && tagTargetId === it.id) return tagValue;
      return it.tag || "";
    };
    if (targets.length === 1) {
      const only = targets[0];
      const nextValue = valueFor(only);
      setMultiTagOpen(false);
      setMultiTagItems([]);
      setMultiTagIndex(0);
      setTagTargetId(only.id);
      setTagValue(nextValue);
      setTagOpen(true);
      return;
    }
    const nextItems = targets.map((it) => ({ id: it.id, tag: valueFor(it), name: it.name, mime: it.mime }));
    setTagOpen(false);
    setTagValue("");
    setTagTargetId(null);
    setMultiTagItems(nextItems);
    setMultiTagIndex((i) => Math.min(i, nextItems.length - 1));
    setMultiTagOpen(true);
  }, [selectedIds]);

  // 최적화 패널도 같은 방식으로 선택 변화에 맞춰 다시 계산한다 — 다만
  // 폴더는 애초에 대상이 아니므로 걸러내고, 대상이 하나도 안 남으면(선택은
  // 남아 있어도 전부 폴더뿐이면) 패널을 직접 닫는다(다른 두 효과처럼 별도
  // "0개면 닫기" 효과에 기대지 않는다 — selectedIds.size는 0이 아닐 수
  // 있어서다).
  useEffect(() => {
    if (!optimizeOpen && !multiOptimizeOpen) return;
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && !it.is_folder);
    if (targets.length === 0) {
      setOptimizeOpen(false);
      setOptimizeTargetId(null);
      setMultiOptimizeOpen(false);
      setMultiOptimizeItems([]);
      setMultiOptimizeIndex(0);
      return;
    }
    const levelFor = (it) => {
      const fromMulti = multiOptimizeItems.find((x) => x.id === it.id);
      if (fromMulti) return fromMulti.level;
      if (optimizeOpen && optimizeTargetId === it.id) return optimizeLevel;
      return 1;
    };
    if (targets.length === 1) {
      const only = targets[0];
      const nextLevel = levelFor(only);
      setMultiOptimizeOpen(false);
      setMultiOptimizeItems([]);
      setMultiOptimizeIndex(0);
      setOptimizeTargetId(only.id);
      setOptimizeLevel(nextLevel);
      setOptimizeOpen(true);
      return;
    }
    const nextItems = targets.map((it) => ({ id: it.id, name: it.name, mime: it.mime, level: levelFor(it) }));
    setOptimizeOpen(false);
    setOptimizeTargetId(null);
    setMultiOptimizeItems(nextItems);
    setMultiOptimizeIndex((i) => Math.min(i, nextItems.length - 1));
    setMultiOptimizeOpen(true);
  }, [selectedIds]);

  // 폴더 썸네일 패널도 같은 방식으로 선택 변화에 맞춰 다시 계산한다 — 다만
  // 최적화와 반대로 "폴더만"이 대상이라(파일은 애초에 대상이 아니다), 대상이
  // 하나도 안 남으면(선택은 남아 있어도 전부 파일뿐이면) 패널을 직접 닫는다.
  useEffect(() => {
    if (!thumbnailOpen && !multiThumbnailOpen) return;
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && it.is_folder);
    if (targets.length === 0) {
      setThumbnailOpen(false);
      setThumbnailTargetId(null);
      setThumbnailSourceId(null);
      setMultiThumbnailOpen(false);
      setMultiThumbnailItems([]);
      setMultiThumbnailIndex(0);
      return;
    }
    const sourceFor = (it) => {
      const fromMulti = multiThumbnailItems.find((x) => x.id === it.id);
      if (fromMulti) return fromMulti.sourceId;
      if (thumbnailOpen && thumbnailTargetId === it.id) return thumbnailSourceId;
      return null;
    };
    if (targets.length === 1) {
      const only = targets[0];
      const nextSource = sourceFor(only);
      setMultiThumbnailOpen(false);
      setMultiThumbnailItems([]);
      setMultiThumbnailIndex(0);
      setThumbnailTargetId(only.id);
      setThumbnailSourceId(nextSource);
      setThumbnailOpen(true);
      return;
    }
    const nextItems = targets.map((it) => ({ id: it.id, name: it.name, sourceId: sourceFor(it) }));
    setThumbnailOpen(false);
    setThumbnailTargetId(null);
    setThumbnailSourceId(null);
    setMultiThumbnailItems(nextItems);
    setMultiThumbnailIndex((i) => Math.min(i, nextItems.length - 1));
    setMultiThumbnailOpen(true);
  }, [selectedIds]);

  // 이동 패널이 열려 있는 동안, 지금 들어와 있는 폴더(movePath 맨 끝, 없으면
  // 최상위)의 목록을 받아 온다. 경로가 바뀔 때마다 다시 받는다.
  useEffect(() => {
    if (!moveOpen || !session) return;
    const destinationId = movePath.length ? movePath[movePath.length - 1].id : null;
    let cancelled = false;
    setMoveRowsState("loading");
    listFiles(session.token, destinationId)
      .then((data) => {
        if (cancelled) return;
        setMoveRows(data);
        setMoveRowsState("ready");
      })
      .catch(() => {
        if (!cancelled) setMoveRowsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [moveOpen, movePath, session?.token]);

  // 폴더 썸네일 패널이 열려 있는 동안, 지금 들어와 있는 폴더(thumbnailPath
  // 맨 끝, 없으면 최상위)의 목록을 받아 온다 — 이동 패널의 탐색 효과와
  // 똑같은 구조다.
  useEffect(() => {
    if ((!thumbnailOpen && !multiThumbnailOpen) || !session) return;
    const folderId = thumbnailPath.length ? thumbnailPath[thumbnailPath.length - 1].id : null;
    let cancelled = false;
    setThumbnailRowsState("loading");
    listFiles(session.token, folderId)
      .then((data) => {
        if (cancelled) return;
        setThumbnailRows(data);
        setThumbnailRowsState("ready");
      })
      .catch(() => {
        if (!cancelled) setThumbnailRowsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [thumbnailOpen, multiThumbnailOpen, thumbnailPath, session?.token]);

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  // 스튜디오 툴킷 "바"는 파일 화면(과 그 안에서 연 즐겨찾기 화면)에서만
  // 뜬다 — 이 두 화면만 PageHeader의 toolkitActive를 실제로 넘겨받는다.
  // 설정이 항상 켜 두었거나 선택된 파일이 하나라도 있으면 뜬다.
  const toolkitVisible = toolkitAlwaysOn || selectedIds.size > 0;
  const allSelected = visibleItems.length > 0 && visibleItems.every((it) => selectedIds.has(it.id));

  const toggleSelect = (item) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleToggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(visibleItems.map((it) => it.id)) : new Set());
  };

  const track = async (name, direction, run) => {
    const id = crypto.randomUUID();
    setTransfers((prev) => [{ id, name, direction, progress: 0, status: "active" }, ...prev]);
    const update = (patch) => setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await run((progress) => update({ progress }));
      update({ progress: 1, status: "done" });
      return true;
    } catch {
      update({ status: "error" });
      return false;
    }
  };

  // 확장자 제한 없이 고른 파일을 순서대로 R2에 올린다. 헤더의 원형 게이지는
  // 지금 올리는 파일 하나가 아니라 이번에 고른 파일 전체 기준 진행도를 보여준다.
  // 즐겨찾기 화면에서 눌렀다면 업로드 결과(방금 올린 파일)를 볼 수 있도록
  // 먼저 즐겨찾기를 닫아 파일 화면으로 나온다.
  const handleUpload = async (fileList) => {
    if (showFavorites) setShowFavorites(false);
    const files = Array.from(fileList ?? []);
    const target = parentId;
    setTransferRing(0);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ok = await track(file.name, "up", (onProgress) =>
        uploadFile({
          token: session.token,
          userId: session.userId,
          file,
          parentId: target,
          onProgress: (p) => {
            onProgress(p);
            setTransferRing((i + p) / files.length);
          },
        })
      );
      if (ok) setRefreshKey((k) => k + 1);
    }
  };

  // 새 폴더도 업로드와 같은 이유로, 즐겨찾기 화면에서 눌렀다면 먼저
  // 즐겨찾기를 닫은 뒤 패널을 연다. 삭제 확인 패널과 자리를 공유하므로
  // 열려 있었다면 먼저 닫는다.
  const handleNewFolder = () => {
    // 이미 새 폴더 패널이 열려 있는 채로 다시 누르면(더 보기 메뉴를 다시
    // 열어) 여는 대신 닫는다.
    if (newFolderOpen) {
      closeAllToolPanels();
      return;
    }
    if (showFavorites) setShowFavorites(false);
    closeAllToolPanels();
    setNewFolderName("");
    setNewFolderOpen(true);
  };

  const cancelNewFolder = () => {
    setNewFolderOpen(false);
    setNewFolderName("");
  };

  const confirmNewFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(session.token, name, parentId);
      setNewFolderOpen(false);
      setNewFolderName("");
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("폴더를 만들지 못했습니다");
    }
  };

  // 이미지·영상은 누르기만 해서 다운로드되면 안 되므로 뷰어를 띄운다.
  // 스플릿 프리셋 항목(split_pair가 있는 항목)은 일반 뷰어 대신 그 자리에서
  // 다시 A/B 스플릿 비교 화면을 띄운다. 그 외 파일만 눌렀을 때 바로 내려받는다.
  const handleOpenFile = (item) => {
    if (item.split_pair) {
      setSplitCompareTargets(splitPresetParts(item));
      return;
    }
    if (isImage(item.mime) || isVideo(item.mime)) {
      const idx = mediaItems.findIndex((it) => it.id === item.id);
      setViewerIndex(idx >= 0 ? idx : 0);
      return;
    }
    setTransferRing(0);
    return track(item.name, "down", (onProgress) =>
      downloadFile({
        token: session.token,
        item,
        onProgress: (p) => {
          onProgress(p);
          setTransferRing(p);
        },
      })
    );
  };

  // 선택된 항목을 내려받는다. 항목이 하나뿐이면 폴더는 "폴더 이름.zip"으로,
  // 일반 파일은 그대로 내려받는다. 2개 이상이면(폴더·파일 섞여 있어도) 전부
  // 한 zip 하나로 묶어 내려받는다.
  const handleDownloadSelected = async () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;

    if (targets.length === 1) {
      const item = targets[0];
      setTransferRing(0);
      const onProgress = (p) => setTransferRing(p);
      if (item.is_folder) {
        await track(`${item.name}.zip`, "down", (progress) =>
          downloadFolderAsZip({
            token: session.token,
            folder: item,
            onProgress: (p) => {
              progress(p);
              onProgress(p);
            },
          })
        );
      } else if (item.split_pair) {
        // 스플릿 프리셋 항목은 하나로 합쳐 받지 않고 A·B를 각자 따로 받는다.
        await track(item.name, "down", (progress) =>
          downloadSplitPresetFiles({
            token: session.token,
            item,
            onProgress: (p) => {
              progress(p);
              onProgress(p);
            },
          })
        );
      } else {
        await track(item.name, "down", (progress) =>
          downloadFile({
            token: session.token,
            item,
            onProgress: (p) => {
              progress(p);
              onProgress(p);
            },
          })
        );
      }
      return;
    }

    const zipName = `선택한 항목 ${targets.length}개.zip`;
    setTransferRing(0);
    await track(zipName, "down", (progress) =>
      downloadSelectionAsZip({
        token: session.token,
        items: targets,
        zipName,
        onProgress: (p) => {
          progress(p);
          setTransferRing(p);
        },
      })
    );
  };

  // 선택된 항목 중 이미지·영상, 그리고 폴더 썸네일이 지정된 폴더만 대상으로
  // 썸네일 블러를 토글한다(썸네일이 없는 폴더는 애초에 블러 걸 그림이 없으니
  // 제외). 전체가 이미 블러 상태면 풀고, 아니면(하나도 안 되어 있거나 일부만
  // 되어 있으면) 전부 건다 — 전체 선택 체크박스와 같은 "일부면 켜는 쪽으로"
  // 방식이다. 폴더를 블러해도 그 안의 개별 파일들에는 영향이 없다 — 폴더
  // 자신의 blurred 컬럼만 바뀐다.
  const handleBlurSelected = async () => {
    const targets = visibleItems.filter(
      (it) => selectedIds.has(it.id) && (isImage(it.mime) || isVideo(it.mime) || (it.is_folder && it.folder_thumb_key))
    );
    if (!targets.length) return;
    const nextBlurred = !targets.every((it) => it.blurred);
    try {
      await setBlur(session.token, targets.map((it) => it.id), nextBlurred);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("블러 처리하지 못했습니다");
    }
  };

  // 선택된 항목의 용량 표기를 토글한다. 블러와 같은 "일부면 켜는 쪽으로"
  // 방식이면서 저장 방식도 같다 — 서버에 저장돼 있어(info_revealed 컬럼)
  // 선택을 풀거나 새로고침·재접속해도 계속 표기된 채로 남는다. 선택은 그저
  // "지금부터 이 항목들 표기 여부를 바꾼다"는 대상 지정일 뿐, 표기 자체는
  // 선택 상태를 실시간으로 따라가지 않는다.
  const handleToggleInfo = async () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    const nextRevealed = !targets.every((it) => it.info_revealed);
    try {
      await setInfoRevealed(session.token, targets.map((it) => it.id), nextRevealed);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("정보 표기 설정을 저장하지 못했습니다");
    }
  };

  const handleTrashSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    try {
      await trashFiles(session.token, ids);
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("휴지통으로 이동하지 못했습니다");
    }
  };

  // 하단 검색바가 확장돼 보여주는 삭제 확인의 "확인" 버튼.
  const confirmTrashSelected = async () => {
    await handleTrashSelected();
    setDeleteConfirmOpen(false);
  };

  // 빈 화면을 눌러 삭제 확인을 취소했거나, 휴지통 아이콘을 다시 눌러
  // 닫은 경우에 쓰인다 — 다른 패널과 마찬가지로 선택은 그대로 유지한다.
  const cancelDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  // 선택된 항목으로 이름을 바꾼다. 단일 선택이면 이름 하나만 편집하는
  // renameOpen 패널을, 여러 개면 이전·다음 화살표로 하나씩 넘기며 편집하는
  // multiRenameOpen 패널을 연다.
  const handleEditSelected = () => {
    // 이미 이름 바꾸기 패널(단일이든 다중이든)이 열려 있는 채로 같은
    // 아이콘을 다시 누르면 여는 대신 닫는다 — 빈 화면을 눌러 취소하는
    // 것과 같은 처리다.
    if (renameOpen || multiRenameOpen) {
      closeAllToolPanels();
      return;
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    closeAllToolPanels();
    if (targets.length === 1) {
      setRenameTargetId(targets[0].id);
      setRenameName(targets[0].name);
      setRenameOpen(true);
      return;
    }
    setMultiRenameItems(targets.map((it) => ({ id: it.id, name: it.name, originalName: it.name, mime: it.mime })));
    setMultiRenameIndex(0);
    setMultiRenameOpen(true);
  };

  const cancelRename = () => {
    setRenameOpen(false);
    setRenameName("");
    setRenameTargetId(null);
  };

  // 하단 검색바가 확장돼 보여주는 이름 바꾸기 패널의 "확인" 버튼. 입력한
  // 그대로 저장한다 — 확장자를 지우고 싶어서 "1"처럼 확장자 없이 쳤는데
  // 마음대로 "1.jpg"로 되돌리면 안 되므로, 자동으로 덧붙이지 않는다.
  const confirmRename = async () => {
    const name = renameName.trim();
    if (!name || !renameTargetId) return;
    try {
      await renameFiles(session.token, [{ id: renameTargetId, name }]);
      cancelRename();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("이름을 바꾸지 못했습니다");
    }
  };

  const cancelMultiRename = () => {
    setMultiRenameOpen(false);
    setMultiRenameItems([]);
    setMultiRenameIndex(0);
  };

  // 지금 보고 있는(multiRenameIndex번째) 항목의 이름만 바꾼다 — 검색바
  // 입력창 하나를 화살표로 넘기며 재사용하는 방식이라, 다른 항목의 값은
  // 건드리지 않는다.
  const changeMultiRenameName = (value) => {
    setMultiRenameItems((prev) => prev.map((it, i) => (i === multiRenameIndex ? { ...it, name: value } : it)));
  };

  const prevMultiRename = () => setMultiRenameIndex((i) => Math.max(0, i - 1));
  const nextMultiRename = () => setMultiRenameIndex((i) => Math.min(multiRenameItems.length - 1, i + 1));

  // 첫 번째 항목의 값을 모두에게 그대로 적용한다.
  const applyAllMultiRename = () => {
    setMultiRenameItems((prev) => {
      const first = prev[0]?.name ?? "";
      return prev.map((it) => ({ ...it, name: first }));
    });
  };

  const clearAllMultiRename = () => {
    setMultiRenameItems((prev) => prev.map((it) => ({ ...it, name: "" })));
  };

  // 첫 번째 항목의 값을 기준점으로 삼는다: 끝에 붙은 숫자를 뽑아 그 숫자부터
  // 순서대로 이어 붙인다.
  const attachNumbersMultiRename = () => {
    setMultiRenameItems((prev) => {
      const first = prev[0]?.name || "";
      const match = first.match(/^(.*?)(\d+)$/);
      const prefix = match ? match[1] : first;
      const base = match ? parseInt(match[2], 10) : 1;
      return prev.map((it, i) => ({ ...it, name: `${prefix}${base + i}` }));
    });
  };

  // 확인을 누르는 순간 겹치는 이름에만 (1),(2),(3)…을 붙인다. 입력한 이름을
  // 그대로 쓰며, 확장자를 자동으로 덧붙이지 않는다.
  const confirmMultiRename = async () => {
    if (!multiRenameItems.every((it) => it.name.trim().length > 0)) return;
    try {
      const finalNames = dedupeStrings(multiRenameItems.map((it) => it.name.trim()));
      await renameFiles(session.token, multiRenameItems.map((it, i) => ({ id: it.id, name: finalNames[i] })));
      cancelMultiRename();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("이름을 바꾸지 못했습니다");
    }
  };

  // 삭제 확인·새 폴더·이동·단일/다중 이름 바꾸기·단일/다중 태그·단일/다중
  // 최적화는 전부 검색바 위 같은 패널 자리를 공유한다 — 그중 하나를 열기
  // 전에 항상 이걸 먼저 불러 나머지를 전부 닫는다.
  const closeAllToolPanels = () => {
    setDeleteConfirmOpen(false);
    setNewFolderOpen(false);
    cancelMove();
    cancelRename();
    cancelMultiRename();
    cancelTag();
    cancelMultiTag();
    cancelOptimize();
    cancelMultiOptimize();
    cancelThumbnail();
    cancelMultiThumbnail();
  };

  // 선택된 항목으로 이동 패널을 연다(항상 최상위에서 시작). 폴더를 옮기면
  // 하위 항목은 parent_id로 딸려 있어 서버에서 자동으로 함께 따라온다.
  const handleMoveSelected = () => {
    // 이미 이동 패널이 열려 있는 채로 같은 아이콘을 다시 누르면 여는
    // 대신 닫는다 — 빈 화면을 눌러 취소하는 것과 같은 처리다.
    if (moveOpen) {
      closeAllToolPanels();
      return;
    }
    if (!selectedIds.size) return;
    closeAllToolPanels();
    setMovePath([]);
    setMoveOpen(true);
  };

  const cancelMove = () => {
    setMoveOpen(false);
  };

  const moveNavigateInto = (row) => {
    setMovePath((p) => [...p, { id: row.id, name: row.name }]);
  };

  const moveNavigateBack = () => {
    setMovePath((p) => p.slice(0, -1));
  };

  // 확인 뒤에는 선택을 푼다 — 옮긴 항목은 지금 폴더에 더 이상 없으니
  // 이름 바꾸기·태그처럼 다음 동작을 위해 선택을 남겨 둘 이유가 없다.
  const confirmMove = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const destinationId = movePath.length ? movePath[movePath.length - 1].id : null;
    try {
      await moveFiles(session.token, ids, destinationId);
      cancelMove();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("옮기지 못했습니다");
    }
  };

  // 폴더 썸네일 애드온: 선택 중 폴더만 골라 연다. 파일만 선택돼 있으면(폴더가
  // 하나도 없으면) 조용히 아무 일도 하지 않는다 — 이 애드온은 폴더에서만
  // 동작한다.
  const handleThumbnailSelected = () => {
    if (thumbnailOpen || multiThumbnailOpen) {
      closeAllToolPanels();
      return;
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && it.is_folder);
    if (!targets.length) return;
    closeAllToolPanels();
    setThumbnailPath([]);
    if (targets.length === 1) {
      setThumbnailTargetId(targets[0].id);
      setThumbnailSourceId(null);
      setThumbnailOpen(true);
      return;
    }
    setMultiThumbnailItems(targets.map((it) => ({ id: it.id, name: it.name, sourceId: null })));
    setMultiThumbnailIndex(0);
    setMultiThumbnailOpen(true);
  };

  const cancelThumbnail = () => {
    setThumbnailOpen(false);
    setThumbnailTargetId(null);
    setThumbnailSourceId(null);
  };

  const thumbnailNavigateInto = (row) => {
    setThumbnailPath((p) => [...p, { id: row.id, name: row.name }]);
  };

  const thumbnailNavigateBack = () => {
    setThumbnailPath((p) => p.slice(0, -1));
  };

  // 지금 활성화된 대상(단일이면 그 폴더, 다중이면 지금 보고 있는 항목)에
  // 고른 파일을 지정한다. 폴더·지원하지 않는 파일 행은 애초에 클릭이
  // 안 되도록 BottomSearchBar 쪽에서 막는다(여기서는 다시 확인하지 않는다).
  const pickThumbnailSource = (row) => {
    if (thumbnailOpen) {
      setThumbnailSourceId(row.id);
      return;
    }
    if (multiThumbnailOpen) {
      setMultiThumbnailItems((prev) => prev.map((it, i) => (i === multiThumbnailIndex ? { ...it, sourceId: row.id } : it)));
    }
  };

  const confirmThumbnail = async () => {
    if (!thumbnailTargetId || !thumbnailSourceId) return;
    try {
      await setFolderThumbnail(session.token, thumbnailTargetId, thumbnailSourceId);
      cancelThumbnail();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 지정하지 못했습니다");
    }
  };

  const cancelMultiThumbnail = () => {
    setMultiThumbnailOpen(false);
    setMultiThumbnailItems([]);
    setMultiThumbnailIndex(0);
  };

  // 탐색 위치는 지금 보고 있는 대상 하나 기준이라, 다른 항목으로 넘어가면
  // 다시 최상위부터 찾아보게 한다.
  const prevMultiThumbnail = () => {
    setMultiThumbnailIndex((i) => Math.max(0, i - 1));
    setThumbnailPath([]);
  };
  const nextMultiThumbnail = () => {
    setMultiThumbnailIndex((i) => Math.min(multiThumbnailItems.length - 1, i + 1));
    setThumbnailPath([]);
  };

  // 각자 고른 파일을 순서대로(하나씩 await) 적용한다 — 병렬로 한꺼번에
  // 쏘지 않는 이유는 "순차적으로 적용됨"이라는 요구를 그대로 따르기 위해서다.
  const confirmMultiThumbnail = async () => {
    if (!multiThumbnailItems.length || multiThumbnailItems.some((it) => !it.sourceId)) return;
    try {
      for (const it of multiThumbnailItems) {
        await setFolderThumbnail(session.token, it.id, it.sourceId);
      }
      cancelMultiThumbnail();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 지정하지 못했습니다");
    }
  };

  // "지우기": 새로 고를 필요 없이 지금 지정된(혹은 지정하려던) 폴더 썸네일을
  // 바로 없앤다 — 확인 버튼을 거치지 않는 즉시 동작이다. 원래 폴더 아이콘으로
  // 돌아간다.
  const clearThumbnail = async () => {
    if (!thumbnailTargetId) return;
    try {
      await clearFolderThumbnail(session.token, thumbnailTargetId);
      cancelThumbnail();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 지우지 못했습니다");
    }
  };

  // 다중일 때 "지우기"는 지금 보고 있는 항목 하나만 지운다 — 패널은 열어
  // 둔 채로, 나머지 항목은 그대로 이전·다음으로 넘기며 계속 고를 수 있다.
  const clearCurrentMultiThumbnail = async () => {
    const current = multiThumbnailItems[multiThumbnailIndex];
    if (!current) return;
    try {
      await clearFolderThumbnail(session.token, current.id);
      setMultiThumbnailItems((prev) => prev.map((it, i) => (i === multiThumbnailIndex ? { ...it, sourceId: null } : it)));
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 지우지 못했습니다");
    }
  };

  // "전체 지우기"는 지금 다중으로 보고 있는 폴더 전부의 썸네일을 순서대로
  // 지운 뒤 패널을 닫는다.
  const clearAllMultiThumbnail = async () => {
    if (!multiThumbnailItems.length) return;
    try {
      for (const it of multiThumbnailItems) {
        await clearFolderThumbnail(session.token, it.id);
      }
      cancelMultiThumbnail();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 지우지 못했습니다");
    }
  };

  // 선택된 항목으로 태그를 단다. 단일 선택이면 이름 하나만 편집하는
  // tagOpen 패널을, 여러 개면 이전·다음 화살표로 하나씩 넘기며 편집하는
  // multiTagOpen 패널을 연다(이름 바꾸기와 똑같은 구조).
  const handleTagSelected = () => {
    // 이미 태그 패널(단일이든 다중이든)이 열려 있는 채로 같은 아이콘을
    // 다시 누르면 여는 대신 닫는다 — 빈 화면을 눌러 취소하는 것과 같은
    // 처리다.
    if (tagOpen || multiTagOpen) {
      closeAllToolPanels();
      return;
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    closeAllToolPanels();
    if (targets.length === 1) {
      setTagTargetId(targets[0].id);
      setTagValue(targets[0].tag || "");
      setTagOpen(true);
      return;
    }
    setMultiTagItems(targets.map((it) => ({ id: it.id, tag: it.tag || "", name: it.name, mime: it.mime })));
    setMultiTagIndex(0);
    setMultiTagOpen(true);
  };

  const cancelTag = () => {
    setTagOpen(false);
    setTagValue("");
    setTagTargetId(null);
  };

  // 태그는 이름과 달리 비어 있어도 유효한 값이라(태그를 지우는 것) 값이
  // 없다고 확인을 막지 않는다.
  const confirmTag = async () => {
    if (!tagTargetId) return;
    try {
      await setTag(session.token, [tagTargetId], tagValue.trim());
      cancelTag();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("태그를 저장하지 못했습니다");
    }
  };

  const cancelMultiTag = () => {
    setMultiTagOpen(false);
    setMultiTagItems([]);
    setMultiTagIndex(0);
  };

  const changeMultiTagValue = (value) => {
    setMultiTagItems((prev) => prev.map((it, i) => (i === multiTagIndex ? { ...it, tag: value } : it)));
  };

  const prevMultiTag = () => setMultiTagIndex((i) => Math.max(0, i - 1));
  const nextMultiTag = () => setMultiTagIndex((i) => Math.min(multiTagItems.length - 1, i + 1));

  const applyAllMultiTag = () => {
    setMultiTagItems((prev) => {
      const first = prev[0]?.tag ?? "";
      return prev.map((it) => ({ ...it, tag: first }));
    });
  };

  const clearAllMultiTag = () => {
    setMultiTagItems((prev) => prev.map((it) => ({ ...it, tag: "" })));
  };

  // 태그는 이름과 달리 여러 항목이 같은 값이어도 되므로(오히려 그게 태그의
  // 쓰임이다) 중복 방지 번호를 붙이지 않는다. 같은 태그 값끼리 묶어 그룹별로
  // 한 번씩만 호출한다(서버 RPC가 여러 id에 같은 태그 하나만 받는다).
  const confirmMultiTag = async () => {
    try {
      const groups = new Map();
      for (const { id, tag } of multiTagItems) {
        const key = tag || "";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(id);
      }
      await Promise.all([...groups.entries()].map(([tag, ids]) => setTag(session.token, ids, tag)));
      cancelMultiTag();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("태그를 저장하지 못했습니다");
    }
  };

  // 선택된 항목 중 폴더만 뺀 파일들로 최적화 패널을 연다(폴더는 자체 용량이
  // 없어 대상이 아니다). 단일 선택이면 품질 하나만 고르는 optimizeOpen을,
  // 여러 개면 이전·다음 화살표로 하나씩 넘기며 항목마다 다른 품질을 고를
  // 수 있는 multiOptimizeOpen을 연다(이름 바꾸기와 똑같은 구조). 기본값은
  // 둘 다 "중간"(인덱스 1)이다. 실제로 캔버스가 읽지 못하는 형식(이미지가
  // 아니거나 브라우저가 못 여는 포맷)은 압축 단계에서 그 파일만 건너뛴다 —
  // mime 문자열만으로 미리 걸러내면, 사진 형식에 따라 브라우저가 mime을
  // 빈 문자열로 주는 경우(예: 일부 환경의 HEIC) 정작 열리는 이미지까지
  // 패널 자체가 뜨지 않는 문제가 있었다.
  const handleOptimizeSelected = () => {
    // 이미 최적화 패널(단일이든 다중이든)이 열려 있는 채로 같은 아이콘을
    // 다시 누르면 여는 대신 닫는다 — 빈 화면을 눌러 취소하는 것과 같은
    // 처리다.
    if (optimizeOpen || multiOptimizeOpen) {
      closeAllToolPanels();
      return;
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && !it.is_folder);
    if (!targets.length) return;
    closeAllToolPanels();
    if (targets.length === 1) {
      setOptimizeTargetId(targets[0].id);
      setOptimizeLevel(1);
      setOptimizeOpen(true);
      return;
    }
    setMultiOptimizeItems(targets.map((it) => ({ id: it.id, name: it.name, mime: it.mime, level: 1 })));
    setMultiOptimizeIndex(0);
    setMultiOptimizeOpen(true);
  };

  const cancelOptimize = () => {
    setOptimizeOpen(false);
    setOptimizeTargetId(null);
  };

  // 확인 뒤에도 선택은 풀지 않는다(원래 모달 때부터 그랬다 — 압축 결과를
  // 바로 이어서 볼 수 있게).
  const confirmOptimize = async () => {
    const target = visibleItems.find((it) => it.id === optimizeTargetId);
    if (!target || !isOptimizableFile(target.name)) return;
    try {
      await optimizeFiles({ token: session.token, items: [target], ratioPercent: OPTIMIZE_LEVELS[optimizeLevel] });
      cancelOptimize();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("용량을 줄이지 못했습니다");
    }
  };

  const cancelMultiOptimize = () => {
    setMultiOptimizeOpen(false);
    setMultiOptimizeItems([]);
    setMultiOptimizeIndex(0);
  };

  const changeMultiOptimizeLevel = (level) => {
    setMultiOptimizeItems((prev) => prev.map((it, i) => (i === multiOptimizeIndex ? { ...it, level } : it)));
  };

  // 이름 바꾸기·태그의 "전체 적용"과 달리, 첫 항목이 아니라 지금 보고 있는
  // 항목의 값을 기준으로 삼는다 — 그 값을 자신과 그 뒤로 남은 항목에만
  // 적용한다(앞서 이미 따로 정해 둔 항목은 건드리지 않는다).
  const applyAllMultiOptimize = () => {
    setMultiOptimizeItems((prev) => {
      const level = prev[multiOptimizeIndex]?.level ?? 1;
      return prev.map((it, i) => (i >= multiOptimizeIndex ? { ...it, level } : it));
    });
  };

  const prevMultiOptimize = () => setMultiOptimizeIndex((i) => Math.max(0, i - 1));
  const nextMultiOptimize = () => setMultiOptimizeIndex((i) => Math.min(multiOptimizeItems.length - 1, i + 1));

  // 태그와 같은 방식으로, 같은 품질 값끼리 묶어 그룹별로 한 번씩만
  // optimizeFiles를 호출한다.
  const confirmMultiOptimize = async () => {
    const targets = multiOptimizeItems
      .map((it) => ({ level: it.level, file: visibleItems.find((v) => v.id === it.id) }))
      .filter((it) => it.file);
    if (!targets.length || targets.some((it) => !isOptimizableFile(it.file.name))) return;
    try {
      const groups = new Map();
      for (const { level, file } of targets) {
        if (!groups.has(level)) groups.set(level, []);
        groups.get(level).push(file);
      }
      await Promise.all(
        [...groups.entries()].map(([level, files]) =>
          optimizeFiles({ token: session.token, items: files, ratioPercent: OPTIMIZE_LEVELS[level] })
        )
      );
      cancelMultiOptimize();
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("용량을 줄이지 못했습니다");
    }
  };

  // 선택된 파일·폴더의 즐겨찾기를 토글한다. 블러와 같은 "일부면 켜는 쪽으로"
  // 방식이다 — 전부 즐겨찾기면 풀고, 아니면 전부 즐겨찾기한다.
  const handleFavoriteSelected = async () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    const next = !targets.every((it) => it.favorite);
    try {
      await setFavorite(session.token, targets.map((it) => it.id), next);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("즐겨찾기를 저장하지 못했습니다");
    }
  };

  const looksLikeImageFile = (it) =>
    isImage(it.mime) || isOptimizableFile(it.name) || /\.(gif|webp)$/i.test(it.name);

  // 기기에 따라 mime을 빈 문자열로 주는 경우가 있어 확장자도 같이 본다
  // (이미지 쪽 looksLikeImageFile과 같은 이유).
  const looksLikeVideoFile = (it) => isVideo(it.mime) || /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(it.name);

  // 팔레트 추출 애드온(v1.1): 한 번에 파일 하나에만 실행된다. 이미지 파일 딱
  // 하나가 선택돼 있을 때만 파일 클릭 시 뜨는 기본 뷰어를 palette 모드로
  // 연다. 그 외(아무것도 없거나 둘 이상, 또는 폴더·이미지가 아닌 파일)에는
  // 조용히 아무 일도 하지 않는다 — 실행 조건이 아닐 때 안내 토스트를
  // 띄우던 예전 방식 대신, 다른 도구들처럼 그냥 무응답으로 통일했다.
  const handlePaletteSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length !== 1 || targets[0].is_folder) return;
    const target = targets[0];
    if (!looksLikeImageFile(target)) return;
    setPaletteViewerItem(target);
  };

  // 스플릿 비교 애드온: 정확히 두 개의 이미지(움짤 포함)가 선택돼 있어야
  // 하며, 먼저 선택한 순서가 곧 A(왼쪽)·B(오른쪽)가 된다 — selectedIds는
  // Set이라 삽입 순서를 그대로 보존한다. 조건이 아니면(개수·종류 어느
  // 쪽이든) 조용히 아무 일도 하지 않는다.
  const handleSplitCompareSelected = () => {
    const targets = [...selectedIds].map((id) => visibleItems.find((it) => it.id === id)).filter(Boolean);
    if (targets.some((it) => it.is_folder || !looksLikeImageFile(it))) return;
    if (targets.length !== 2) return;
    setSplitCompareTargets(targets);
  };

  // 스플릿 비교 화면의 프리셋 저장: 지금 보고 있는 A/B 두 파일을 그대로
  // 복제해 최근 연 폴더(지금 parentId)에 저장한다. 복제본은 새 파일이라
  // 원본을 나중에 지워도 영향받지 않는다. 이름은 "프리셋_1", "프리셋_2"…
  // 순으로 붙이며, 그 폴더에 이미 프리셋이 있으면 이어서 번호를 매긴다.
  // 스플릿 비교 화면의 프리셋 저장: 지금 보고 있는 A/B 두 파일을 그대로
  // 복제해 최근 연 폴더(지금 parentId)에 항목 하나로 저장한다. 그 항목을
  // 열면 다시 A/B 스플릿 비교 화면이 뜨고, 다운로드하면 A·B가 각자 파일로
  // 나뉘어 저장된다(createSplitPreset/downloadSplitPresetFiles 참고).
  // 이름은 "프리셋_1", "프리셋_2"… 순으로 붙이며, 그 폴더에 이미 프리셋이
  // 있으면 이어서 번호를 매긴다.
  const handleSaveSplitPreset = async (itemA, itemB) => {
    const used = visibleItems
      .map((it) => /^프리셋_(\d+)/.exec(it.name))
      .filter(Boolean)
      .map((m) => parseInt(m[1], 10));
    const next = used.length ? Math.max(...used) + 1 : 1;
    try {
      await createSplitPreset({
        token: session.token,
        userId: session.userId,
        itemA,
        itemB,
        parentId,
        name: `프리셋_${next}`,
      });
      setRefreshKey((k) => k + 1);
      showToast("프리셋으로 저장했습니다");
    } catch {
      window.alert("프리셋을 저장하지 못했습니다");
    }
  };

  // 하이라이트 클립 애드온: 동영상 딱 하나가 선택돼 있을 때만 그 영상을
  // clipMode 뷰어로 연다. 구간 기록은 영상 하나를 기준으로만 뜻이 있으므로
  // 여러 개나 동영상이 아닌 파일이면 조용히 아무 일도 하지 않는다.
  const handleClipSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length !== 1 || targets[0].is_folder) return;
    const target = targets[0];
    if (!looksLikeVideoFile(target)) return;
    setClipViewerItem(target);
  };

  // 스튜디오 툴킷의 아이콘은 도구 id로 눌리고, 여기서 실제 동작에 연결한다.
  const handleTool = (id) => {
    switch (id) {
      case "info":
        return handleToggleInfo();
      case "trash":
        // 이미 삭제 확인 패널이 열려 있는 채로 휴지통 아이콘을 다시 누르면
        // 여는 대신 취소한다(선택도 함께 풀린다 — 빈 화면을 눌러 취소하는
        // 것과 같은 처리다).
        if (deleteConfirmOpen) {
          cancelDeleteConfirm();
          return;
        }
        if (selectedIds.size > 0) {
          closeAllToolPanels();
          setDeleteConfirmOpen(true);
        }
        return;
      case "download":
        return handleDownloadSelected();
      case "move":
        return handleMoveSelected();
      case "view":
        return setViewMode((v) => (v === "gallery" ? "list" : "gallery"));
      case "blur":
        return handleBlurSelected();
      case "optimize":
        return handleOptimizeSelected();
      case "favorite":
        return handleFavoriteSelected();
      case "tag":
        return handleTagSelected();
      case "rename":
        return handleEditSelected();
      case "palette":
        return handlePaletteSelected();
      case "split":
        return handleSplitCompareSelected();
      case "clip":
        return handleClipSelected();
      case "thumbnail":
        return handleThumbnailSelected();
      default:
        return undefined;
    }
  };

  // 애드온 스토어의 추가(+): 레이아웃 끝에 붙인다(이미 있으면 무시).
  const handleAddAddon = async (addonId) => {
    if (toolkitLayout.includes(addonId)) return;
    await changeToolkitLayout([...toolkitLayout, addonId], "add_addon", addonId);
  };

  // 애드온 스토어의 삭제(휴지통) 버튼: 설정의 사용자 정렬에서 휴지통으로
  // 드래그해 지우는 것과 같은 동작이다.
  const handleRemoveAddon = async (addonId) => {
    await changeToolkitLayout(
      toolkitLayout.filter((id) => id !== addonId),
      "remove_addon",
      addonId
    );
  };

  if (checkingSession) return <SplashScreen />;

  if (!session) {
    return (
      <AuthPage
        onLogin={(next) => {
          verifySession(next.token).then((valid) => {
            const resolved = valid ?? next;
            saveSession(resolved);
            setSession(resolved);
          });
        }}
      />
    );
  }

  if (showTrash) {
    return <TrashPage session={session} onBack={() => setShowTrash(false)} />;
  }

  if (showTags) {
    return <TagsPage session={session} onBack={() => setShowTags(false)} />;
  }

  if (showAddonStore) {
    return (
      <AddonStorePage
        installedIds={new Set(installedAddonIds(toolkitLayout))}
        onAdd={handleAddAddon}
        onRemove={handleRemoveAddon}
        onBack={() => setShowAddonStore(false)}
      />
    );
  }

  // 즐겨찾기가 열려 있는 동안엔(설정 → 즐겨찾기) 설정 화면이 그 뒤에 남아
  // 있어도 그리지 않는다 — 즐겨찾기를 닫으면(showFavorites=false) 이 조건이
  // 다시 참이 되어 설정 화면으로 자연스럽게 돌아간다.
  if (showSettings && !showFavorites) {
    return (
      <SettingsPage
        themeMode={themeMode}
        onChangeThemeMode={handleChangeThemeMode}
        toolkitActive={toolkitAlwaysOn}
        onToggleToolkit={handleToggleToolkitAlwaysOn}
        toolkitLayout={toolkitLayout}
        viewMode={viewMode}
        onChangeToolkitLayout={changeToolkitLayout}
        onResetToolkitLayout={() => changeToolkitLayout(BASE_TOOL_IDS, "reset")}
        onOpenTrash={() => setShowTrash(true)}
        onOpenTags={() => setShowTags(true)}
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenAddonStore={() => setShowAddonStore(true)}
        onBack={() => setShowSettings(false)}
        onLogout={() => {
          clearSession();
          setSession(null);
        }}
      />
    );
  }

  // 이 아래로는 showTrash/showTags/showAddonStore도 아니고, 설정도(즐겨찾기가
  // 열려 있지 않은 한) 아니므로 남은 화면은 파일 화면 아니면 즐겨찾기뿐이다.
  const favoritesView = showFavorites;
  const title = favoritesView
    ? "즐겨찾기"
    : folderPath.length
      ? folderPath[folderPath.length - 1].name
      : "파일";

  // 검색 결과·즐겨찾기에서 연 폴더는 지금 폴더 경로의 하위가 아니라 드라이브
  // 어디에나 있을 수 있으므로, 기존 경로에 이어 붙이지 않고 즐겨찾기를
  // 닫은 뒤 그 폴더를 새 최상위처럼 연다.
  const openFolder = (item) => {
    if (isSearchActive(searchQuery) || favoritesView) {
      setSearchQuery("");
      setShowFavorites(false);
      setFolderPath([{ id: item.id, name: item.name }]);
    } else {
      setFolderPath((p) => [...p, { id: item.id, name: item.name }]);
    }
  };

  return (
    <>
      {/* 이 화면(파일/즐겨찾기 탭)은 이미 마운트되어 뒤에서 첫 목록을 불러오는
          중이다 — 스플래시는 그 위를 덮고 있다가 로딩이 끝나면(initialFilesReady)
          사라지며 이미 준비된 화면으로 자연스럽게 전환된다. */}
      {!initialFilesReady && <SplashScreen />}
      {showTransfers ? (
        <TransfersPage transfers={transfers} onBack={() => setShowTransfers(false)} onClearAll={() => setTransfers([])} />
      ) : (
        <>
          <main className="page">
            <PageHeader
              title={title}
              resetKey={favoritesView ? "favorites" : "files"}
              toolkitActive={toolkitVisible}
              viewMode={viewMode}
              onUpload={handleUpload}
              onNewFolder={handleNewFolder}
              canGoBack={folderPath.length > 0 || favoritesView}
              onBack={() => {
                if (favoritesView) {
                  setShowFavorites(false);
                  setSearchQuery("");
                  setSelectedIds(new Set());
                } else {
                  setFolderPath((p) => p.slice(0, -1));
                }
              }}
              transferVisible={transfers.length > 0}
              transferInProgress={Boolean(activeTransfer)}
              transferDirection={(activeTransfer ?? transfers[0])?.direction}
              transferProgress={transferRing}
              onOpenTransfers={() => setShowTransfers(true)}
              allSelected={allSelected}
              onToggleSelectAll={handleToggleSelectAll}
              hasSelection={selectedIds.size > 0}
              infoVisible={(() => {
                const targets = visibleItems.filter((it) => selectedIds.has(it.id));
                return targets.length > 0 && targets.every((it) => it.info_revealed);
              })()}
              toolkitLayout={toolkitLayout}
              onTool={handleTool}
              onOpenSettings={favoritesView ? undefined : () => setShowSettings(true)}
            />
            <FilesPage
              session={session}
              viewMode={viewMode}
              parentId={parentId}
              favorites={favoritesView}
              searchQuery={searchQuery}
              onOpenFolder={openFolder}
              onOpenFile={handleOpenFile}
              refreshKey={refreshKey}
              selectionMode={selectedIds.size > 0}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onLongPressItem={toggleSelect}
              onItemsChange={setVisibleItems}
              onReady={() => setInitialFilesReady(true)}
            />
          </main>
          <BottomSearchBar
            key={favoritesView ? "favorites" : "files"}
            searchQuery={searchQuery}
            onSearch={handleSearch}
            confirmOpen={deleteConfirmOpen}
            onConfirmDelete={confirmTrashSelected}
            onCancelDelete={cancelDeleteConfirm}
            newFolderOpen={newFolderOpen}
            newFolderName={newFolderName}
            onChangeNewFolderName={setNewFolderName}
            onConfirmNewFolder={confirmNewFolder}
            onCancelNewFolder={cancelNewFolder}
            renameOpen={renameOpen}
            renameName={renameName}
            onChangeRenameName={setRenameName}
            onConfirmRename={confirmRename}
            onCancelRename={cancelRename}
            multiRenameOpen={multiRenameOpen}
            multiRenameItems={multiRenameItems}
            multiRenameIndex={multiRenameIndex}
            onChangeMultiRenameName={changeMultiRenameName}
            onPrevMultiRename={prevMultiRename}
            onNextMultiRename={nextMultiRename}
            onClearAllMultiRename={clearAllMultiRename}
            onApplyAllMultiRename={applyAllMultiRename}
            onAttachNumbersMultiRename={attachNumbersMultiRename}
            onConfirmMultiRename={confirmMultiRename}
            onCancelMultiRename={cancelMultiRename}
            tagOpen={tagOpen}
            tagValue={tagValue}
            onChangeTagValue={setTagValue}
            onConfirmTag={confirmTag}
            onCancelTag={cancelTag}
            multiTagOpen={multiTagOpen}
            multiTagItems={multiTagItems}
            multiTagIndex={multiTagIndex}
            onChangeMultiTagValue={changeMultiTagValue}
            onPrevMultiTag={prevMultiTag}
            onNextMultiTag={nextMultiTag}
            onClearAllMultiTag={clearAllMultiTag}
            onApplyAllMultiTag={applyAllMultiTag}
            onConfirmMultiTag={confirmMultiTag}
            onCancelMultiTag={cancelMultiTag}
            optimizeOpen={optimizeOpen}
            optimizeTargetName={visibleItems.find((it) => it.id === optimizeTargetId)?.name ?? ""}
            optimizeLevel={optimizeLevel}
            onChangeOptimizeLevel={setOptimizeLevel}
            onConfirmOptimize={confirmOptimize}
            onCancelOptimize={cancelOptimize}
            multiOptimizeOpen={multiOptimizeOpen}
            multiOptimizeItems={multiOptimizeItems}
            multiOptimizeIndex={multiOptimizeIndex}
            onChangeMultiOptimizeLevel={changeMultiOptimizeLevel}
            onApplyAllMultiOptimize={applyAllMultiOptimize}
            onPrevMultiOptimize={prevMultiOptimize}
            onNextMultiOptimize={nextMultiOptimize}
            onConfirmMultiOptimize={confirmMultiOptimize}
            onCancelMultiOptimize={cancelMultiOptimize}
            moveOpen={moveOpen}
            moveItemCount={selectedIds.size}
            movePath={movePath}
            moveRows={moveRows}
            moveRowsState={moveRowsState}
            moveExcludedIds={selectedIds}
            onMoveInto={moveNavigateInto}
            onMoveBack={moveNavigateBack}
            onConfirmMove={confirmMove}
            onCancelMove={cancelMove}
            thumbnailOpen={thumbnailOpen}
            thumbnailTargetName={visibleItems.find((it) => it.id === thumbnailTargetId)?.name ?? ""}
            thumbnailSourceId={thumbnailSourceId}
            thumbnailPath={thumbnailPath}
            thumbnailRows={thumbnailRows}
            thumbnailRowsState={thumbnailRowsState}
            onThumbnailInto={thumbnailNavigateInto}
            onThumbnailBack={thumbnailNavigateBack}
            onPickThumbnailSource={pickThumbnailSource}
            onConfirmThumbnail={confirmThumbnail}
            onCancelThumbnail={cancelThumbnail}
            onClearThumbnail={clearThumbnail}
            multiThumbnailOpen={multiThumbnailOpen}
            multiThumbnailItems={multiThumbnailItems}
            multiThumbnailIndex={multiThumbnailIndex}
            onPrevMultiThumbnail={prevMultiThumbnail}
            onNextMultiThumbnail={nextMultiThumbnail}
            onConfirmMultiThumbnail={confirmMultiThumbnail}
            onCancelMultiThumbnail={cancelMultiThumbnail}
            onClearCurrentMultiThumbnail={clearCurrentMultiThumbnail}
            onClearAllMultiThumbnail={clearAllMultiThumbnail}
          />
        </>
      )}
      {viewerIndex !== null && (
        <FileViewer
          session={session}
          items={mediaItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
      {paletteViewerItem && (
        <FileViewer
          session={session}
          items={[paletteViewerItem]}
          initialIndex={0}
          paletteMode
          onClose={() => setPaletteViewerItem(null)}
        />
      )}
      {clipViewerItem && (
        <FileViewer
          session={session}
          items={[clipViewerItem]}
          initialIndex={0}
          clipMode
          onClose={() => setClipViewerItem(null)}
        />
      )}
      {splitCompareTargets && (
        <SplitCompareViewer
          session={session}
          items={splitCompareTargets}
          onClose={() => setSplitCompareTargets(null)}
          onSavePreset={handleSaveSplitPreset}
        />
      )}
      <Toast message={toast} />
    </>
  );
}
