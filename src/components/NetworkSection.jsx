import { NetworkIcon } from "./icons";

// 설정의 네트워크 섹션: 지역(버킷 위치의 대륙)과 레이턴시(이 기기→R2 왕복, 설정이 열려 있는 동안 10초마다 다시
// 잼)를 한 줄에 왼쪽 정렬로 보여준다.
export default function NetworkSection({ storageRegion = "", storageLatency = null }) {
  return (
    <section className="page-brand-box">
      <div className="page-brand">
        <NetworkIcon size={23} />
        <h2 className="page-brand-title">네트워크</h2>
      </div>
      <dl className="storage-stats storage-stats--row">
        <div className="storage-stat">
          <dt>지역</dt>
          <dd>{storageRegion || "—"}</dd>
        </div>
        <div className="storage-stat">
          <dt>레이턴시</dt>
          <dd>{storageLatency == null ? "—" : `${storageLatency}ms`}</dd>
        </div>
      </dl>
    </section>
  );
}
