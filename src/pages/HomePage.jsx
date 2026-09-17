import { useEffect, useState } from "react";
import { storageBreakdown } from "../lib/drive";
import { formatBytes } from "../lib/format";
import { ChevronRightIcon } from "../components/icons";
import Spinner from "../components/Spinner";

const GROUPS = [
  { id: "by_folder", label: "폴더 별" },
  { id: "by_extension", label: "확장자 별" },
  { id: "by_tag", label: "태그 별" },
];
const MAX_ROWS = 8;

// 홈 탭 본문. 구분선으로 나뉜 세 섹션: 스토리지 사용량 대시보드(폴더 별·
// 확장자 별·태그 별, 기본은 폴더 별), 즐겨찾기(누르면 즐겨찾기 화면),
// 애드온 스토어(누르면 스토어 화면). 대시보드는 항목이 많으면 상위 8개만
// 보여주고 나머지는 "기타" 한 줄로 합친다. 막대는 전체 사용량 대비 비율이다.
export default function HomePage({ session, refreshKey, onOpenFavorites, onOpenAddonStore }) {
  const [group, setGroup] = useState("by_folder");
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    storageBreakdown(session.token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, refreshKey]);

  const rows = (() => {
    if (!data) return [];
    const list = data[group] ?? [];
    if (list.length <= MAX_ROWS) return list;
    const head = list.slice(0, MAX_ROWS - 1);
    const rest = list.slice(MAX_ROWS - 1);
    return [
      ...head,
      { key: "기타", size: rest.reduce((s, r) => s + Number(r.size), 0), count: rest.reduce((s, r) => s + Number(r.count), 0) },
    ];
  })();
  const total = Number(data?.total ?? 0);

  return (
    <div className="home">
      <section className="home-section">
        <div className="home-section-head">
          <h2 className="home-section-title">스토리지</h2>
          <span className="home-total">{state === "ready" ? formatBytes(total) : ""}</span>
        </div>
        <div className="home-segment" role="tablist" aria-label="분류 기준">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              className={`home-segment-btn${group === g.id ? " active" : ""}`}
              onClick={() => setGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && rows.length === 0 && <p className="drive-note">아직 파일이 없습니다</p>}
        {state === "ready" && rows.length > 0 && (
          <ul className="home-bars">
            {rows.map((row) => {
              const size = Number(row.size);
              const pct = total > 0 ? (size / total) * 100 : 0;
              return (
                <li key={row.key} className="home-bar-row">
                  <div className="home-bar-line">
                    <span className="home-bar-name">{row.key}</span>
                    <span className="home-bar-meta">
                      {formatBytes(size)} · {pct < 1 && pct > 0 ? "<1" : Math.round(pct)}%
                    </span>
                  </div>
                  <span className="home-bar-track">
                    <span className="home-bar-fill" style={{ width: `${Math.max(pct, size > 0 ? 1 : 0)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="home-section">
        <button className="settings-row settings-row--link home-link" type="button" onClick={onOpenFavorites}>
          <span className="settings-row-label">즐겨찾기</span>
          <ChevronRightIcon size={18} />
        </button>
      </section>

      <section className="home-section">
        <button className="settings-row settings-row--link home-link" type="button" onClick={onOpenAddonStore}>
          <span className="settings-row-label">애드온 스토어</span>
          <ChevronRightIcon size={18} />
        </button>
      </section>
    </div>
  );
}
