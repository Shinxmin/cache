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
  setBlur,
  setFavorite,
  setFolderThumbnail,
  setInfoRevealed,
  splitPresetParts,
  trashFiles,
  uploadFile,
} from "./lib/drive";
import { isImage, isVideo } from "./lib/thumbnail";
import { isOptimizableFile } from "./lib/optimize";
import { isSearchActive } from "./lib/search";
import { loadTheme, saveTheme } from "./lib/theme";

const TOAST_MS = 2000;

const THEME_COLORS = { dark: "#000000", light: "#FFFFFF" };

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
  // 검색바의 레이어 버튼으로 여는 빈 스튜디오 패널(하단에서 열리는 애니메이션만 남아 있다).
  const [studioOpen, setStudioOpen] = useState(false);
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

  // 검색바 오른쪽 끝의 레이어 버튼: 내용이 없는 빈 스튜디오 패널을 하단에서 연다
  // (이미 열려 있으면 닫는다). 스튜디오 화면은 삭제되어 열리는 애니메이션만 남았다.
  const handleStudioSelected = () => {
    if (studioOpen) {
      setStudioOpen(false);
      return;
    }
    closeAllToolPanels();
    setStudioOpen(true);
  };

  // 삭제 확인·새 폴더·이동·스튜디오는 전부 검색바 위 같은 패널 자리를
  // 공유한다 — 그중 하나를 열기 전에 항상 이걸 먼저 불러 나머지를 전부 닫는다.
  const closeAllToolPanels = () => {
    setDeleteConfirmOpen(false);
    setNewFolderOpen(false);
    cancelMove();
    setStudioOpen(false);
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
        viewMode={viewMode}
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
            studioOpen={studioOpen}
            onCancelStudio={() => setStudioOpen(false)}
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
