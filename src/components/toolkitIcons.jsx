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

// 용량 압축: 머티리얼 디자인의 "폴더 + zip" 아이콘처럼, 폴더 모양 가운데를
// 지퍼 이빨(작은 정사각형을 세로로 뚫은 구멍)로 관통시켜 압축 폴더임을 나타낸다.
function ZipFolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z
           M11.1 9h1.8v1.8h-1.8z
           M11.1 11.7h1.8v1.8h-1.8z
           M11.1 14.4h1.8v1.8h-1.8z
           M11.1 17.1h1.8v1.8h-1.8z"
      />
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

// 팔레트 추출 애드온: 머티리얼 디자인의 물방울(잉크 한 방울) 모양.
export function PaletteIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2C12 2 5 10.75 5 15.25 5 18.87 8.13 22 12 22s7-3.13 7-6.75C19 10.75 12 2 12 2z" />
    </svg>
  );
}

// 스플릿 비교 애드온: 모서리가 약간 둥근 정사각형을 세로로 반 잘라, 오른쪽
// 절반만 채운 대비 아이콘(채워진 쪽과 빈 쪽의 경계 자체가 가운데 분할선이다).
export function SplitIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6z" fill="currentColor" />
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
  optimize: { label: "용량 압축", needsSelection: true, icon: () => <ZipFolderIcon /> },
  favorite: { label: "즐겨찾기", needsSelection: true, icon: () => <StarIcon /> },
  tag: { label: "태그", needsSelection: true, icon: () => <HashIcon /> },
  rename: { label: "이름 바꾸기", needsSelection: true, icon: () => <PencilIcon /> },
  // 애드온
  palette: { label: "팔레트 추출", needsSelection: true, icon: () => <PaletteIcon /> },
  split: { label: "스플릿 비교", needsSelection: true, icon: () => <SplitIcon /> },
};

export function toolLabel(id, ctx) {
  const meta = TOOL_META[id];
  if (!meta) return id;
  return typeof meta.label === "function" ? meta.label(ctx) : meta.label;
}
