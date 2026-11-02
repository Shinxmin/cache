import { LayersIcon, OpenInNewIcon } from "./icons";
import { formatBytes, formatStorageCost, STORAGE_QUOTA_BYTES } from "../lib/format";

// 파일 화면 본문 맨 위의 스토리지 섹션. 고정 헤더가 아니라 본문에 있어서 스크롤하면 목록과 함께
// 올라가 사라진다.
export default function StorageSection({ storageUsed = 0, storageBillingBytes = 0, storageRegion = "", storageLatency = null }) {
  const storagePercent = Math.min(100, (storageUsed / STORAGE_QUOTA_BYTES) * 100);
  // 테두리(하단바와 같은 모서리 곡률)로 감싼 상자 안에 레이어 아이콘 + "스토리지", 그 아래 사용량
  // 막대(최대 STORAGE_QUOTA_BYTES)와 "3.5GB / 10.0GB" 표기. 제목 오른쪽의 작은 회색 아이콘은 Cloudflare
  // R2 대시보드를 새 탭으로 여는 바로가기다.
  return (
    <section className="page-brand-box">
      <div className="page-brand">
        <LayersIcon size={23} />
        <h2 className="page-brand-title">스토리지</h2>
        <a
          className="page-brand-link"
          href="https://dash.cloudflare.com/?to=/:account/r2/overview"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Cloudflare R2 대시보드 열기"
        >
          <OpenInNewIcon size={15} />
        </a>
      </div>
      <div className="storage-usage">
        <div
          className="storage-usage-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={STORAGE_QUOTA_BYTES}
          aria-valuenow={storageUsed}
        >
          <div className="storage-usage-fill" style={{ width: `${storagePercent}%` }} />
        </div>
        <span className="storage-usage-text">
          {formatBytes(storageUsed)} / {formatBytes(STORAGE_QUOTA_BYTES)}
        </span>
      </div>
      {/* 지역(버킷 위치의 대륙) · 레이턴시(이 기기→R2 왕복, 10초마다 다시 잼) · 청구 금액(10GB 초과분 ×
          $0.015/GB, 페이지를 새로 불러올 때만 계산). */}
      <dl className="storage-stats">
        <div className="storage-stat">
          <dt>지역</dt>
          <dd>{storageRegion || "—"}</dd>
        </div>
        <div className="storage-stat">
          <dt>레이턴시</dt>
          <dd>{storageLatency == null ? "—" : `${storageLatency}ms`}</dd>
        </div>
        <div className="storage-stat">
          <dt>청구 금액</dt>
          <dd>{formatStorageCost(storageBillingBytes)}</dd>
        </div>
      </dl>
    </section>
  );
}
