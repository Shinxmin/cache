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

// 스튜디오(이름 바꾸기·태그·용량 압축 통합) 애드온: 슬라이더 세 개가
// 서로 다른 위치에 놓인 이퀄라이저/믹서 모양 — 한 아이콘 안에 여러 값을
// 동시에 다룬다는 은유다.
export function StudioIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M3 6.2h18v1.6H3zM3 11.2h18v1.6H3zM3 16.2h18v1.6H3z" />
      <circle cx="8" cy="7" r="2.4" />
      <circle cx="16" cy="12" r="2.4" />
      <circle cx="10" cy="17" r="2.4" />
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

// 스플릿 비교 애드온: 모서리가 둥근 정사각형을 반으로 나눠 오른쪽 절반만
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

// 하이라이트 클립 애드온: 머티리얼 디자인의 가위(content_cut) 아이콘.
export function ScissorsIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z" />
    </svg>
  );
}

// 폴더 썸네일 애드온: 인물(프로필) 아이콘. "폴더의 대표 얼굴을 정한다"는
// 은유로, 머리+어깨 실루엣 하나만 채워 그린다.
export function PersonIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.34 0-10 1.68-10 5V22h20v-2.5c0-3.32-6.66-5-10-5z" />
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
  favorite: { label: "즐겨찾기", needsSelection: true, icon: () => <StarIcon /> },
  studio: { label: "Studio", needsSelection: true, icon: () => <StudioIcon /> },
  // 애드온
  palette: { label: "팔레트 추출", needsSelection: true, icon: () => <PaletteIcon /> },
  split: { label: "스플릿 비교", needsSelection: true, icon: () => <SplitIcon /> },
  clip: { label: "하이라이트 클립", needsSelection: true, icon: () => <ScissorsIcon /> },
  thumbnail: { label: "폴더 썸네일", needsSelection: true, icon: () => <PersonIcon /> },
};

export function toolLabel(id, ctx) {
  const meta = TOOL_META[id];
  if (!meta) return id;
  return typeof meta.label === "function" ? meta.label(ctx) : meta.label;
}
