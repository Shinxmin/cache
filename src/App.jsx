import { useEffect, useMemo, useState } from "react";
import TabBar, { TABS } from "./components/TabBar";
import PageHeader from "./components/PageHeader";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import FilesPage from "./pages/FilesPage";
import TransfersPage from "./pages/TransfersPage";
import TrashPage from "./pages/TrashPage";
import FileViewer from "./pages/FileViewer";
import { clearSession, loadSession, saveSession, verifySession } from "./lib/session";
import { createFolder, downloadFile, trashFiles, uploadFile } from "./lib/drive";
import { isImage, isVideo } from "./lib/thumbnail";

// 검색바는 홈·파일 탭에서만 뜬다(설정에는 없음). 제목과 한 fixed 박스로 묶여
// PageHeader 안에서 렌더링된다(PageHeader.jsx 참고).
const SEARCH_TABS = new Set(["home", "files"]);

const THEME_COLORS = { dark: "#1B1B1B", light: "#F5F5F7" };

// 시스템 다크/라이트 설정을 따라 html[data-theme]와 theme-color를 맞춘다.
function useSystemTheme() {
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = mq.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}

export default function App() {
  useSystemTheme();

  // 저장된 토큰이 서버에서도 유효한지 확인될 때까지는 아무것도 그리지 않는다
  // (로그인 화면이 잠깐 번쩍이는 것을 막기 위함).
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [tab, setTab] = useState(TABS[0].id);
  // 설정의 "스튜디오 툴킷 항상 활성화" 체크박스 값. 실제로 툴킷이 보이는지는
  // 아래 toolkitVisible이 결정한다(이 설정이 꺼져 있어도 선택 중이면 뜬다).
  const [toolkitAlwaysOn, setToolkitAlwaysOn] = useState(false);
  const [searchAlwaysOn, setSearchAlwaysOn] = useState(true);

  // 파일 탭(웹드라이브) 상태
  const [viewMode, setViewMode] = useState("gallery");
  const [folderPath, setFolderPath] = useState([]); // [{id, name}] — 루트는 빈 배열
  const [refreshKey, setRefreshKey] = useState(0);
  // 지금 폴더에서 FilesPage가 실제로 보여주고 있는 항목들. "전체 선택"과
  // 선택 항목 다운로드/삭제가 파일의 r2_key 등 전체 정보를 봐야 해서 필요하다.
  const [visibleItems, setVisibleItems] = useState([]);
  // 꾹 눌러(또는 전체 선택으로) 선택된 항목의 id 집합.
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showTrash, setShowTrash] = useState(false);

  // 전송(업로드/다운로드) 상태. 진행 중인 것이 있을 때만 헤더에 버튼이 뜬다.
  const [transfers, setTransfers] = useState([]);
  const [showTransfers, setShowTransfers] = useState(false);
  // 헤더 버튼 테두리에 도는 원형 게이지용 전체 진행도(0~1). 여러 파일을 한 번에
  // 올릴 때는 "지금 파일까지의 진행률"이 아니라 배치 전체 기준으로 계산한다.
  const [transferRing, setTransferRing] = useState(0);

  // 이미지·영상은 누르면 다운로드하지 않고 이 화면에서 바로 크게 보여준다.
  const [viewerItem, setViewerItem] = useState(null);

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

  const parentId = folderPath.length ? folderPath[folderPath.length - 1].id : null;
  const activeTransfer = useMemo(() => transfers.find((t) => t.status === "active"), [transfers]);

  // 폴더를 옮기면 이전 폴더에서의 선택은 의미가 없다.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [parentId]);

  // 스튜디오 툴킷은 설정이 항상 켜 두었거나, 선택된 파일이 하나라도 있으면 뜬다.
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
  const handleUpload = async (fileList) => {
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

  const handleNewFolder = async () => {
    const name = window.prompt("새 폴더 이름");
    if (!name?.trim()) return;
    try {
      await createFolder(session.token, name.trim(), parentId);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("폴더를 만들지 못했습니다");
    }
  };

  // 이미지·영상은 누르기만 해서 다운로드되면 안 되므로 뷰어를 띄운다.
  // 그 외 파일만 눌렀을 때 바로 내려받는다.
  const handleOpenFile = (item) => {
    if (isImage(item.mime) || isVideo(item.mime)) {
      setViewerItem(item);
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

  // 선택된 항목(폴더 제외) 전체를 순서대로 내려받는다.
  const handleDownloadSelected = async () => {
    const targets = visibleItems.filter((it) => selectedIds.has(it.id) && !it.is_folder);
    for (const item of targets) {
      setTransferRing(0);
      await track(item.name, "down", (onProgress) =>
        downloadFile({
          token: session.token,
          item,
          onProgress: (p) => {
            onProgress(p);
            setTransferRing(p);
          },
        })
      );
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

  const isFiles = tab === "files";
  const title = isFiles && folderPath.length ? folderPath[folderPath.length - 1].name : TABS.find((t) => t.id === tab).label;

  return (
    <>
      {showTransfers ? (
        <TransfersPage transfers={transfers} onBack={() => setShowTransfers(false)} />
      ) : (
        <>
          <main className="page">
            <PageHeader
              title={title}
              showSearch={SEARCH_TABS.has(tab)}
              resetKey={tab}
              toolkitActive={toolkitVisible}
              onCloseToolkit={() => setSelectedIds(new Set())}
              closeDisabled={toolkitAlwaysOn}
              searchAlwaysOn={searchAlwaysOn}
              viewMode={viewMode}
              onToggleView={() => setViewMode((v) => (v === "gallery" ? "list" : "gallery"))}
              onUpload={handleUpload}
              onNewFolder={handleNewFolder}
              canGoBack={isFiles && folderPath.length > 0}
              onBack={() => setFolderPath((p) => p.slice(0, -1))}
              transferActive={Boolean(activeTransfer)}
              transferDirection={activeTransfer?.direction}
              transferProgress={transferRing}
              onOpenTransfers={() => setShowTransfers(true)}
              allSelected={allSelected}
              onToggleSelectAll={handleToggleSelectAll}
              hasSelection={selectedIds.size > 0}
              onDownloadSelected={handleDownloadSelected}
              onTrashSelected={handleTrashSelected}
            />
            {isFiles && (
              <FilesPage
                session={session}
                viewMode={viewMode}
                parentId={parentId}
                onOpenFolder={(item) => setFolderPath((p) => [...p, { id: item.id, name: item.name }])}
                onOpenFile={handleOpenFile}
                refreshKey={refreshKey}
                selectionMode={toolkitVisible}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onLongPressItem={toggleSelect}
                onItemsChange={setVisibleItems}
              />
            )}
            {tab === "settings" && (
              <SettingsPage
                toolkitActive={toolkitAlwaysOn}
                onToggleToolkit={setToolkitAlwaysOn}
                searchAlwaysOn={searchAlwaysOn}
                onToggleSearchAlwaysOn={setSearchAlwaysOn}
                onOpenTrash={() => setShowTrash(true)}
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
      {viewerItem && (
        <FileViewer session={session} item={viewerItem} onClose={() => setViewerItem(null)} />
      )}
    </>
  );
}
