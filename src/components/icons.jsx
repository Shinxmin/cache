// 여러 곳에서 함께 쓰는 아이콘. 하단바·삼점바 아이콘과 같은 방식(24 viewBox,
// currentColor 단일 fill 패스)으로 그려 테마와 상태 색을 그대로 물려받는다.

// 업로드는 위 화살표, 다운로드는 아래 화살표 — 대(臺)나 밑줄 없이 화살표만 있다.
export function UploadIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 3 19.5 11h-4.9v10H9.4V11H4.5z" />
    </svg>
  );
}

export function DownloadIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 21 4.5 13h4.9V3h5.2v10h4.9z" />
    </svg>
  );
}

// 이동 — 업로드/다운로드 화살표와 같은 모양을 오른쪽으로 돌린 것.
export function ArrowRightIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M21 12 13 4.5v4.9H3v5.2h10v4.9z" />
    </svg>
  );
}

// 태그 — 해시(#) 기호.
export function HashIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="8" y="3" width="2" height="18" />
      <rect x="14" y="3" width="2" height="18" />
      <rect x="3" y="8" width="18" height="2" />
      <rect x="3" y="14" width="18" height="2" />
    </svg>
  );
}

export function FolderIcon({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

export function FileIcon({ size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
    </svg>
  );
}

export function GalleryIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z" />
    </svg>
  );
}

export function ListIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M3 4.5h4v4H3zm6 0h12v4H9zM3 10h4v4H3zm6 0h12v4H9zM3 15.5h4v4H3zm6 0h12v4H9z" />
    </svg>
  );
}

export function BackIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M15.2 3.6 6.8 12l8.4 8.4 2.1-2.1L11 12l6.3-6.3z" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 10.59 6.7 5.29 5.29 6.7 10.59 12l-5.3 5.3 1.41 1.41L12 13.41l5.29 5.3 1.41-1.41L13.41 12l5.3-5.29-1.41-1.42L12 10.59z" />
    </svg>
  );
}

// 정보 — 동그라미 안에 "i". 스튜디오 툴킷에서 파일·폴더 용량 표시를 토글한다.
export function InfoIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2zm0-8h-2V7h2z" />
    </svg>
  );
}

export function TrashIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M7 21c-1.1 0-2-.9-2-2V7H4V5h5V4h6v1h5v2h-1v12c0 1.1-.9 2-2 2H7zM9 9v10h2V9H9zm4 0v10h2V9h-2z" />
    </svg>
  );
}

// "복원" — 시계 반대방향 화살표가 있는 되돌리기 아이콘.
export function RestoreIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8.8 3.6 17.2 12l-8.4 8.4-2.1-2.1L13 12 6.7 5.7z" />
    </svg>
  );
}

// 선택된 항목 배지에 쓰는 체크마크. 체크박스(Checkbox.jsx)와 같은 획 스타일이다.
export function CheckIcon({ size = 13 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}
