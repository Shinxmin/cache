import { ArrowRightIcon, DownloadIcon, GalleryIcon, HashIcon, InfoIcon, ListIcon, TrashIcon } from "./icons";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </svg>
  );
}

// 6:4로 나뉜 원형 그래프(용량 압축). 두 구간 모두 실선이고 끝을 각지게 처리해
// 정확히 맞물려 이어진다.
function CapacityIcon() {
  const r = 9;
  const c = 2 * Math.PI * r;
  const filled = c * 0.6;
  const empty = c * 0.4;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" strokeDasharray={`${empty} ${c}`} strokeDashoffset={-filled} transform="rotate(-90 12 12)" />
      <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${filled} ${c}`} transform="rotate(-90 12 12)" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

// 즐겨찾기 별. 툴킷 아이콘(18px)과 파일 이름 옆 표시(작게)에 같이 쓴다.
export function StarIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z" />
    </svg>
  );
}

// 팔레트 추출 애드온: 물감 팔레트.
export function PaletteIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2.5a9.5 9.5 0 1 0 0 19c1.2 0 2-.9 2-1.9 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .9-1.9 2-1.9h2.2A4.3 4.3 0 0 0 21.5 11C21.5 6.3 17.2 2.5 12 2.5zM6.6 12.5a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm3-4.4a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm4.8 0a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2zm3 4.4a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z" />
    </svg>
  );
}

// 스튜디오 툴킷 도구 레지스트리. 툴킷 바(StudioToolkitBar)와 설정의 사용자
// 정렬 미리보기(ToolkitArranger)가 같은 정의를 공유한다. ctx: { viewMode }.
export const TOOL_META = {
  info: { label: "파일·폴더 용량 정보", needsSelection: true, icon: () => <InfoIcon /> },
  trash: { label: "휴지통으로 삭제", needsSelection: true, icon: () => <TrashIcon /> },
  download: { label: "다운로드", needsSelection: true, icon: () => <DownloadIcon /> },
  move: { label: "이동", needsSelection: true, icon: () => <ArrowRightIcon /> },
  view: {
    label: (ctx) => (ctx?.viewMode === "gallery" ? "리스트로 보기" : "갤러리로 보기"),
    needsSelection: false,
    icon: (ctx) => (ctx?.viewMode === "gallery" ? <ListIcon /> : <GalleryIcon />),
  },
  blur: { label: "선택한 썸네일 블러", needsSelection: true, icon: () => <EyeIcon /> },
  optimize: { label: "용량 압축", needsSelection: true, icon: () => <CapacityIcon /> },
  favorite: { label: "즐겨찾기", needsSelection: true, icon: () => <StarIcon /> },
  tag: { label: "태그", needsSelection: true, icon: () => <HashIcon /> },
  rename: { label: "이름 바꾸기", needsSelection: true, icon: () => <PencilIcon /> },
  // 애드온
  palette: { label: "팔레트 추출", needsSelection: true, icon: () => <PaletteIcon /> },
};

export function toolLabel(id, ctx) {
  const meta = TOOL_META[id];
  if (!meta) return id;
  return typeof meta.label === "function" ? meta.label(ctx) : meta.label;
}
