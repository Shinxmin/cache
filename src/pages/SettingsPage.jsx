import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import Sheet from "../components/Sheet";
import { useApp } from "../AppContext";
import { useToast } from "../components/Toast";
import { formatBytes } from "../lib/format";
import { getProfile, setStorageLimit, usage } from "../lib/items";
import { supabase } from "../supabaseClient";
import pkg from "../../package.json";

const MODES = [
  { id: "system", label: "시스템" },
  { id: "light", label: "라이트" },
  { id: "dark", label: "다크" },
];

export default function SettingsPage({ theme }) {
  const { user, refreshKey, refresh } = useApp();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [limitBytes, setLimitBytes] = useState(null);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitGb, setLimitGb] = useState("");
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const standalone = typeof window !== "undefined" && (window.navigator.standalone || matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    let alive = true;
    Promise.all([usage(), getProfile()])
      .then(([u, p]) => alive && (setStats(u), setLimitBytes(p.storageLimitBytes)))
      .catch((e) => alive && toast(e.message, { error: true }));
    return () => {
      alive = false;
    };
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLimit = async (e) => {
    e.preventDefault();
    const gb = Number(limitGb);
    if (!Number.isFinite(gb) || gb <= 0) return;
    setBusy(true);
    try {
      await setStorageLimit(gb * 1024 ** 3);
      setLimitOpen(false);
      refresh();
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
  };

  return (
    <div className="page tab-panel">
      <PageHeader title="설정" />

      <div className="section-label">계정</div>
      <section className="glass list">
        <div className="setting-row">
          <span className="label">이메일</span>
          <span className="value">{user?.email}</span>
        </div>
        <div className="setting-row">
          <span className="label">로그아웃</span>
          <button className="btn btn-sm btn-danger" onClick={() => setSignOutOpen(true)}>
            로그아웃
          </button>
        </div>
      </section>

      <div className="section-label">화면</div>
      <section className="glass list">
        <div className="setting-row">
          <span className="label">테마</span>
          <Segment value={theme.mode} options={MODES} onChange={theme.setMode} />
        </div>
      </section>

      <div className="section-label">저장 공간</div>
      <section className="glass list">
        <div className="setting-row">
          <span className="label">사용 중</span>
          <span className="value">{stats ? formatBytes(stats.usedBytes) : "—"}</span>
        </div>
        <div className="setting-row">
          <span className="label">한도</span>
          <button
            className="btn btn-sm"
            onClick={() => {
              setLimitGb(limitBytes ? String(Math.round((limitBytes / 1024 ** 3) * 100) / 100) : "10");
              setLimitOpen(true);
            }}
          >
            {limitBytes ? formatBytes(limitBytes, 0) : "—"}
          </button>
        </div>
      </section>

      <div className="section-label">앱</div>
      <section className="glass list">
        <div className="setting-row">
          <span className="label">버전</span>
          <span className="value">v{pkg.version}</span>
        </div>
        <div className="setting-row">
          <span className="label">홈 화면 앱</span>
          <span className="value">{standalone ? "설치됨" : "Safari 공유 › 홈 화면에 추가"}</span>
        </div>
        <div className="setting-row">
          <span className="label">저장소</span>
          <span className="value">Supabase · Cloudflare R2 · Vercel</span>
        </div>
      </section>

      <Sheet open={limitOpen} center onClose={() => !busy && setLimitOpen(false)} title="저장 한도" subtitle="GB 단위로 입력하세요.">
        <form onSubmit={saveLimit}>
          <input className="field" type="number" inputMode="decimal" min="0.1" step="0.1" value={limitGb} onChange={(e) => setLimitGb(e.target.value)} autoFocus />
          <div className="sheet-row">
            <button type="button" className="btn" onClick={() => setLimitOpen(false)} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              저장
            </button>
          </div>
        </form>
      </Sheet>

      <Sheet open={signOutOpen} onClose={() => !busy && setSignOutOpen(false)} title="로그아웃할까요?">
        <div className="sheet-row">
          <button className="btn" onClick={() => setSignOutOpen(false)} disabled={busy}>
            취소
          </button>
          <button className="btn btn-primary" onClick={signOut} disabled={busy}>
            로그아웃
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// 리퀴드글라스 세그먼트 컨트롤(선택 항목 뒤에서 미끄러지는 썸)
function Segment({ value, options, onChange }) {
  const idx = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="segment" role="radiogroup">
      <div className="segment-thumb" style={{ width: `calc((100% - 6px) / ${options.length})`, transform: `translateX(${idx * 100}%)`, left: 3 }} aria-hidden />
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? "active" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
