import { useEffect, useRef } from "react";
import { LayersIcon, OpenInNewIcon } from "./icons";
import { formatBytes, formatStorageCost, STORAGE_QUOTA_BYTES } from "../lib/format";

// 상단 좌측정렬 제목. position: fixed로 화면 상단에 고정되어 스크롤 범위
// 자체에 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 절대 움직이거나
// 사라지지 않는다. 제목, 그리고 그 밑의 스토리지 섹션(사용량 막대·지역·레이턴시·청구
// 금액)을 그린다. 뒤로 가기·업로드·새 폴더(+)·선택 메뉴(삼점)·설정 버튼은 하단바에 있다.
export default function PageHeader({
  title,
  storageUsed = 0,
  storageBillingBytes = 0,
  storageRegion = "",
  storageLatency = null,
}) {
  const ref = useRef(null);

  // 헤더가 fixed라 문서 흐름을 벗어나므로, 실제 렌더링된 높이를 재서 --header-h로 넘겨준다. .page의
  // padding-top이 이 값을 써서 본문이 헤더 바로 밑에서 시작한다.
  useEffect(() => {
    const el = ref.current;
    const update = () => document.documentElement.style.setProperty("--header-h", `${el.getBoundingClientRect().height}px`);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const storagePercent = Math.min(100, (storageUsed / STORAGE_QUOTA_BYTES) * 100);

  return (
    <header className="page-header" ref={ref}>
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
      </div>
      {/* 스토리지 섹션: 테두리(하단바와 같은 모서리 곡률)로 감싼 상자 안에 레이어 아이콘 + "스토리지",
          그 아래 사용량 막대(최대 STORAGE_QUOTA_BYTES)와 "3.5GB / 10.0GB" 표기. 오른쪽 위의 작은 회색
          아이콘은 Cloudflare R2 대시보드를 새 탭으로 여는 바로가기다. */}
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
    </header>
  );
}
