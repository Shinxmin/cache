import { useEffect, useRef } from "react";
import { DownloadIcon, UploadIcon } from "./icons";

// 전송 버튼(45px 원) 테두리를 감싸는 진행도 링. 버튼 지름(45)보다 살짝 안쪽(반지름 20.5)에 그려 원형
// 버튼 테두리를 따라 도는 것처럼 보이게 한다.
const RING_R = 20.5;
const RING_C = 2 * Math.PI * RING_R;

function TransferButton({ kind, stat, onAck }) {
  const failed = stat.failed > 0;
  const fraction = stat.total ? Math.min(1, (stat.done + stat.current) / stat.total) : 0;
  const label = kind === "down" ? "다운로드" : "업로드";
  return (
    <button
      className={`header-settings transfer-btn${failed ? " is-failed" : ""}`}
      type="button"
      aria-label={failed ? `${label} 실패 — 눌러서 닫기` : `${label} 진행 중`}
      onClick={onAck}
    >
      <svg className="transfer-ring" viewBox="0 0 45 45" width="45" height="45" aria-hidden="true">
        <circle className="transfer-ring-track" cx="22.5" cy="22.5" r={RING_R} />
        <circle
          className="transfer-ring-fill"
          cx="22.5"
          cy="22.5"
          r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - fraction)}
        />
      </svg>
      {kind === "down" ? <DownloadIcon size={19} /> : <UploadIcon size={19} />}
    </button>
  );
}

// 상단 좌측정렬 제목. position: fixed로 화면 상단에 고정되어 스크롤 범위
// 자체에 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 절대 움직이거나
// 사라지지 않는다. 제목만 그린다 — 스토리지 섹션은 본문(StorageSection)이라 스크롤하면 함께 올라가
// 사라지고, 뒤로 가기·업로드·새 폴더(+)·선택 메뉴(삼점)·설정 버튼은 하단바에 있다. 제목 줄 오른쪽에는
// 다운로드·업로드가 진행 중일 때만 원형 진행도 버튼이 뜬다(실패하면 빨갛게 남고, 누르면 사라진다).
export default function PageHeader({ title, transfers, onAckTransfer }) {
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

  return (
    <header className="page-header" ref={ref}>
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
        {/* 하단 설정 버튼과 같은 크기(45px)·같은 오른쪽 좌표에 놓인다. 둘 다 있으면 업로드가 왼쪽. */}
        {transfers && (transfers.up.total > 0 || transfers.down.total > 0) && (
          <div className="page-header-actions">
            {transfers.up.total > 0 && <TransferButton kind="up" stat={transfers.up} onAck={() => onAckTransfer?.("up")} />}
            {transfers.down.total > 0 && (
              <TransferButton kind="down" stat={transfers.down} onAck={() => onAckTransfer?.("down")} />
            )}
          </div>
        )}
      </div>
    </header>
  );
}
