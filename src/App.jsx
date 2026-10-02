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
import DuplicatesPage from "./pages/DuplicatesPage";
import FileViewer from "./pages/FileViewer";
import SplitCompareViewer from "./pages/SplitCompareViewer";
import Toast from "./components/Toast";
import {
  clearSession,
  loadSession,
  saveSession,
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
  compressItemBlob,
  copyFileTo,
  renameFiles,
  replaceFileContent,
  setBlur,
  setFavorite,
  setFolderThumbnail,
  setInfoRevealed,
  setTag,
  splitPresetParts,
  thumbnailUrls,
  trashFiles,
  uploadFile,
} from "./lib/drive";
import { isImage, isVideo } from "./lib/thumbnail";
import { isSearchActive } from "./lib/search";
import { loadTheme, saveTheme } from "./lib/theme";
import { BASE_TOOL_IDS, normalizeLayout } from "./lib/toolkit";
import { isOptimizableFile, OPTIMIZE_LEVELS } from "./lib/optimize";
import { extensionOf } from "./lib/filename";
import { dedupeStrings } from "./lib/dedupe";

const TOAST_MS = 2000;

const THEME_COLORS = { dark: "#000000", light: "#F5F5F7" };

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

  // 스튜디오 툴킷 도구 순서. 계정(app_users.toolkit_layout)에 저장되며
  // 설정의 사용자 정렬이 바꾼다.
  const [toolkitLayout, setToolkitLayoutState] = useState(() => normalizeLayout(BASE_TOOL_IDS));
  // 파일 탭 헤더의 톱니바퀴 버튼으로 여는 설정 화면.
  const [showSettings, setShowSettings] = useState(false);
  // 아무것도 선택하지 않은 채 툴킷의 즐겨찾기(별) 아이콘을 누르면 열리는
  // 즐겨찾기 화면. true면 파일 화면 자리에 즐겨찾기 목록(FilesPage)이 뜨고
  // 검색·스튜디오 툴킷이 파일 화면과 똑같이 동작한다.
  const [showFavorites, setShowFavorites] = useState(false);
  // 스플릿 비교의 대상 두 파일 [A, B]. null이면 닫힌 상태.
  const [splitCompareTargets, setSplitCompareTargets] = useState(null);
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
  const [showDuplicates, setShowDuplicates] = useState(false);
  // 스튜디오 툴킷의 삭제(휴지통) 아이콘을 누르면 켜진다. 이 동작만 별도
  // 모달 대신 하단 검색바가 위로 확장되며 그 자리에서 확인을 받는다
  // (BottomSearchBar 참고) — 다른 삭제·복원 확인은 전부 그대로 ConfirmModal.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // 스튜디오 툴킷의 Studio 아이콘 — 이름 바꾸기·태그·용량 압축을 한 패널로
  // 합친 것. 단일 선택이면 studioOpen 하나, 여러 개 선택이면 이전·다음
  // 화살표로 하나씩 넘기며 편집하는 multiStudioOpen을 쓴다(패널 자체는
  // 항상 같은 크기). 품질(압축)은 사용자가 실제로 세그먼트를 눌러야만
  // (levelTouched) 확인 시 재압축한다 — 이름만 바꾸려고 확인을 눌렀는데
  // 매번 손실 압축이 다시 걸리면 안 되기 때문이다. 이름·태그는 원래
  // 이름 바꾸기·태그 패널처럼 값이 같든 다르든 확인 시 그대로 저장한다.
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTargetId, setStudioTargetId] = useState(null);
  const [studioName, setStudioName] = useState("");
  const [studioTag, setStudioTag] = useState("");
  const [studioLevel, setStudioLevel] = useState(1);
  const [studioLevelTouched, setStudioLevelTouched] = useState(false);
  // 스튜디오 메뉴 파일 > 불러오기. 불러오기 모드에서는 스튜디오 패널이 닫히고, 드라이브를
  // 폴더를 눌러 들어가며 터치만으로 파일을 고른다(폴더는 선택할 수 없고 들어가기만
  // 된다). 고른 항목은 폴더가 바뀌어도 유지돼야 해서 목록 선택(selectedIds)과 따로
  // id→항목 Map으로 들고 있다. 확인을 누르면 그 항목들로 스튜디오가 다시 열린다.
  const [importMode, setImportMode] = useState(false);
  const [importMap, setImportMap] = useState(() => new Map());
  // 불러오기로 연 스튜디오는 현재 폴더의 선택(selectedIds)과 무관한 항목을 쓰므로, 선택이
  // 바뀔 때 스튜디오 대상을 다시 계산하는 효과를 건너뛰고(studioFromImport), 미리보기용
  // 항목 정보를 따로 들고 있는다(studioSourceItems).
  const [studioFromImport, setStudioFromImport] = useState(false);
  // 스튜디오 세션(열어 둔 대상·입력값·진행 상황)은 패널을 잠시 닫아도(스크림을 누르거나 스튜디오
  // 버튼을 다시 눌러도) 종료되지 않고 그대로 유지된다. 패널이 보이는지만 studioVisible이
  // 정하고, 세션은 오직 패널의 X 버튼(endStudio)으로만 종료된다. 스튜디오 버튼은 세션이 있으면
  // 숨김/복원을 오간다.
  const [studioVisible, setStudioVisible] = useState(true);
  // 확인(적용)으로 미리 만들어 둔 최적화 결과(id → { blob, mime, originalSize })는 실제 파일에 쓰지
  // 않고 메모리에만 둔다. 파일 > 저장하기·다른이름으로 저장하기에서 비로소 파일에 반영된다.
  const studioStagedRef = useRef(new Map());
  const studioProgressTimerRef = useRef(0);
  // 저장·다른이름으로 저장이 도는 동안 스튜디오를 잠근다.
  const [studioSaving, setStudioSaving] = useState(false);
  // 스튜디오 설정 > 품질: 최적화 때 원본 용량 대비 남길 비율(0=낮음 25%, 1=중간 50%, 2=높음 75%).
  // 기본은 중간이고, 한 번 고르면 이 기기에 저장돼 다음에도 유지된다.
  const [studioQuality, setStudioQualityState] = useState(() => {
    try {
      const raw = localStorage.getItem("cache_studio_quality");
      return raw === "0" || raw === "1" || raw === "2" ? Number(raw) : 1;
    } catch {
      return 1;
    }
  });
  const changeStudioQuality = (level) => {
    setStudioQualityState(level);
    try {
      localStorage.setItem("cache_studio_quality", String(level));
    } catch {
      /* 저장소를 못 쓰는 환경이면 이번 세션에서만 유지된다 */
    }
    // 이전 품질로 미리 만들어 둔 최적화 결과는 더 이상 맞지 않으니 버린다(다음 확인·저장에서 새로 만든다).
    studioStagedRef.current = new Map();
  };
  // 파일 > 다른이름으로 저장: 불러오기처럼 드라이브를 폴더로 옮겨 다니며 저장할 폴더(지금 열려
  // 있는 폴더)를 고른 뒤 확인을 누르면 거기에 새 파일로 저장한다.
  const [saveAsMode, setSaveAsMode] = useState(false);
  // 다른이름으로 저장 때 검색바에 입력하는 저장 이름(하나면 그 이름, 여러 개면 뒤에 번호를 붙인다).
  const [saveAsName, setSaveAsName] = useState("");
  const [studioSourceItems, setStudioSourceItems] = useState([]);
  const [multiStudioOpen, setMultiStudioOpen] = useState(false);
  const [multiStudioItems, setMultiStudioItems] = useState([]); // [{id,name,originalName,tag,level,levelTouched,mime,is_folder}]
  const [multiStudioIndex, setMultiStudioIndex] = useState(0);
  // 확인을 누른 뒤 압축이 실제로 걸리면(levelTouched) 처리 중(진행률
  // 표시)과 완료(결과 요약) 두 화면을 보여준다. 단일·다중 공통. 하이라이트는
  // 서버 왕복 하나뿐인 가벼운 동작이라 별도 진행률·결과 화면 없이 바로 닫힌다.
  const [studioProgress, setStudioProgress] = useState(null); // { done, total } | null
  const [studioResult, setStudioResult] = useState(null); // { total, totalOriginal, totalCompressed, elapsedMs } | null
  // 최적화·이미지 비교가 돌고 있는 동안 빈 공간을 눌러 패널을 닫아도 작업은 그대로
  // 이어진다. 다만 닫힌 뒤에 진행률·결과를 상태에 다시 써 넣으면 패널이 닫혀
  // 있는데도 진행 바가 되살아나거나 다음에 열 때 옛 결과가 뜨므로, 패널을 닫는
  // 순간 지금 돌고 있는 작업(studioRunRef)에 detached 표시를 해 두고 그 뒤로는
  // 화면 상태를 건드리지 않는다(끝나면 목록만 새로 고친다).
  const studioRunRef = useRef(null);
  // 스튜디오 툴킷의 이동(→) 아이콘. 삭제 확인과 같은 방식으로 하단 검색바가
  // 확장되는 패널을 쓴다. 패널 안에서 드라이브를 폴더별로 눌러 내려가다가
  // 확인을 누르면 지금 들어와 있는 폴더로 옮긴다(movePath가 빈 배열이면
  // 최상위). moveRows는 지금 보고 있는 폴더의 목록이다.
  const [moveOpen, setMoveOpen] = useState(false);
  const [movePath, setMovePath] = useState([]); // [{ id, name }]
  const [moveRows, setMoveRows] = useState([]);
  const [moveRowsState, setMoveRowsState] = useState("loading"); // loading | ready | error
  // 폴더 썸네일 지정 모드. 단일 폴더를 고르고 정보 아이콘을 켜면 그 폴더 타일에
  // 뜨는 사람 아이콘을 눌러 들어온다 — 그 폴더 안으로 들어가 이미지(jpg·jpeg·png·webp)만
  // 눌리고 나머지(다른 파일·폴더)는 흐려져 눌리지 않는다. 이미지를 하나 누르면 그
  // 이미지가 폴더의 썸네일이 되고 지정 모드는 끝나 상위 폴더로 돌아온다.
  const [thumbPickFolder, setThumbPickFolder] = useState(null); // { id, name } | null
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
  // 툴킷 도구 순서를 그대로 불러온다.
  useEffect(() => {
    if (session) {
      setToolkitLayoutState(normalizeLayout(session.toolkitLayout ?? BASE_TOOL_IDS));
    }
  }, [session]);

  // 툴킷 레이아웃 변경(정렬·초기화)은 서버 저장이 성공한 뒤에만 화면(툴킷
  // 바)에 반영한다 — 먼저 화면부터 바꾸면 저장 요청이 끊겼을 때(아이폰 PWA를
  // 백그라운드로 보내는 등) 저장된 줄 알고 넘어가 버리는 문제가 있었다.
  const changeToolkitLayout = async (nextLayout, action) => {
    const next = normalizeLayout(nextLayout);
    try {
      await persistToolkitLayout(session.token, next, action);
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

  // Studio 패널이 열린 채로도 다른 파일을 탭해 선택을 더하거나 뺄 수
  // 있다(빈 화면 스크림에 뚫린 구멍을 통해 타일 클릭이 그대로 전달된다).
  // 그러면 이 효과가 선택이 바뀔 때마다 편집 중인 값(이름·태그·품질)을
  // 다시 계산한다 — 이미 입력해 둔 값은 그대로 이어가고, 새로 추가된
  // 항목은 원래 이름·태그·기본 품질(중간, 안 만짐)로 채운다. 선택이 1개로
  // 줄면 단일 패널로, 2개 이상이면 다중 패널로, 0개가 되면 패널을 닫는다.
  useEffect(() => {
    if (!studioOpen && !multiStudioOpen) return;
    if (studioFromImport) return;
    // 패널을 닫아 둔 동안은 세션을 그대로 보존한다(선택이 바뀌어도 다시 계산하지 않는다).
    if (!studioVisible) return;
    // 선택이 바뀌면 지금 보여주던 압축 진행률·결과 화면은 더 이상 이
    // 선택을 대표하지 않으니 지운다.
    if (studioProgress || studioResult) {
      setStudioProgress(null);
      setStudioResult(null);
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length === 0) {
      // 선택이 다 풀려도 패널을 닫지 않는다 — 대상 없는 단일 모드로 남아
      // 모든 기능이 비활성화된 채로 계속 떠 있는다(App.jsx가 아니라
      // BottomSearchBar.jsx가 studioTargetId 없음을 보고 비활성화를 그린다).
      setStudioSourceItems([]);
      setMultiStudioOpen(false);
      setMultiStudioItems([]);
      setMultiStudioIndex(0);
      setStudioTargetId(null);
      setStudioName("");
      setStudioTag("");
      setStudioLevel(1);
      setStudioLevelTouched(false);
      setStudioOpen(true);
      return;
    }
    const fieldsFor = (it) => {
      const fromMulti = multiStudioItems.find((x) => x.id === it.id);
      if (fromMulti) {
        return {
          name: fromMulti.name,
          tag: fromMulti.tag,
          level: fromMulti.level,
          levelTouched: fromMulti.levelTouched,
        };
      }
      if (studioOpen && studioTargetId === it.id) {
        return {
          name: studioName,
          tag: studioTag,
          level: studioLevel,
          levelTouched: studioLevelTouched,
        };
      }
      return {
        name: it.name,
        tag: it.tag || "",
        level: 1,
        levelTouched: false,
      };
    };
    const nextItems = targets.map((it) => {
      const f = fieldsFor(it);
      return {
        id: it.id,
        name: f.name,
        originalName: it.name,
        tag: f.tag,
        originalTag: it.tag || "",
        level: f.level,
        levelTouched: f.levelTouched,
        mime: it.mime,
        is_folder: it.is_folder,
      };
    });
    setStudioSourceItems(targets);
    setStudioOpen(false);
    setStudioTargetId(null);
    setMultiStudioItems(nextItems);
    setMultiStudioIndex((i) => Math.min(i, nextItems.length - 1));
    setMultiStudioOpen(true);
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

  // 지정 중인 폴더를 벗어나면(뒤로 가기 등) 지정 모드도 끝낸다.
  useEffect(() => {
    if (thumbPickFolder && parentId !== thumbPickFolder.id) setThumbPickFolder(null);
  }, [parentId, thumbPickFolder]);

  // 스튜디오 뷰포트 미리보기: 지금 보고 있는 선택 파일의 썸네일 주소를 받아 온다.
  // 썸네일이 없는 파일(pdf·폴더 등)은 null이라 파일 아이콘이 뜬다.
  const [studioPreviewUrl, setStudioPreviewUrl] = useState(null);
  const studioCurrentId = studioOpen ? studioTargetId : multiStudioOpen ? multiStudioItems[multiStudioIndex]?.id : null;
  useEffect(() => {
    const pool = studioSourceItems.length ? studioSourceItems : visibleItems;
    const key = studioCurrentId ? pool.find((it) => it.id === studioCurrentId)?.thumb_key : null;
    if (!key || !session) {
      setStudioPreviewUrl(null);
      return undefined;
    }
    let cancelled = false;
    thumbnailUrls(session.token, [key])
      .then((urls) => {
        if (!cancelled) setStudioPreviewUrl(urls[key] ?? null);
      })
      .catch(() => {
        if (!cancelled) setStudioPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [studioCurrentId, visibleItems, studioFromImport, studioSourceItems, session?.token]);

  const handleSearch = (value) => {
    setSearchQuery(value);
  };

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

  // 선택된 항목 중 이미지·영상만 대상으로 썸네일 블러를 토글한다. 전체가
  // 이미 블러 상태면 풀고, 아니면(하나도 안 되어 있거나 일부만 되어 있으면)
  // 전부 건다 — 전체 선택 체크박스와 같은 "일부면 켜는 쪽으로" 방식이다.
  const handleBlurSelected = async () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && (isImage(it.mime) || isVideo(it.mime)));
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

  // 스튜디오가 다루는 항목 하나. 이름·태그는 편집 중인 값(name·tag)과 원래 값(originalName·
  // originalTag)을 따로 들고 있어, 저장할 때 바뀐 것만 반영한다.
  const makeStudioItem = (it) => ({
    id: it.id,
    name: it.name,
    originalName: it.name,
    tag: it.tag || "",
    originalTag: it.tag || "",
    level: 1,
    levelTouched: false,
    mime: it.mime,
    is_folder: it.is_folder,
  });

  // ── 스튜디오 메뉴 > 불러오기 ──
  const startImport = () => {
    closeAllToolPanels();
    setSelectedIds(new Set());
    setImportMap(new Map());
    setImportMode(true);
  };
  const cancelImport = () => {
    setImportMode(false);
    setImportMap(new Map());
  };
  const toggleImport = (item) => {
    if (item.is_folder) return;
    setImportMap((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  };
  const importIds = useMemo(() => new Set(importMap.keys()), [importMap]);
  // 확인: 고른 항목(고른 순서 그대로)으로 스튜디오 패널을 다시 연다. 하나면 단일, 여러 개면
  // 다중(< 1/N >)으로 연다.
  const confirmImport = () => {
    const items = [...importMap.values()];
    setImportMode(false);
    setImportMap(new Map());
    if (!items.length) return;
    setStudioProgress(null);
    setStudioResult(null);
    setStudioVisible(true);
    setStudioSourceItems(items);
    setStudioFromImport(true);
    setStudioOpen(false);
    setStudioTargetId(null);
    setStudioName("");
    setStudioTag("");
    studioStagedRef.current = new Map();
    setMultiStudioItems(items.map(makeStudioItem));
    setMultiStudioIndex(0);
    setMultiStudioOpen(true);
  };

  // 선택된 항목으로 Studio(이름·태그·압축·클립 통합) 패널을 연다. 단일
  // 선택이면 studioOpen 하나를, 여러 개면 이전·다음 화살표로 하나씩 넘기며
  // 편집하는 multiStudioOpen을 연다. 선택이 하나도 없어도 열리지만
  // (studioTargetId가 null), 그때는 대상이 없으므로 모든 기능이 비활성화된
  // 채로 뜬다(BottomSearchBar.jsx가 studioTargetId 없음을 보고 그린다).
  const handleStudioSelected = () => {
    // 이미 Studio 패널(단일이든 다중이든)이 열려 있는 채로 같은 아이콘을
    // 다시 누르면 여는 대신 닫는다 — 빈 화면을 눌러 취소하는 것과 같은
    // 처리다.
    if (studioOpen || multiStudioOpen) {
      if (studioVisible) {
        setStudioVisible(false);
      } else {
        closeAllToolPanels();
        setStudioVisible(true);
      }
      return;
    }
    // 정확히 두 개를 선택했을 때는 이미지 비교가 먼저 선택한 쪽을
    // A(왼쪽)로 삼으므로(기존 스플릿 비교 툴킷 아이콘과 같은 규칙,
    // handleSplitCompareSelected 참고), 화면에 보이는 순서 대신 선택한
    // 순서 그대로 둔다 — selectedIds는 Set이라 삽입 순서를 보존한다.
    // 세 개 이상은 순서가 결과에 영향을 주지 않으므로 그대로 화면 순서를
    // 쓴다.
    const targets =
      selectedIds.size === 2
        ? [...selectedIds].map((id) => visibleItems.find((it) => it.id === id)).filter(Boolean)
        : visibleItems.filter((it) => selectedIds.has(it.id));
    closeAllToolPanels();
    setStudioVisible(true);
    studioStagedRef.current = new Map();
    setStudioFromImport(false);
    setStudioSourceItems(targets);
    if (targets.length === 0) {
      // 선택이 없으면 대상 없는 빈 스튜디오로 열린다.
      setStudioTargetId(null);
      setStudioName("");
      setStudioTag("");
      setStudioLevel(1);
      setStudioLevelTouched(false);
      setStudioOpen(true);
      return;
    }
    // 하나든 여러 개든 같은 방식(< 1/N >)으로 다룬다 — 하나면 넘기기 표시만 없다.
    setStudioOpen(false);
    setStudioTargetId(null);
    setMultiStudioItems(targets.map(makeStudioItem));
    setMultiStudioIndex(0);
    setMultiStudioOpen(true);
  };

  const cancelStudio = () => {
    studioStagedRef.current = new Map();
    clearTimeout(studioProgressTimerRef.current);
    setStudioFromImport(false);
    setStudioSourceItems([]);
    if (studioRunRef.current) studioRunRef.current.detached = true;
    setStudioOpen(false);
    setStudioTargetId(null);
    setStudioName("");
    setStudioTag("");
    setStudioLevel(1);
    setStudioLevelTouched(false);
    setStudioProgress(null);
    setStudioResult(null);
  };

  const cancelMultiStudio = () => {
    studioStagedRef.current = new Map();
    clearTimeout(studioProgressTimerRef.current);
    setStudioFromImport(false);
    setStudioSourceItems([]);
    if (studioRunRef.current) studioRunRef.current.detached = true;
    setMultiStudioOpen(false);
    setMultiStudioItems([]);
    setMultiStudioIndex(0);
    setStudioProgress(null);
    setStudioResult(null);
  };

  const changeStudioName = (value) => {
    if (studioOpen) setStudioName(value);
    else if (multiStudioOpen) {
      setMultiStudioItems((prev) => prev.map((it, i) => (i === multiStudioIndex ? { ...it, name: value } : it)));
    }
  };

  const changeStudioTag = (value) => {
    if (studioOpen) setStudioTag(value);
    else if (multiStudioOpen) {
      setMultiStudioItems((prev) => prev.map((it, i) => (i === multiStudioIndex ? { ...it, tag: value } : it)));
    }
  };

  // 최적화 섹션에 들어오면 그 자체가 "압축하겠다"는 뜻이다 — 기본값인 "중간"을
  // 그대로 두고 확인해도 압축이 걸려야 하므로, 들어오는 순간 지금 대상 전부를
  // 압축 대상(levelTouched)으로 표시한다. 일괄 지우기는 이 표시를 다시 푼다.
  const markStudioLevelForOptimize = () => {
    if (studioOpen) setStudioLevelTouched(true);
    else if (multiStudioOpen) setMultiStudioItems((prev) => prev.map((it) => ({ ...it, levelTouched: true })));
  };

  // 품질 세그먼트를 실제로 누른 항목만 확인 시 압축한다(levelTouched).
  const changeStudioLevel = (level) => {
    if (studioOpen) {
      setStudioLevel(level);
      setStudioLevelTouched(true);
    } else if (multiStudioOpen) {
      setMultiStudioItems((prev) =>
        prev.map((it, i) => (i === multiStudioIndex ? { ...it, level, levelTouched: true } : it))
      );
    }
  };

  const prevMultiStudio = () => setMultiStudioIndex((i) => Math.max(0, i - 1));
  const nextMultiStudio = () => setMultiStudioIndex((i) => Math.min(multiStudioItems.length - 1, i + 1));

  const applyAllMultiStudioName = () => {
    setMultiStudioItems((prev) => {
      const first = prev[multiStudioIndex]?.name ?? "";
      return prev.map((it, i) => (i >= multiStudioIndex ? { ...it, name: first } : it));
    });
  };
  const clearAllMultiStudioName = () => {
    setMultiStudioItems((prev) => prev.map((it) => ({ ...it, name: "" })));
  };
  // 지금 보고 있는 항목의 이름 끝에 붙은 숫자를 뽑아 그 숫자부터 순서대로
  // 이어 붙인다.
  const attachNumbersMultiStudio = () => {
    setMultiStudioItems((prev) => {
      const first = prev[multiStudioIndex]?.name || "";
      const match = first.match(/^(.*?)(\d+)$/);
      const prefix = match ? match[1] : first;
      const base = match ? parseInt(match[2], 10) : 1;
      return prev.map((it, i) =>
        i >= multiStudioIndex ? { ...it, name: `${prefix}${base + (i - multiStudioIndex)}` } : it
      );
    });
  };
  const applyAllMultiStudioTag = () => {
    setMultiStudioItems((prev) => {
      const first = prev[multiStudioIndex]?.tag ?? "";
      return prev.map((it, i) => (i >= multiStudioIndex ? { ...it, tag: first } : it));
    });
  };
  const clearAllMultiStudioTag = () => {
    setMultiStudioItems((prev) => prev.map((it) => ({ ...it, tag: "" })));
  };
  const applyAllMultiStudioLevel = () => {
    setMultiStudioItems((prev) => {
      const current = prev[multiStudioIndex];
      if (!current) return prev;
      return prev.map((it, i) => (i >= multiStudioIndex ? { ...it, level: current.level, levelTouched: true } : it));
    });
  };
  // 이름·태그·하이라이트의 일괄 지우기와 같은 규칙 — 인덱스와 무관하게
  // 전체 항목을 기본값(가운데 단계, 아직 안 건드린 상태)으로 되돌린다.
  const clearAllMultiStudioLevel = () => {
    setMultiStudioItems((prev) => prev.map((it) => ({ ...it, level: 1, levelTouched: false })));
  };
  // ── 스튜디오 확인(적용) ──
  // 확인은 실제 파일을 바꾸지 않는다. 이름·태그는 편집 중인 값 그대로 스튜디오 안에 보관돼 있고,
  // 최적화로 표시된 항목은 여기서 압축 결과(blob)를 미리 만들어 메모리에 둔다(고정 품질: 중간).
  // 진행률은 확인 버튼 왼쪽 막대에 %로 나오고, 다 끝나면 1초 뒤 사라진다. 막대가 있는 동안 스튜디오는
  // 잠긴다. 실제 파일에 반영되는 건 파일 > 저장하기·다른이름으로 저장하기뿐이다.
  const stageStudio = async () => {
    const items = multiStudioItems;
    if (!items.length || studioProgress || studioSaving) return;
    if (!items.every((it) => it.name.trim().length > 0)) return;
    clearTimeout(studioProgressTimerRef.current);
    const run = { detached: false };
    studioRunRef.current = run;
    const total = items.length;
    const staged = new Map(studioStagedRef.current);
    const report = (done, frac) => {
      if (!run.detached) setStudioProgress({ done, total, fraction: (done + frac) / total });
    };
    report(0, 0);
    for (let i = 0; i < total; i += 1) {
      const it = items[i];
      const src = studioSourceItems.find((x) => x.id === it.id);
      const wants = Boolean(it.levelTouched && !it.is_folder && isOptimizableFile(it.name, it.mime) && src?.r2_key);
      if (wants && !staged.has(it.id)) {
        try {
          const out = await compressItemBlob({
            token: session.token,
            item: src,
            ratioPercent: OPTIMIZE_LEVELS[studioQuality],
            onProgress: (f) => report(i, f),
          });
          staged.set(it.id, out);
        } catch {
          // 이 파일만 건너뛴다(캔버스가 못 읽는 형식).
        }
      } else if (!wants) {
        staged.delete(it.id);
      }
      if (run.detached) return;
      report(i + 1, 0);
    }
    studioStagedRef.current = staged;
    setStudioProgress({ done: total, total, fraction: 1, finished: true });
    studioProgressTimerRef.current = setTimeout(() => {
      if (!run.detached) setStudioProgress(null);
    }, 1000);
  };

  // 편집 메뉴: 지금 보고 있는 항목 하나의 값을 지운다(이름·태그는 빈 값, 최적화는 표시 해제).
  const clearCurrentStudio = (section) => {
    const cur = multiStudioItems[multiStudioIndex];
    if (!cur) return;
    if (section === "quality") studioStagedRef.current.delete(cur.id);
    setMultiStudioItems((prev) =>
      prev.map((it, i) => {
        if (i !== multiStudioIndex) return it;
        if (section === "name") return { ...it, name: "" };
        if (section === "tag") return { ...it, tag: "" };
        if (section === "quality") return { ...it, levelTouched: false };
        return it;
      })
    );
  };
  // 편집 메뉴: 지금 보고 있는 항목 하나에 적용한다. 이름·태그는 입력하는 대로 이미 반영돼 있어
  // (입력창 확정만 UI에서 처리) 따로 할 일이 없고, 최적화는 이 항목을 압축 대상으로 표시한다.
  const applyCurrentStudio = (section) => {
    if (section !== "quality") return;
    setMultiStudioItems((prev) => prev.map((it, i) => (i === multiStudioIndex ? { ...it, levelTouched: true } : it)));
  };

  // 저장·다른이름으로 저장 공통: 이 항목에 쓸 최적화 결과(없으면 null). 확인 때 만들어 둔 게 없으면
  // 지금 만든다.
  const stagedBlobFor = async (it, src) => {
    const wants = Boolean(it.levelTouched && !it.is_folder && isOptimizableFile(it.name, it.mime) && src?.r2_key);
    if (!wants) return null;
    const cached = studioStagedRef.current.get(it.id);
    if (cached) return cached;
    try {
      return await compressItemBlob({ token: session.token, item: src, ratioPercent: OPTIMIZE_LEVELS[studioQuality] });
    } catch {
      return null;
    }
  };

  // 파일 > 저장하기: 스튜디오에서 바꾼 이름·태그·최적화를 원래 파일(원래 위치)에 실제로 적용한다.
  // 끝나면 스튜디오 세션을 종료한다.
  const saveStudio = async () => {
    const items = multiStudioItems;
    if (!items.length || studioSaving || studioProgress) return;
    if (!items.every((it) => it.name.trim().length > 0)) {
      window.alert("이름을 입력해 주세요");
      return;
    }
    setStudioSaving(true);
    try {
      const finalNames = dedupeStrings(items.map((it) => it.name.trim()));
      const renames = items
        .map((it, i) => ({ id: it.id, name: finalNames[i], changed: finalNames[i] !== it.originalName }))
        .filter((r) => r.changed)
        .map(({ id, name }) => ({ id, name }));
      if (renames.length) await renameFiles(session.token, renames);
      const tagGroups = new Map();
      for (const it of items) {
        if ((it.tag || "") === (it.originalTag || "")) continue;
        const key = it.tag || "";
        if (!tagGroups.has(key)) tagGroups.set(key, []);
        tagGroups.get(key).push(it.id);
      }
      await Promise.all([...tagGroups.entries()].map(([tag, ids]) => setTag(session.token, ids, tag)));
      for (const it of items) {
        const src = studioSourceItems.find((x) => x.id === it.id);
        const out = await stagedBlobFor(it, src);
        if (out) await replaceFileContent({ token: session.token, item: src, blob: out.blob, mime: out.mime });
      }
      endStudio();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
      showToast("저장했습니다");
    } catch {
      window.alert("저장하지 못했습니다");
    } finally {
      setStudioSaving(false);
    }
  };

  // 파일 > 다른이름으로 저장: 불러오기처럼 스튜디오가 닫히고 드라이브를 폴더로 옮겨 다니며 저장할
  // 폴더(지금 열려 있는 폴더)를 고른다. 파일은 흐리게 눌리지 않고 폴더만 눌러 들어간다.
  const startSaveAs = () => {
    if (!multiStudioItems.length) return;
    closeAllToolPanels();
    setSelectedIds(new Set());
    setSaveAsName(multiStudioItems[0]?.name ?? "");
    setSaveAsMode(true);
  };
  const cancelSaveAs = () => setSaveAsMode(false);
  // 확인: 스튜디오의 항목들을 지금 열려 있는 폴더에 새 파일로 저장한다(원본은 그대로).
  const confirmSaveAs = async () => {
    const items = multiStudioItems;
    if (!items.length || studioSaving) {
      setSaveAsMode(false);
      return;
    }
    setStudioSaving(true);
    try {
      const typed = saveAsName.trim();
      if (!typed) {
        window.alert("저장할 이름을 입력해 주세요");
        setStudioSaving(false);
        return;
      }
      // 여러 개면 입력한 이름 끝의 숫자부터(없으면 1부터) 순서대로 번호를 붙인다.
      const m = typed.match(/^(.*?)(\d+)$/);
      const finalNames =
        items.length === 1
          ? [typed]
          : items.map((_, i) => `${m ? m[1] : typed}${(m ? parseInt(m[2], 10) : 1) + i}`);
      for (let i = 0; i < items.length; i += 1) {
        const it = items[i];
        const src = studioSourceItems.find((x) => x.id === it.id);
        if (!src?.r2_key) continue;
        const out = await stagedBlobFor(it, src);
        const newId = await copyFileTo({
          token: session.token,
          userId: session.userId,
          item: src,
          blob: out?.blob,
          mime: out?.mime,
          name: finalNames[i],
          parentId,
        });
        if (newId && it.tag) await setTag(session.token, [newId], it.tag);
      }
      setSaveAsMode(false);
      endStudio();
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
      showToast("저장했습니다");
    } catch {
      window.alert("저장하지 못했습니다");
    } finally {
      setStudioSaving(false);
    }
  };

  // 스튜디오 패널의 "이미지 비교" 확인: 지금 다중 선택 중인 두 이미지를
  // 기존 스플릿 비교 프리셋 로직(createSplitPreset, handleSaveSplitPreset
  // 참고)으로 그대로 복제해 새 항목 하나로 만든다. multiStudioItems는
  // handleStudioSelected가 정확히 두 개를 선택했을 때 이미 "먼저 선택한
  // 순서"로 담아 두므로, [0]이 A(왼쪽)다. 이름은 A 파일명에서 확장자를
  // 떼고 "_이미지비교"를 붙인다(예: "테스트_1.jpg" → "테스트_1_이미지비교").
  const handleConfirmCompare = async () => {
    // 결과가 이미 떠 있으면 확인은 패널을 닫는 동작이다(최적화 결과 화면과 같다).
    if (studioResult) {
      cancelMultiStudio();
      setSelectedIds(new Set());
      return;
    }
    if (multiStudioItems.length !== 2) return;
    const itemA = visibleItems.find((it) => it.id === multiStudioItems[0].id);
    const itemB = visibleItems.find((it) => it.id === multiStudioItems[1].id);
    if (!itemA || !itemB) return;
    const ext = extensionOf(itemA.name);
    const baseName = ext ? itemA.name.slice(0, -(ext.length + 1)) : itemA.name;
    // 최적화와 같은 진행 화면: 두 이미지를 하나씩 복제할 때마다 "1 / 2"로 올라가고,
    // 끝나면 같은 자리에 결과 텍스트가 뜬다.
    const total = 2;
    const run = { detached: false };
    studioRunRef.current = run;
    setStudioResult(null);
    setStudioProgress({ done: 0, total });
    const startedAt = performance.now();
    try {
      await createSplitPreset({
        token: session.token,
        userId: session.userId,
        itemA,
        itemB,
        parentId,
        name: `${baseName}_이미지비교`,
        onStepDone: () => {
          if (!run.detached) setStudioProgress((p) => (p ? { ...p, done: Math.min(p.total, p.done + 1) } : p));
        },
      });
      if (!run.detached) {
        setStudioProgress(null);
        setStudioResult({
          kind: "compare",
          total,
          elapsedMs: performance.now() - startedAt,
          totalSize: (itemA.size || 0) + (itemB.size || 0),
        });
      }
      setRefreshKey((k) => k + 1);
    } catch {
      if (!run.detached) setStudioProgress(null);
      window.alert("이미지 비교 파일을 만들지 못했습니다");
    }
  };

  // 삭제 확인·새 폴더·이동·Studio(단일/다중)는 전부 검색바 위 같은 패널
  // 자리를 공유한다 — 그중 하나를 열기 전에 항상 이걸 먼저 불러 나머지를
  // 전부 닫는다.
  const closeAllToolPanels = () => {
    setDeleteConfirmOpen(false);
    setNewFolderOpen(false);
    cancelMove();
    // 스튜디오는 종료하지 않고 패널만 숨긴다(세션 유지).
    setStudioVisible(false);
  };

  // 패널의 X 버튼: 스튜디오 세션 전체를 종료한다(대상·입력값·진행·결과 모두 지움).
  const endStudio = () => {
    cancelStudio();
    cancelMultiStudio();
    setStudioVisible(true);
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

  // ── 폴더 썸네일 지정 ──
  const startThumbPick = (folder) => {
    setThumbPickFolder({ id: folder.id, name: folder.name });
    openFolder(folder);
  };

  const clearThumb = async (folder) => {
    try {
      await clearFolderThumbnail(session.token, folder.id);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("썸네일을 삭제하지 못했습니다");
    }
  };

  const pickThumb = async (image) => {
    const folder = thumbPickFolder;
    if (!folder) return;
    try {
      await setFolderThumbnail(session.token, folder.id, image.id);
    } catch {
      window.alert("썸네일을 지정하지 못했습니다");
      return;
    }
    setThumbPickFolder(null);
    setFolderPath((p) => p.slice(0, -1));
    setRefreshKey((k) => k + 1);
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
    isImage(it.mime) || isOptimizableFile(it.name, it.mime) || /\.(gif|webp)$/i.test(it.name);

  // 스플릿 비교: 정확히 두 개의 이미지(움짤 포함)가 선택돼 있어야
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
      case "favorite":
        // 아무것도 선택하지 않았으면 즐겨찾기 화면을 연다.
        if (selectedIds.size === 0) {
          setSearchQuery("");
          setShowFavorites(true);
          return undefined;
        }
        return handleFavoriteSelected();
      default:
        return undefined;
    }
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

  if (showDuplicates) {
    return <DuplicatesPage session={session} onBack={() => setShowDuplicates(false)} />;
  }

  if (showSettings) {
    return (
      <SettingsPage
        session={session}
        themeMode={themeMode}
        onChangeThemeMode={handleChangeThemeMode}
        toolkitLayout={toolkitLayout}
        viewMode={viewMode}
        onChangeToolkitLayout={changeToolkitLayout}
        onResetToolkitLayout={() => changeToolkitLayout(BASE_TOOL_IDS, "reset")}
        onOpenTrash={() => setShowTrash(true)}
        onOpenTags={() => setShowTags(true)}
        onOpenDuplicates={() => setShowDuplicates(true)}
        onBack={() => setShowSettings(false)}
        onLogout={() => {
          clearSession();
          setSession(null);
        }}
      />
    );
  }

  // 이 아래로는 휴지통·태그·설정이 아니므로 남은 화면은 파일 화면 아니면
  // 즐겨찾기뿐이다.
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
              importMode={importMode || saveAsMode}
              onCancelImport={saveAsMode ? cancelSaveAs : cancelImport}
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
              selectionMode={importMode || selectedIds.size > 0}
              selectedIds={importMode ? importIds : selectedIds}
              onToggleSelect={importMode ? toggleImport : toggleSelect}
              onLongPressItem={importMode ? toggleImport : toggleSelect}
              importMode={importMode}
              saveAsMode={saveAsMode}
              onItemsChange={setVisibleItems}
              thumbPickMode={Boolean(thumbPickFolder)}
              onPickThumb={pickThumb}
              onOpenThumbPicker={startThumbPick}
              onClearThumb={clearThumb}
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
            onOpenStudio={handleStudioSelected}
            studioOpen={studioOpen && studioVisible}
            studioTargetName={visibleItems.find((it) => it.id === studioTargetId)?.name ?? ""}
            studioTargetMime={visibleItems.find((it) => it.id === studioTargetId)?.mime ?? ""}
            studioTargetIsFolder={visibleItems.find((it) => it.id === studioTargetId)?.is_folder ?? false}
            studioName={studioName}
            studioTag={studioTag}
            studioLevel={studioLevel}
            studioLevelTouched={studioLevelTouched}
            studioProgress={studioProgress}
            studioResult={studioResult}
            onChangeStudioName={changeStudioName}
            onChangeStudioTag={changeStudioTag}
            onChangeStudioLevel={changeStudioLevel}
            onOpenStudioQuality={markStudioLevelForOptimize}
            onConfirmStudio={() => setStudioVisible(false)}
            onCancelStudio={() => setStudioVisible(false)}
            onEndStudio={endStudio}
            multiStudioOpen={multiStudioOpen && studioVisible}
            multiStudioItems={multiStudioItems}
            multiStudioIndex={multiStudioIndex}
            onPrevMultiStudio={prevMultiStudio}
            onNextMultiStudio={nextMultiStudio}
            onApplyAllMultiStudioName={applyAllMultiStudioName}
            onClearAllMultiStudioName={clearAllMultiStudioName}
            onAttachNumbersMultiStudio={attachNumbersMultiStudio}
            onApplyAllMultiStudioTag={applyAllMultiStudioTag}
            onClearAllMultiStudioTag={clearAllMultiStudioTag}
            onApplyAllMultiStudioLevel={applyAllMultiStudioLevel}
            onClearAllMultiStudioLevel={clearAllMultiStudioLevel}
            onConfirmMultiStudio={stageStudio}
            onClearCurrentStudio={clearCurrentStudio}
            onApplyCurrentStudio={applyCurrentStudio}
            onSaveStudio={saveStudio}
            onStartSaveAs={startSaveAs}
            studioSaving={studioSaving}
            studioQuality={studioQuality}
            onChangeStudioQuality={changeStudioQuality}
            saveAsName={saveAsMode ? saveAsName : undefined}
            onChangeSaveAsName={setSaveAsName}
            onConfirmCompare={handleConfirmCompare}
            onCancelMultiStudio={() => setStudioVisible(false)}
            studioPreviewUrl={studioPreviewUrl}
            studioSessionHidden={!studioVisible && ((studioOpen && Boolean(studioTargetId)) || (multiStudioOpen && multiStudioItems.length > 0))}
            importMode={importMode || saveAsMode}
            importCount={saveAsMode ? (studioSaving ? 0 : 1) : importMap.size}
            onStartImport={startImport}
            onConfirmImport={saveAsMode ? confirmSaveAs : confirmImport}
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
