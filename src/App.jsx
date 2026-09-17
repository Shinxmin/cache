import { useEffect, useMemo, useRef, useState } from "react";
import TabBar, { TABS } from "./components/TabBar";
import PageHeader from "./components/PageHeader";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import FilesPage from "./pages/FilesPage";
import TransfersPage from "./pages/TransfersPage";
import TrashPage from "./pages/TrashPage";
import TagsPage from "./pages/TagsPage";
import FileViewer from "./pages/FileViewer";
import SplitCompareViewer from "./pages/SplitCompareViewer";
import RenameModal from "./components/RenameModal";
import MoveModal from "./components/MoveModal";
import TagModal from "./components/TagModal";
import OptimizeModal from "./components/OptimizeModal";
import NewFolderModal from "./components/NewFolderModal";
import Toast from "./components/Toast";
import HomePage from "./pages/HomePage";
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
  createFolder,
  downloadFile,
  downloadFolderAsZip,
  downloadSelectionAsZip,
  moveFiles,
  optimizeFiles,
  renameFiles,
  setBlur,
  setFavorite,
  setInfoRevealed,
  setTag,
  trashFiles,
  uploadFile,
} from "./lib/drive";
import { isImage, isVideo } from "./lib/thumbnail";
import { isSearchActive } from "./lib/search";
import { loadTheme, saveTheme } from "./lib/theme";
import { BASE_TOOL_IDS, installedAddonIds, normalizeLayout } from "./lib/toolkit";
import { isOptimizableFile } from "./lib/optimize";

const TOAST_MS = 2000;

// 검색바는 홈·파일 탭에서만 뜬다(설정에는 없음). 제목과 한 fixed 박스로 묶여
// PageHeader 안에서 렌더링된다(PageHeader.jsx 참고).
const SEARCH_TABS = new Set(["home", "files"]);

const THEME_COLORS = { dark: "#1B1B1B", light: "#F5F5F7" };

export default function App() {
  // 설정의 테마 스위치가 고른 값. 기기에 저장된 값이 있으면 그걸 따르고,
  // 처음 접속이라 저장된 값이 없을 때만 시스템 설정을 기본값으로 삼는다 —
  // 이후로는 시스템이 바뀌어도(라이브 추적하지 않음) 사용자가 고른 값이
  // 그대로 유지된다.
  const [theme, setTheme] = useState(() => loadTheme() ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  }, [theme]);

  const handleToggleTheme = (dark) => {
    const next = dark ? "dark" : "light";
    setTheme(next);
    saveTheme(next);
  };

  // 저장된 토큰이 서버에서도 유효한지 확인될 때까지는 아무것도 그리지 않는다
  // (로그인 화면이 잠깐 번쩍이는 것을 막기 위함).
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [tab, setTab] = useState(TABS[0].id);
  // 설정의 "스튜디오 툴킷 항상 활성화" 체크박스 값. 실제로 툴킷이 보이는지는
  // 아래 toolkitVisible이 결정한다(이 설정이 꺼져 있어도 선택 중이면 뜬다).
  const [toolkitAlwaysOn, setToolkitAlwaysOn] = useState(false);
  const [searchAlwaysOn, setSearchAlwaysOn] = useState(true);
  // 스튜디오 툴킷 도구 순서(애드온 포함). 계정(app_users.toolkit_layout)에
  // 저장되며 애드온 스토어의 추가, 설정의 사용자 정렬·휴지통 삭제가 바꾼다.
  const [toolkitLayout, setToolkitLayoutState] = useState(() => normalizeLayout(BASE_TOOL_IDS));
  // 홈 → 즐겨찾기 화면. true면 홈 탭 자리에 즐겨찾기 목록(FilesPage)이 뜨고
  // 검색·스튜디오 툴킷이 파일 탭과 똑같이 동작한다.
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAddonStore, setShowAddonStore] = useState(false);
  // 팔레트 추출 애드온(v1.1)의 대상 파일. null이면 닫힌 상태 — 열리면 별도
  // 모달이 아니라 FileViewer를 paletteMode로 띄운다.
  const [paletteViewerItem, setPaletteViewerItem] = useState(null);
  // 스플릿 비교 애드온의 대상 두 파일 [A, B]. null이면 닫힌 상태.
  const [splitCompareTargets, setSplitCompareTargets] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(0);

  // 파일 탭(웹드라이브) 상태
  const [viewMode, setViewMode] = useState("gallery");
  const [folderPath, setFolderPath] = useState([]); // [{id, name}] — 루트는 빈 배열
  const [refreshKey, setRefreshKey] = useState(0);
  // 검색바에 입력된 원문. 비어 있지 않으면 FilesPage가 지금 폴더 대신 전체
  // 드라이브 검색 결과를 보여준다(파싱은 src/lib/search.js). 탭을 바꾸면
  // 초기화한다 — SearchBar 자신도 key={tab}으로 새로 마운트돼 입력창 값이
  // 비워지므로, 여기 상태도 같이 맞춰 줘야 한다.
  const [searchQuery, setSearchQuery] = useState("");
  // 지금 폴더에서 FilesPage가 실제로 보여주고 있는 항목들. "전체 선택"과
  // 선택 항목 다운로드/삭제가 파일의 r2_key 등 전체 정보를 봐야 해서 필요하다.
  const [visibleItems, setVisibleItems] = useState([]);
  // 꾹 눌러(또는 전체 선택으로) 선택된 항목의 id 집합.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showTrash, setShowTrash] = useState(false);
  const [showTags, setShowTags] = useState(false);
  // 스튜디오 툴킷의 편집(연필) 아이콘으로 연 이름 바꾸기 모달. null이면 닫힌
  // 상태고, 배열이면 그 항목들(1개=단일, 2개 이상=다중)을 대상으로 떠 있다.
  const [renameTargets, setRenameTargets] = useState(null);
  // 스튜디오 툴킷의 이동(→) 아이콘으로 연 이동 모달. null이면 닫힌 상태.
  const [moveTargets, setMoveTargets] = useState(null);
  // 스튜디오 툴킷의 태그(#) 아이콘으로 연 태그 모달. null이면 닫힌 상태.
  const [tagTargets, setTagTargets] = useState(null);
  // 스튜디오 툴킷의 용량 압축(원그래프) 아이콘으로 연 최적화 모달. null이면
  // 닫힌 상태. 폴더나 이미지가 아닌 파일은 대상에서 빠진다(캔버스로 다시
  // 인코딩할 수 있는 게 이미지뿐이라서).
  const [optimizeTargets, setOptimizeTargets] = useState(null);
  // 헤더 삼점 버튼의 "새 폴더"로 여는 모달. true면 열려 있는 상태.
  const [newFolderOpen, setNewFolderOpen] = useState(false);

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
  const mediaItems = useMemo(
    () => visibleItems.filter((it) => isImage(it.mime) || isVideo(it.mime)),
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

  // 체크박스를 바꾸면 화면에 바로 반영하는 동시에 계정에도 저장한다.
  const handleToggleToolkitAlwaysOn = (value) => {
    setToolkitAlwaysOn(value);
    persistToolkitAlwaysOn(session.token, value).catch(() => {});
  };

  // 툴킷 레이아웃 변경(애드온 추가·삭제, 정렬)은 전부 여기로 모여 화면에 바로
  // 반영하고 서버에 저장·기록한다. 저장이 실패하면 이전 순서로 되돌린다.
  const changeToolkitLayout = async (nextLayout, action, addon = null) => {
    const prev = toolkitLayout;
    const next = normalizeLayout(nextLayout);
    setToolkitLayoutState(next);
    try {
      await persistToolkitLayout(session.token, next, action, addon);
    } catch {
      setToolkitLayoutState(prev);
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

  // 탭을 바꾸면 검색어를 비운다 — SearchBar도 key={tab}으로 새로 마운트돼
  // 입력창 자체가 비워지므로, 여기 상태도 같이 맞춰 다음에 파일 탭으로
  // 돌아왔을 때 지난 검색 결과가 아니라 지금 폴더가 보이게 한다. 다만 홈
  // 탭에서 타이핑을 시작해 handleSearch가 스스로 파일 탭으로 넘겼을 때는
  // (아래) 이 초기화를 건너뛴다 — 방금 친 글자가 그대로 이어져야 하므로.
  const suppressSearchClearRef = useRef(false);
  useEffect(() => {
    if (suppressSearchClearRef.current) {
      suppressSearchClearRef.current = false;
      return;
    }
    setSearchQuery("");
  }, [tab]);

  // 탭을 바꾸면 그 탭의 기본 화면이 뜨게 한다 — 파일 탭에서 폴더를 열어 둔
  // 채로 다른 탭에 갔다 돌아와도 항상 최상위(루트)부터 다시 보여주고, 홈
  // 탭에서 즐겨찾기 화면을 보던 중 다른 탭에 갔다 돌아오면 즐겨찾기가 아니라
  // 홈 기본 화면(대시보드)이 뜬다. 다만 검색·즐겨찾기 결과에서 폴더를 열어
  // 파일 탭으로 넘어갈 때(openFolder)는 그 폴더 경로를 그대로 유지해야
  // 하므로, 그 경우엔 suppressFolderResetRef로 이 초기화를 한 번 건너뛴다.
  const suppressFolderResetRef = useRef(false);
  useEffect(() => {
    if (suppressFolderResetRef.current) {
      suppressFolderResetRef.current = false;
    } else if (tab === "files") {
      setFolderPath([]);
    }
    setShowFavorites(false);
  }, [tab]);

  // 홈 탭은 파일 목록 화면(FilesPage) 자체가 없어 검색해도 결과를 보여줄 곳이
  // 없다. 그래서 한 글자라도 치는 순간 파일 탭으로 넘기면서 방금 친 검색어를
  // 그대로 이어받게 한다(위 tab 변경 시 검색어 초기화 effect를 한 번 건너뜀).
  const handleSearch = (value) => {
    setSearchQuery(value);
    // 즐겨찾기 화면은 그 자리에서 검색이 되므로 파일 탭으로 넘기지 않는다.
    if (isSearchActive(value) && tab !== "files" && !showFavorites) {
      suppressSearchClearRef.current = true;
      setTab("files");
    }
  };

  // 파일 목록이 실제로 떠 있는 화면 — 파일 탭이거나 홈 → 즐겨찾기 화면.
  const listVisible = tab === "files" || (tab === "home" && showFavorites);

  // 스튜디오 툴킷 "바"는 파일 목록이 있는 화면(파일 탭·즐겨찾기)에서만 뜬다.
  // 설정이 항상 켜 두었거나 선택된 파일이 하나라도 있으면 뜨지만, 홈 탭
  // 본문(대시보드)에는 선택할 파일 목록 자체가 없으므로 "항상 활성화"가 켜져
  // 있어도 거기서는 뜨지 않아야 한다.
  const toolkitVisible = listVisible && (toolkitAlwaysOn || selectedIds.size > 0);
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
  // 홈 탭에는 업로드 결과를 보여줄 목록 자체가 없으므로, 홈 탭에서 눌렀다면
  // 먼저 파일 탭으로 넘긴다.
  const handleUpload = async (fileList) => {
    if (tab !== "files") setTab("files");
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

  // 새 폴더도 업로드와 같은 이유로, 홈 탭에서 눌렀다면 먼저 파일 탭으로
  // 넘긴 뒤 모달을 연다.
  const handleNewFolder = () => {
    if (tab !== "files") setTab("files");
    setNewFolderOpen(true);
  };

  const handleNewFolderSubmit = async (name) => {
    try {
      await createFolder(session.token, name, parentId);
      setNewFolderOpen(false);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("폴더를 만들지 못했습니다");
    }
  };

  // 이미지·영상은 누르기만 해서 다운로드되면 안 되므로 뷰어를 띄운다.
  // 그 외 파일만 눌렀을 때 바로 내려받는다.
  const handleOpenFile = (item) => {
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

  // 선택된 항목 중 이미지·영상만 대상으로 썸네일 블러를 토글한다. 전체가 이미
  // 블러 상태면 풀고, 아니면(하나도 안 되어 있거나 일부만 되어 있으면) 전부 건다
  // — 전체 선택 체크박스와 같은 "일부면 켜는 쪽으로" 방식이다.
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

  // 선택된 항목으로 이름 바꾸기 모달을 연다(1개=단일, 여러 개=다중 편집).
  const handleEditSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    setRenameTargets(targets);
  };

  // 선택된 항목으로 이동 모달을 연다. 폴더를 옮기면 하위 항목은 parent_id로
  // 딸려 있어 서버에서 자동으로 함께 따라온다.
  const handleMoveSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    setMoveTargets(targets);
  };

  const handleMoveSubmit = async (destinationId) => {
    try {
      await moveFiles(session.token, moveTargets.map((it) => it.id), destinationId);
      setMoveTargets(null);
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("옮기지 못했습니다");
    }
  };

  // 선택된 항목으로 태그 모달을 연다.
  const handleTagSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    setTagTargets(targets);
  };

  // payload는 공유 입력 모드에선 문자열 하나(전부 같은 태그), 항목별 모드에선
  // [{id, tag}] 배열이다. 후자는 같은 태그 값끼리 묶어 그룹별로 한 번씩만
  // set_tag를 호출한다(서버 RPC 자체는 여러 id에 같은 태그 하나만 받는다).
  const handleTagSubmit = async (payload) => {
    try {
      if (Array.isArray(payload)) {
        const groups = new Map();
        for (const { id, tag } of payload) {
          const key = tag || "";
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(id);
        }
        await Promise.all([...groups.entries()].map(([tag, ids]) => setTag(session.token, ids, tag)));
      } else {
        await setTag(session.token, tagTargets.map((it) => it.id), payload);
      }
      setTagTargets(null);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("태그를 저장하지 못했습니다");
    }
  };

  // 선택된 항목 중 폴더만 뺀 파일들로 최적화 모달을 연다(폴더는 자체 용량이
  // 없어 대상이 아니다). 실제로 캔버스가 읽지 못하는 형식(이미지가 아니거나
  // 브라우저가 못 여는 포맷)은 압축 단계에서 그 파일만 건너뛴다 — mime
  // 문자열만으로 미리 걸러내면, 사진 형식에 따라 브라우저가 mime을 빈
  // 문자열로 주는 경우(예: 일부 환경의 HEIC) 정작 열리는 이미지까지 모달 자체가
  // 뜨지 않는 문제가 있었다.
  const handleOptimizeSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && !it.is_folder);
    if (!targets.length) return;
    setOptimizeTargets(targets);
  };

  const handleOptimizeSubmit = async (ratioPercent) => {
    try {
      await optimizeFiles({ token: session.token, items: optimizeTargets, ratioPercent });
      setOptimizeTargets(null);
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

  // 팔레트 추출 애드온(v1.1): 한 번에 파일 하나에만 실행된다. 이미지 파일 딱
  // 하나가 선택돼 있을 때만 파일 클릭 시 뜨는 기본 뷰어를 palette 모드로
  // 열고, 그 외(아무것도 없거나 둘 이상, 또는 폴더·이미지가 아닌 파일)에는
  // 토스트로 안내한다. 더 이상 별도 모달을 열지 않는다.
  const handlePaletteSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (targets.length !== 1 || targets[0].is_folder) {
      showToast("한 개의 파일만 선택할 수 있습니다");
      return;
    }
    const target = targets[0];
    if (!looksLikeImageFile(target)) {
      showToast("이미지 파일만 선택할 수 있습니다");
      return;
    }
    setPaletteViewerItem(target);
  };

  // 스플릿 비교 애드온: 정확히 두 개의 이미지(움짤 포함)가 선택돼 있어야
  // 하며, 먼저 선택한 순서가 곧 A(왼쪽)·B(오른쪽)가 된다 — selectedIds는
  // Set이라 삽입 순서를 그대로 보존한다. 그 외에는 토스트로 안내한다.
  const handleSplitCompareSelected = () => {
    const targets = [...selectedIds].map((id) => visibleItems.find((it) => it.id === id)).filter(Boolean);
    if (targets.length !== 2) {
      showToast("두 개의 파일만 선택할 수 있습니다");
      return;
    }
    if (targets.some((it) => it.is_folder || !looksLikeImageFile(it))) {
      showToast("이미지 파일만 선택할 수 있습니다");
      return;
    }
    setSplitCompareTargets(targets);
  };

  // 스튜디오 툴킷의 아이콘은 도구 id로 눌리고, 여기서 실제 동작에 연결한다.
  const handleTool = (id) => {
    switch (id) {
      case "info":
        return handleToggleInfo();
      case "trash":
        return handleTrashSelected();
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
      default:
        return undefined;
    }
  };

  // 애드온 스토어의 추가(+): 레이아웃 끝에 붙인다(이미 있으면 무시).
  const handleAddAddon = async (addonId) => {
    if (toolkitLayout.includes(addonId)) return;
    await changeToolkitLayout([...toolkitLayout, addonId], "add_addon", addonId);
  };

  const handleRenameSubmit = async (renames) => {
    try {
      await renameFiles(session.token, renames);
      setRenameTargets(null);
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("이름을 바꾸지 못했습니다");
    }
  };

  if (checkingSession) return null;

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
        onBack={() => setShowAddonStore(false)}
      />
    );
  }

  const isFiles = tab === "files";
  const favoritesView = tab === "home" && showFavorites;
  const title = favoritesView
    ? "즐겨찾기"
    : isFiles && folderPath.length
      ? folderPath[folderPath.length - 1].name
      : TABS.find((t) => t.id === tab).label;

  // 검색 결과·즐겨찾기에서 연 폴더는 지금 폴더 경로의 하위가 아니라 드라이브
  // 어디에나 있을 수 있으므로, 기존 경로에 이어 붙이지 않고 검색·즐겨찾기를
  // 끝낸 뒤 파일 탭에서 그 폴더를 새 최상위처럼 연다.
  const openFolder = (item) => {
    if (isSearchActive(searchQuery) || favoritesView) {
      setSearchQuery("");
      setShowFavorites(false);
      setFolderPath([{ id: item.id, name: item.name }]);
      if (tab !== "files") {
        suppressFolderResetRef.current = true;
        setTab("files");
      }
    } else {
      setFolderPath((p) => [...p, { id: item.id, name: item.name }]);
    }
  };

  return (
    <>
      {showTransfers ? (
        <TransfersPage transfers={transfers} onBack={() => setShowTransfers(false)} onClearAll={() => setTransfers([])} />
      ) : (
        <>
          <main className="page">
            <PageHeader
              title={title}
              showSearch={SEARCH_TABS.has(tab)}
              resetKey={tab}
              toolkitActive={toolkitVisible}
              searchAlwaysOn={searchAlwaysOn}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              viewMode={viewMode}
              onUpload={handleUpload}
              onNewFolder={handleNewFolder}
              canGoBack={(isFiles && folderPath.length > 0) || favoritesView}
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
            />
            {tab === "home" && !showFavorites && (
              <HomePage
                session={session}
                refreshKey={refreshKey}
                onOpenFavorites={() => setShowFavorites(true)}
                onOpenAddonStore={() => setShowAddonStore(true)}
              />
            )}
            {(isFiles || favoritesView) && (
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
              />
            )}
            {tab === "settings" && (
              <SettingsPage
                dark={theme === "dark"}
                onToggleTheme={handleToggleTheme}
                toolkitActive={toolkitAlwaysOn}
                onToggleToolkit={handleToggleToolkitAlwaysOn}
                toolkitLayout={toolkitLayout}
                viewMode={viewMode}
                onChangeToolkitLayout={changeToolkitLayout}
                onResetToolkitLayout={() => changeToolkitLayout(BASE_TOOL_IDS, "reset")}
                searchAlwaysOn={searchAlwaysOn}
                onToggleSearchAlwaysOn={setSearchAlwaysOn}
                onOpenTrash={() => setShowTrash(true)}
                onOpenTags={() => setShowTags(true)}
                onLogout={() => {
                  clearSession();
                  setSession(null);
                }}
              />
            )}
          </main>
          <TabBar
            active={tab}
            onChange={(id) => {
              setTab(id);
              window.scrollTo({ top: 0 });
            }}
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
      {renameTargets && (
        <RenameModal items={renameTargets} onClose={() => setRenameTargets(null)} onSubmit={handleRenameSubmit} />
      )}
      {moveTargets && (
        <MoveModal
          session={session}
          items={moveTargets}
          onClose={() => setMoveTargets(null)}
          onSubmit={handleMoveSubmit}
        />
      )}
      {tagTargets && <TagModal items={tagTargets} onClose={() => setTagTargets(null)} onSubmit={handleTagSubmit} />}
      {optimizeTargets && (
        <OptimizeModal items={optimizeTargets} onClose={() => setOptimizeTargets(null)} onSubmit={handleOptimizeSubmit} />
      )}
      {newFolderOpen && <NewFolderModal onClose={() => setNewFolderOpen(false)} onSubmit={handleNewFolderSubmit} />}
      {paletteViewerItem && (
        <FileViewer
          session={session}
          items={[paletteViewerItem]}
          initialIndex={0}
          paletteMode
          onClose={() => setPaletteViewerItem(null)}
        />
      )}
      {splitCompareTargets && (
        <SplitCompareViewer
          session={session}
          items={splitCompareTargets}
          onClose={() => setSplitCompareTargets(null)}
        />
      )}
      <Toast message={toast} />
    </>
  );
}
