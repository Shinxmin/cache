import { useRef, useState } from "react";
import { LayersIcon, OpenInNewIcon } from "./icons";
import { formatBytes, formatStorageCost, parseBytes } from "../lib/format";

// 설정의 스토리지 섹션. "3.0GB / 5.0GB"의 총용량(오른쪽)은 연한 회색 둥근 상자로 감싸져 있고, 누르면 팝업
// 없이 그 자리에서 글자를 고칠 수 있다(엔터·바깥 터치로 확정, Esc로 취소).
export default function StorageSection({
  storageUsed = 0,
  storageBillingBytes = 0,
  quotaBytes,
  onChangeQuota,
}) {
  const storagePercent = Math.min(100, (storageUsed / quotaBytes) * 100);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const startEdit = () => {
    setDraft(formatBytes(quotaBytes));
    setEditing(true);
  };
  const cancelRef = useRef(false);
  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setEditing(false);
      return;
    }
    const bytes = parseBytes(draft);
    if (bytes) onChangeQuota?.(bytes);
    setEditing(false);
  };
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
          aria-valuemax={quotaBytes}
          aria-valuenow={storageUsed}
        >
          <div className="storage-usage-fill" style={{ width: `${storagePercent}%` }} />
        </div>
        <span className="storage-usage-text">
          {formatBytes(storageUsed)} /{" "}
          {editing ? (
            <input
              className="storage-quota storage-quota--input"
              value={draft}
              style={{ width: `${Math.max(5, draft.length + 1)}ch` }}
              autoFocus
              aria-label="총용량"
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                else if (e.key === "Escape") {
                  cancelRef.current = true;
                  e.currentTarget.blur();
                }
              }}
            />
          ) : (
            <button className="storage-quota" type="button" aria-label="총용량 수정" onClick={startEdit}>
              {formatBytes(quotaBytes)}
            </button>
          )}
        </span>
      </div>
      {/* 청구 금액(10GB 초과분 × $0.015/GB, 페이지를 새로 불러올 때만 계산). 지역·레이턴시는 네트워크 섹션. */}
      <dl className="storage-stats storage-stats--single">
        <div className="storage-stat">
          <dt>청구 금액</dt>
          <dd>{formatStorageCost(storageBillingBytes)}</dd>
        </div>
      </dl>
    </section>
  );
}
