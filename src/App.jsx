import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "./components/PageHeader";
import BottomSearchBar from "./components/BottomSearchBar";
import SplashScreen from "./components/SplashScreen";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import FilesPage from "./pages/FilesPage";
import TrashPage from "./pages/TrashPage";
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
  getItemInfo,
  getStoragePasswordStatus,
  setFilesLocked,
  verifyStoragePassword,
  getStorageRegion,
  getStorageUsed,
  measureStorageLatency,
  renameFiles,
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
import { extensionOf } from "./lib/filename";
import useTransferQueue from "./hooks/useTransferQueue";
import { formatBytes, formatDateTime, loadQuotaBytes, saveQuotaBytes } from "./lib/format";
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
  const [showDuplicates, setShowDuplicates] = useState(false);
  // 스튜디오 툴킷의 삭제(휴지통) 아이콘을 누르면 켜진다. 이 동작만 별도
  // 모달 대신 하단 검색바가 위로 확장되며 그 자리에서 확인을 받는다
  // (BottomSearchBar 참고) — 다른 삭제·복원 확인은 전부 그대로 ConfirmModal.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // 선택 메뉴(하단바의 삼점)의 이동. 삭제 확인과 같은 방식으로 하단 검색바가
  // 확장되는 패널을 쓴다. 패널 안에서 드라이브를 폴더별로 눌러 내려가다가
  // 확인을 누르면 지금 들어와 있는 폴더로 옮긴다(movePath가 빈 배열이면
  // 최상위). moveRows는 지금 보고 있는 폴더의 목록이다.
  const [moveOpen, setMoveOpen] = useState(false);
  // 선택 메뉴의 이름 바꾸기. 새 폴더처럼 하단 검색바가 이름 입력창이 된다.
  const [renameOpen, setRenameOpen] = useState(false);
  // 선택 메뉴의 정보. 하나만 선택했을 때만 열리고, 하단 패널에 업로드·생성 시각과 파일 개수·용량을 보여준다.
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoLines, setInfoLines] = useState(null); // [시각, "N개 파일 • 용량"] | null(불러오는 중)
  const [renameName, setRenameName] = useState("");
  // 스토리지 통합 암호: 설정돼 있는지(정보 패널의 암호화 체크박스 활성 여부)와, 잠긴 항목을 열 때 뜨는 암호 입력 패널.
  const [hasStoragePw, setHasStoragePw] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockPw, setUnlockPw] = useState("");
  const unlockRunRef = useRef(null); // 암호가 맞았을 때 이어서 실행할 동작(열기)
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

  // 스토리지 섹션(헤더)의 사용량. 목록이 새로 고쳐질 때마다 다시 받는다.
  const [storageUsed, setStorageUsed] = useState(0);
  // 스토리지 섹션의 총용량(최댓값). 설정에서 직접 고칠 수 있고 이 기기에 저장된다.
  const [quotaBytes, setQuotaBytes] = useState(loadQuotaBytes);
  // 청구 금액 계산에 쓰는 용량. 페이지를 새로 불러올 때(세션당 처음 한 번)만 정해지고, 그 뒤 업로드·
  // 삭제로 사용량이 바뀌어도 다시 계산하지 않는다.
  const [storageBillingBytes, setStorageBillingBytes] = useState(0);
  const billingLoadedRef = useRef(false);
  // 스토리지 섹션의 지역(버킷 위치의 대륙)과 레이턴시(이 기기→R2 왕복 ms). 세션마다 한 번 잰다.
  const [storageRegion, setStorageRegion] = useState("");
  const [storageLatency, setStorageLatency] = useState(null);

  // 이미지·영상은 누르면 다운로드하지 않고 이 화면에서 바로 크게 보여준다.
  // 뷰어 안에서 스와이프로 이전/다음으로 넘기려면 지금 폴더의 미디어 목록과
  // 그 안에서 몇 번째를 열었는지가 필요하다.
  const [viewerIndex, setViewerIndex] = useState(null);
  // 스플릿 프리셋 항목(split_pair가 있는 항목)은 일반 뷰어로 스와이프해
  // 넘어가는 목록에서 뺀다 — 그 항목은 항상 직접 탭해서 스플릿 비교 화면
  // 으로만 열려야 하기 때문이다(handleOpenFile 참고).
  // 암호화(잠금)된 항목은 스와이프로 넘어가는 목록에서도 뺀다 — 암호를 입력해 직접 연 그 항목만 뷰어에 들어간다.
  const mediaItems = useMemo(
    () => visibleItems.filter((it) => (isImage(it.mime) || isVideo(it.mime)) && !it.split_pair && !it.locked),
    [visibleItems]
  );
  const [viewerItems, setViewerItems] = useState([]);

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


  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    getStorageUsed(session.token)
      .then((bytes) => {
        if (cancelled) return;
        setStorageUsed(bytes);
        if (!billingLoadedRef.current) {
          billingLoadedRef.current = true;
          setStorageBillingBytes(bytes);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.token, refreshKey]);

  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    getStoragePasswordStatus(session.token)
      .then((has) => {
        if (!cancelled) setHasStoragePw(has);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session) return undefined;
    let cancelled = false;
    getStorageRegion(session.token)
      .then((region) => {
        if (!cancelled) setStorageRegion(region);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  // 레이턴시는 10초마다 다시 잰다. 화면이 숨겨져 있는 동안(다른 탭·앱)은 쉬었다가 돌아오면 바로 잰다.
  // (스토리지 섹션이 있는 설정 화면이 열려 있는 동안만 잰다.)
  useEffect(() => {
    if (!session || !showSettings) return undefined;
    let cancelled = false;
    let timer = 0;
    let running = false;
    const tick = async () => {
      clearTimeout(timer);
      if (running) return;
      running = true;
      if (!document.hidden) {
        const ms = await measureStorageLatency(session.token, session.userId).catch(() => null);
        if (!cancelled && ms != null) setStorageLatency(ms);
      }
      running = false;
      if (!cancelled) timer = setTimeout(tick, 10000);
    };
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session?.token, session?.userId, showSettings]);

  const showToast = (message) => {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  };
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const parentId = folderPath.length ? folderPath[folderPath.length - 1].id : null;

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

  // 업로드·다운로드는 종류별 대기열(useTransferQueue)에 작업으로 넣는다 — 하나가 끝나야 다음 것을 처리하고,
  // 진행 중에도 다른 동작을 계속 할 수 있다. 진행도·실패는 헤더 오른쪽의 원형 버튼이 보여준다.
  const { transfers, enqueue, ack: ackTransfer } = useTransferQueue();

  // 확장자 제한 없이 고른 파일을 대기열에 넣어 순서대로 R2에 올린다. 즐겨찾기 화면에서 눌렀다면 업로드
  // 결과(방금 올린 파일)를 볼 수 있도록 먼저 즐겨찾기를 닫아 파일 화면으로 나온다.
  const handleUpload = (fileList) => {
    if (showFavorites) setShowFavorites(false);
    const files = Array.from(fileList ?? []);
    const target = parentId;
    enqueue(
      "up",
      files.map((file) => ({
        run: async (onProgress) => {
          await uploadFile({ token: session.token, userId: session.userId, file, parentId: target, onProgress });
          setRefreshKey((k) => k + 1);
        },
      }))
    );
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
  const openFileNow = (item) => {
    if (item.split_pair) {
      setSplitCompareTargets(splitPresetParts(item));
      return;
    }
    if (isImage(item.mime) || isVideo(item.mime)) {
      if (item.locked) {
        // 암호를 입력해 연 잠긴 항목은 그 항목만 뷰어에 넣는다.
        setViewerItems([item]);
        setViewerIndex(0);
        return;
      }
      const idx = mediaItems.findIndex((it) => it.id === item.id);
      setViewerItems(mediaItems);
      setViewerIndex(idx >= 0 ? idx : 0);
      return;
    }
    enqueue("down", [{ run: (onProgress) => downloadFile({ token: session.token, item, onProgress }) }]);
  };

  // 암호화(잠금)된 항목은 통합 암호를 입력해야 열린다. 검색바가 암호 입력창이 되고, 암호가 맞으면 열리고
  // 틀리면 아무 반응이 없다(통합 암호가 없으면 막지 않는다).
  const guardLocked = (item, run) => {
    if (!item.locked || !hasStoragePw) {
      run();
      return;
    }
    closeAllToolPanels();
    unlockRunRef.current = run;
    setUnlockPw("");
    setUnlockOpen(true);
  };
  const handleOpenFile = (item) => guardLocked(item, () => openFileNow(item));
  const confirmUnlock = async () => {
    const pw = unlockPw;
    if (!pw) return;
    let valid = false;
    try {
      valid = await verifyStoragePassword(session.token, pw);
    } catch {
      valid = false;
    }
    if (!valid) return; // 틀리면 아무 반응 없음
    const run = unlockRunRef.current;
    unlockRunRef.current = null;
    setUnlockOpen(false);
    setUnlockPw("");
    run?.();
  };
  const cancelUnlock = () => {
    unlockRunRef.current = null;
    setUnlockOpen(false);
    setUnlockPw("");
  };

  // 정보 패널의 암호화 체크박스: 선택한 하나를 잠그거나 푼다(잠그려면 통합 암호가 있어야 한다).
  const toggleInfoLock = async () => {
    const item = visibleItems.find((it) => selectedIds.has(it.id));
    if (!item || (!item.locked && !hasStoragePw)) return;
    try {
      await setFilesLocked(session.token, [item.id], !item.locked);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("암호화 설정을 바꾸지 못했습니다");
    }
  };

  // 선택된 항목을 기기에 저장한다(다운로드 대기열에 넣고 선택은 바로 푼다). 항목이 하나뿐이면 폴더는
  // "폴더 이름.zip"으로, 일반 파일은 그대로 내려받는다. 2개 이상이면(폴더·파일 섞여 있어도) 전부 한 zip
  // 하나로 묶어 내려받는다.
  const handleDownloadSelected = () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    const token = session.token;
    let run;
    if (targets.length === 1) {
      const item = targets[0];
      if (item.is_folder) run = (onProgress) => downloadFolderAsZip({ token, folder: item, onProgress });
      // 스플릿 프리셋 항목은 하나로 합쳐 받지 않고 A·B를 각자 따로 받는다.
      else if (item.split_pair) run = (onProgress) => downloadSplitPresetFiles({ token, item, onProgress });
      else run = (onProgress) => downloadFile({ token, item, onProgress });
    } else {
      const zipName = `선택한 항목 ${targets.length}개.zip`;
      run = (onProgress) => downloadSelectionAsZip({ token, items: targets, zipName, onProgress });
    }
    enqueue("down", [{ run }]);
    setSelectedIds(new Set());
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

  // 삭제 확인·새 폴더·이동·이름 바꾸기는 전부 검색바 위 같은 패널 자리를
  // 공유한다 — 그중 하나를 열기 전에 항상 이걸 먼저 불러 나머지를 전부 닫는다.
  const closeAllToolPanels = () => {
    setDeleteConfirmOpen(false);
    setNewFolderOpen(false);
    cancelMove();
    setRenameOpen(false);
    setInfoOpen(false);
    setUnlockOpen(false);
  };

  // 선택 메뉴의 정보: 하나만 선택했을 때만 동작한다. 파일은 이미 불러온 항목 값을, 폴더는 서버가 하위 모든
  // 폴더·파일을 합산한 값을 쓴다.
  const handleInfoSelected = async () => {
    if (infoOpen) {
      closeAllToolPanels();
      return;
    }
    if (selectedIds.size !== 1) return;
    const item = visibleItems.find((it) => selectedIds.has(it.id));
    if (!item) return;
    closeAllToolPanels();
    setInfoLines(null);
    // 정보 패널의 검색바는 이름 입력창이다 — 기존 이름을 먼저 채워 둔다.
    setRenameName(item.name);
    setInfoOpen(true);
    const build = (createdAt, files, size) => [formatDateTime(createdAt), `${files}개 파일, ${formatBytes(size)}`];
    if (!item.is_folder) {
      setInfoLines(build(item.created_at, 1, item.size));
      return;
    }
    try {
      const info = await getItemInfo(session.token, item.id);
      setInfoLines(build(info.created_at ?? item.created_at, info.files, info.size));
    } catch {
      setInfoLines(build(item.created_at, 0, 0));
    }
  };

  // 선택 메뉴의 삭제: 하단 검색바의 삭제 확인 패널을 연다(이미 열려 있으면 닫는다).
  const handleDeleteSelected = () => {
    if (deleteConfirmOpen) {
      cancelDeleteConfirm();
      return;
    }
    if (!selectedIds.size) return;
    closeAllToolPanels();
    setDeleteConfirmOpen(true);
  };

  // 선택 메뉴의 이름 바꾸기: 하나면 지금 이름을, 여러 개면 빈 칸을 채워 둔 이름 입력 패널을 연다.
  const handleRenameSelected = () => {
    if (renameOpen) {
      closeAllToolPanels();
      return;
    }
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    closeAllToolPanels();
    setRenameName(targets.length === 1 ? targets[0].name : "");
    setRenameOpen(true);
  };

  // 정보 패널의 확인: 이름을 바꾸지 않았으면 그냥 닫고, 바꿨으면 이름을 저장한다.
  const confirmInfo = async () => {
    const typed = renameName.trim();
    const item = visibleItems.find((it) => selectedIds.has(it.id));
    if (!typed || !item) return;
    if (typed === item.name) {
      setInfoOpen(false);
      return;
    }
    try {
      await renameFiles(session.token, [{ id: item.id, name: typed }]);
      setInfoOpen(false);
      setRenameName("");
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("이름을 바꾸지 못했습니다");
    }
  };

  // 확인: 하나면 입력한 이름 그대로, 여러 개면 "입력한 이름_1", "_2"…에 각자 원래 확장자를 붙인다.
  const confirmRename = async () => {
    const typed = renameName.trim();
    const targets = visibleItems.filter((it) => selectedIds.has(it.id));
    if (!typed || !targets.length) return;
    const renames =
      targets.length === 1
        ? [{ id: targets[0].id, name: typed }]
        : targets.map((it, i) => {
            const ext = it.is_folder ? "" : extensionOf(it.name);
            return { id: it.id, name: `${typed}_${i + 1}${ext ? `.${ext}` : ""}` };
          });
    try {
      await renameFiles(session.token, renames);
      setRenameOpen(false);
      setRenameName("");
      setSelectedIds(new Set());
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("이름을 바꾸지 못했습니다");
    }
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
        onOpenDuplicates={() => setShowDuplicates(true)}
        onBack={() => setShowSettings(false)}
        onStoragePasswordChange={setHasStoragePw}
        storageUsed={storageUsed}
        storageBillingBytes={storageBillingBytes}
        storageRegion={storageRegion}
        storageLatency={storageLatency}
        quotaBytes={quotaBytes}
        onChangeQuota={(bytes) => {
          setQuotaBytes(bytes);
          saveQuotaBytes(bytes);
        }}
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
      {(
        <>
          <main className="page">
            <PageHeader title={title} transfers={transfers} onAckTransfer={ackTransfer} />
            <FilesPage
              session={session}
              viewMode={viewMode}
              parentId={parentId}
              favorites={favoritesView}
              searchQuery={searchQuery}
              onOpenFolder={(item) => guardLocked(item, () => openFolder(item))}
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
            hasSelection={selectedIds.size > 0}
            onDeleteSelected={handleDeleteSelected}
            onMoveSelected={handleMoveSelected}
            onRenameSelected={handleRenameSelected}
            onInfoSelected={handleInfoSelected}
            infoLocked={Boolean(visibleItems.find((it) => selectedIds.has(it.id))?.locked)}
            infoLockDisabled={!hasStoragePw && !visibleItems.find((it) => selectedIds.has(it.id))?.locked}
            onToggleInfoLock={toggleInfoLock}
            unlockOpen={unlockOpen}
            unlockPw={unlockPw}
            onChangeUnlockPw={setUnlockPw}
            onConfirmUnlock={confirmUnlock}
            onCancelUnlock={cancelUnlock}
            allSelected={allSelected}
            onToggleSelectAll={handleToggleSelectAll}
            onDownloadSelected={handleDownloadSelected}
            onConfirmInfo={confirmInfo}
            infoDisabled={selectedIds.size !== 1}
            infoOpen={infoOpen}
            infoLines={infoLines}
            onCancelInfo={() => setInfoOpen(false)}
            onOpenSettings={favoritesView ? undefined : () => setShowSettings(true)}
            renameOpen={renameOpen}
            renameName={renameName}
            onChangeRenameName={setRenameName}
            onConfirmRename={confirmRename}
            onCancelRename={() => setRenameOpen(false)}
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
          items={viewerItems}
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
