import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/PageHeader";
import ItemRow from "../components/ItemRow";
import ItemSheet from "../components/ItemSheet";
import { useApp } from "../AppContext";
import { useToast } from "../components/Toast";
import { formatBytes } from "../lib/format";
import { getProfile, recentFiles, thumbnailUrls, usage } from "../lib/items";

export default function HomePage() {
  const { user, refreshKey, refresh, startUpload, goTab } = useApp();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [limit, setLimit] = useState(null);
  const [recent, setRecent] = useState([]);
  const [thumbs, setThumbs] = useState({});
  const [selected, setSelected] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([usage(), getProfile(), recentFiles(8)])
      .then(async ([u, p, r]) => {
        if (!alive) return;
        setStats(u);
        setLimit(p.storageLimitBytes);
        setRecent(r);
        const t = await thumbnailUrls(r).catch(() => ({}));
        if (alive) setThumbs(t);
      })
      .catch((e) => alive && toast(e.message, { error: true }));
    return () => {
      alive = false;
    };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = stats && limit ? Math.min(100, (stats.usedBytes / limit) * 100) : 0;
  const greeting = user?.email?.split("@")[0] ?? "";

  return (
    <div className="page tab-panel">
      <PageHeader
        title="홈"
        actions={
          <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>
            업로드
          </button>
        }
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = "";
          if (files?.length) startUpload(files, null);
        }}
      />

      <section className="glass card">
        <div className="card-title">저장 공간</div>
        <div className="usage-num">
          {stats ? formatBytes(stats.usedBytes) : "—"}
          <small>/ {limit ? formatBytes(limit, 0) : "—"}</small>
        </div>
        <div className="bar" style={{ marginTop: 14 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="row-meta" style={{ marginTop: 8 }}>
          {greeting && `${greeting} · `}
          {stats ? `${pct.toFixed(1)}% 사용 중` : "불러오는 중…"}
        </div>
      </section>

      <div className="stat-grid">
        <div className="glass stat">
          <b>{stats ? stats.fileCount.toLocaleString() : "—"}</b>
          <span>파일</span>
        </div>
        <div className="glass stat">
          <b>{stats ? stats.folderCount.toLocaleString() : "—"}</b>
          <span>폴더</span>
        </div>
      </div>

      <div className="section-label">최근 파일</div>
      <section className="glass list">
        {recent.length === 0 ? (
          <div className="empty">
            아직 파일이 없습니다.
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>
                첫 파일 업로드
              </button>
            </div>
          </div>
        ) : (
          recent.map((item) => <ItemRow key={item.id} item={item} thumb={thumbs[item.r2_key]} onOpen={setSelected} onMore={setSelected} />)
        )}
      </section>

      {recent.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <button className="btn btn-text" onClick={() => goTab("files")}>
            모든 파일 보기
          </button>
        </div>
      )}

      <ItemSheet item={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </div>
  );
}
