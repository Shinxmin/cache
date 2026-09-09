import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { AppContext } from "./AppContext";
import { ToastProvider, useToast } from "./components/Toast";
import TabBar, { TABS } from "./components/TabBar";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import FilesPage from "./pages/FilesPage";
import SettingsPage from "./pages/SettingsPage";
import { useTheme } from "./lib/theme";
import { uploadFiles } from "./lib/items";
import { formatBytes } from "./lib/format";

const TAB_KEY = "cache.tab";

export default function App() {
  const theme = useTheme();
  const [session, setSession] = useState(undefined); // undefined = 확인 중

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return <ToastProvider>{session ? <Shell user={session.user} theme={theme} /> : <AuthPage />}</ToastProvider>;
}

function Shell({ user, theme }) {
  const toast = useToast();
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem(TAB_KEY);
    return TABS.some((t) => t.id === saved) ? saved : "home";
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [upload, setUpload] = useState(null);
  const abortRef = useRef(null);

  const goTab = useCallback((id) => {
    setTab(id);
    try {
      sessionStorage.setItem(TAB_KEY, id);
    } catch (_e) {
      /* ignore */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const startUpload = useCallback(
    async (files, parentId) => {
      if (upload?.active) {
        toast("이미 업로드가 진행 중입니다", { error: true });
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setUpload({ active: true, loaded: 0, total: 0, done: 0, count: files.length });
      try {
        const { uploaded, failed } = await uploadFiles(files, parentId, {
          signal: controller.signal,
          onProgress: (p) => setUpload({ active: true, ...p }),
        });
        if (failed.length && !controller.signal.aborted) {
          toast(`${failed.length}개 업로드 실패: ${failed[0].error?.message ?? ""}`, { error: true, duration: 4000 });
        } else if (uploaded.length) {
          toast(`${uploaded.length}개 파일 업로드 완료`);
        }
      } catch (e) {
        toast(e.message, { error: true });
      } finally {
        setUpload(null);
        abortRef.current = null;
        refresh();
      }
    },
    [upload, toast, refresh]
  );

  const ctx = useMemo(() => ({ user, refreshKey, refresh, startUpload, upload, goTab }), [user, refreshKey, refresh, startUpload, upload, goTab]);

  return (
    <AppContext.Provider value={ctx}>
      {tab === "home" && <HomePage key="home" />}
      {tab === "files" && <FilesPage key="files" />}
      {tab === "settings" && <SettingsPage key="settings" theme={theme} />}

      {upload && (
        <div className="upload-panel glass" role="status">
          <div className="upload-head">
            <b>
              업로드 중 {upload.done}/{upload.count}
            </b>
            <span>
              {upload.total ? `${Math.round((upload.loaded / upload.total) * 100)}%` : "0%"} · {formatBytes(upload.loaded)}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${upload.total ? (upload.loaded / upload.total) * 100 : 0}%` }} />
          </div>
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button className="btn btn-text btn-sm" onClick={() => abortRef.current?.abort()}>
              취소
            </button>
          </div>
        </div>
      )}

      <TabBar active={tab} onChange={goTab} />
    </AppContext.Provider>
  );
}
