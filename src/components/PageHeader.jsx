import { useEffect, useRef, useState } from "react";
import { BackIcon, EditIcon, FileCopyIcon, FileMoveIcon, LayersIcon, OpenInNewIcon, SettingsIcon, TrashIcon } from "./icons";
import { formatBytes, STORAGE_QUOTA_BYTES } from "../lib/format";

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="18.5" cy="12" r="2.2" />
    </svg>
  );
}

// 파일·폴더를 하나라도 선택하고 있을 때만 설정 버튼 왼쪽에 나타나는 원형 삼점 버튼.
// 선택이 생기면 폭 0에서 45px로 펼쳐지며 나타나고, 선택이 모두 풀리면 같은 방식으로
// 사라진다(열려 있었다면 닫힌다). 누르면 오른쪽 끝은 그대로 둔 채 왼쪽으로 자라나
// 삭제·이동·복사·이름 바꾸기 네 항목(아이콘 + 아래 글자)이 드러난다. 항목을 누르면 그
// 자리에서 닫히고, 해당 동작의 하단바 패널이 열린다.
function SelectionMoreButton({ visible, onDelete, onMove, onCopy, onRename }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  const items = [
    { key: "delete", label: "삭제", icon: <TrashIcon size={17} />, run: onDelete },
    { key: "move", label: "이동", icon: <FileMoveIcon size={17} />, run: onMove },
    { key: "copy", label: "복사", icon: <FileCopyIcon size={17} />, run: onCopy },
    { key: "rename", label: "이름 바꾸기", icon: <EditIcon size={17} />, run: onRename },
  ];

  return (
    <div
      className={`header-more header-more--selection${visible ? " visible" : ""}${open ? " open" : ""}`}
      aria-hidden={!visible}
    >
      <div className="header-more-inner">
        {items.map((item) => (
          <button
            key={item.key}
            className="header-more-item"
            type="button"
            tabIndex={open ? 0 : -1}
            aria-hidden={!open}
            onClick={() => {
              setOpen(false);
              item.run?.();
            }}
          >
            <span className="header-more-icon">{item.icon}</span>
            <span className="header-more-label">{item.label}</span>
          </button>
        ))}
        <button
          className="header-more-item header-more-toggle"
          type="button"
          tabIndex={visible ? 0 : -1}
          aria-label={open ? "닫기" : "선택 항목 메뉴"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="header-more-icon">
            <DotsIcon />
          </span>
        </button>
      </div>
    </div>
  );
}

// 상단 좌측정렬 제목. position: fixed로 화면 상단에 고정되어 스크롤 범위
// 자체에 포함되지 않는다 — 문서를 아무리 스크롤해도 이 박스는 절대 움직이거나
// 사라지지 않는다. 제목·뒤로가기·선택 메뉴(삼점)·설정 버튼, 그리고 그 밑의
// 스토리지 섹션(사용량 막대)을 그린다. 업로드·새 폴더(+)는 하단바로 옮겨 갔다.
export default function PageHeader({
  title,
  canGoBack,
  onBack,
  hasSelection,
  onDeleteSelected,
  onMoveSelected,
  onCopySelected,
  onRenameSelected,
  storageUsed = 0,
  onOpenSettings,
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
        {canGoBack && (
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
        )}
        <h1 className="page-title">{title}</h1>
        <div className="page-header-actions">
          <SelectionMoreButton
            visible={Boolean(hasSelection)}
            onDelete={onDeleteSelected}
            onMove={onMoveSelected}
            onCopy={onCopySelected}
            onRename={onRenameSelected}
          />
          {/* 설정 버튼. 고정 45px 원이며, 누르면 바로 설정 화면이 열린다. 즐겨찾기 화면에서는
              뜨지 않는다(onOpenSettings를 안 넘기면 아예 렌더링되지 않는다). */}
          {onOpenSettings && (
            <button className="header-settings" type="button" aria-label="설정" onClick={onOpenSettings}>
              <SettingsIcon size={19} />
            </button>
          )}
        </div>
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
      </section>
    </header>
  );
}
