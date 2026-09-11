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

export function FolderIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

export function FileIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
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
