import { useEffect, useState } from "react";
import { storageSummary } from "../lib/drive";
import { formatBytes } from "../lib/format";
import Spinner from "./Spinner";

const KIND_LABEL = { image: "사진", video: "동영상", other: "기타" };

// 홈 탭 검색바 바로 밑에 뜨는 리퀴드글라스 카드. 총 용량 숫자 하나와, 그
// 아래 사진·동영상·기타 3분류 막대(항상 이 순서·이 색)만 보여준다 — 정액
// 요금제가 없는 앱이라 "한도 대비 %" 개념은 없고, 순수하게 지금 뭘로 채워져
// 있는지만 알려준다. 크기가 0인 분류는 막대·범례 모두에서 건너뛴다.
export default function StorageCard({ session, refreshKey }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    storageSummary(session.token)
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

  const total = Number(data?.total ?? 0);
  const kinds = (data?.by_kind ?? []).map((row) => ({ ...row, size: Number(row.size) })).filter((row) => row.size > 0);

  return (
    <section className="storage-card">
      <span className="storage-card-label">저장 용량</span>
      {state === "loading" && (
        <p className="storage-card-note">
          <Spinner />
        </p>
      )}
      {state === "error" && <p className="storage-card-note">불러오지 못했습니다</p>}
      {state === "ready" && total === 0 && <p className="storage-card-note">아직 파일이 없습니다</p>}
      {state === "ready" && total > 0 && (
        <>
          <p className="storage-card-total">{formatBytes(total)}</p>
          <div className="storage-bar">
            {kinds.map((row) => (
              <span
                key={row.kind}
                className={`storage-bar-seg storage-bar-seg--${row.kind}`}
                style={{ flex: `${row.size} 1 0%` }}
              />
            ))}
          </div>
          <ul className="storage-legend">
            {kinds.map((row) => (
              <li key={row.kind} className="storage-legend-item">
                <span className={`storage-legend-dot storage-legend-dot--${row.kind}`} />
                <span className="storage-legend-name">{KIND_LABEL[row.kind]}</span>
                <span className="storage-legend-size">{formatBytes(row.size)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
