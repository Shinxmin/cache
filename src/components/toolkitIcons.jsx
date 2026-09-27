import { ArrowRightIcon, DownloadIcon, GalleryIcon, InfoIcon, ListIcon, TrashIcon } from "./icons";

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

// 즐겨찾기 별. 툴킷 아이콘(18px)과 파일 이름 옆 표시(작게)에 같이 쓴다.
export function StarIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2.6l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4l-6 3.3 1.3-6.6L2.4 9.5l6.7-.8z" />
    </svg>
  );
}

// 스플릿 비교: 모서리가 둥근 정사각형을 반으로 나눠 오른쪽 절반만
// 채운 대비 아이콘. 선(stroke) 없이 채움(fill)만으로 그린다 — 왼쪽 절반은
// 테두리만 남도록 안쪽을 구멍으로 파낸 "틀" 모양이고(evenodd), 오른쪽
// 절반은 그대로 꽉 채워, 툴킷의 다른 단색 채움 아이콘들과 방식이 같다.
export function SplitIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z
           M4.6 5.6H12V18.4H4.6z"
      />
    </svg>
  );
}

// 스튜디오 툴킷 도구 레지스트리. 툴킷 바(StudioToolkitBar)와 설정의 사용자
// 정렬 미리보기(ToolkitArranger)가 같은 정의를 공유한다. ctx: { viewMode }.
export const TOOL_META = {
  info: { label: "정보", needsSelection: true, icon: () => <InfoIcon /> },
  trash: { label: "휴지통으로 삭제", needsSelection: true, icon: () => <TrashIcon /> },
  download: { label: "다운로드", needsSelection: true, icon: () => <DownloadIcon /> },
  move: { label: "이동", needsSelection: true, icon: () => <ArrowRightIcon /> },
  view: {
    label: (ctx) => (ctx?.viewMode === "gallery" ? "리스트로 보기" : "갤러리로 보기"),
    needsSelection: false,
    icon: (ctx) => (ctx?.viewMode === "gallery" ? <ListIcon /> : <GalleryIcon />),
  },
  blur: { label: "선택한 썸네일 블러", needsSelection: true, icon: () => <EyeIcon /> },
  favorite: { label: "즐겨찾기", needsSelection: true, icon: () => <StarIcon /> },
  split: { label: "스플릿 비교", needsSelection: true, icon: () => <SplitIcon /> },
};

export function toolLabel(id, ctx) {
  const meta = TOOL_META[id];
  if (!meta) return id;
  return typeof meta.label === "function" ? meta.label(ctx) : meta.label;
}
