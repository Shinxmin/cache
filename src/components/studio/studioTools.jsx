// 스튜디오 메뉴바 구성. 가로로 스크롤되는 한 줄에 섹션(공통·이미지·…)이 이어지고, 섹션마다 제목과 도구 아이콘이
// 있다. 영상·움짤·내보내기 섹션은 나중에 STUDIO_SECTIONS 배열에 항목만 추가하면 같은 레이아웃으로 붙는다.
//   kind: "action"(누르면 바로 실행) · "toggle"(켜고 끔) · "panel"(아래 옵션 줄을 연다) · "text"(옵션 줄 + 검색바 입력)
const P = ({ d, size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const UndoIcon = () => <P d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />;
export const RedoIcon = () => <P d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />;
export const CompareIcon = () => <P d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5v2h2V1h-2v2zm0 15H5l5-6v6zm9-15h-5v2h5v13l-5-6v9h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />;
export const SaveIcon = () => <P d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />;
export const CropIcon = () => <P d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />;
export const RotateIcon = () => <P d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z" />;
export const ResizeIcon = () => <P d="M19 12h-2v3h-3v2h5v-5zM7 9h3V7H5v5h2V9zm14-6H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z" />;
export const AdjustIcon = () => <P d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />;
export const FilterIcon = () => <P d="M19.02 10v9H5V5h9V3H5.02c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-9h-2zM17 10l.94-2.06L20 7l-2.06-.94L17 4l-.94 2.06L14 7l2.06.94zm-3.75.75L12 8l-1.25 2.75L8 12l2.75 1.25L12 16l1.25-2.75L16 12z" />;
export const MosaicIcon = () => <P d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />;
export const RenameIcon = () => <P d="M18.41 5.8L17.2 4.59c-.78-.78-2.05-.78-2.83 0l-2.68 2.68L3 15.96V20h4.04l8.74-8.74 2.63-2.63c.79-.78.79-2.05 0-2.83zM6.21 18H5v-1.21l8.66-8.66 1.21 1.21L6.21 18zM11 20l4-4h6v4H11z" />;

export const STUDIO_SECTIONS = [
  {
    id: "common",
    label: "공통",
    tools: [
      { id: "undo", label: "되돌리기", Icon: UndoIcon, kind: "action" },
      { id: "redo", label: "다시 하기", Icon: RedoIcon, kind: "action" },
      { id: "original", label: "원본 보기", Icon: CompareIcon, kind: "toggle" },
      { id: "save", label: "저장", Icon: SaveIcon, kind: "action" },
    ],
  },
  {
    id: "image",
    label: "이미지",
    tools: [
      { id: "crop", label: "자르기", Icon: CropIcon, kind: "panel" },
      { id: "rotate", label: "회전", Icon: RotateIcon, kind: "panel" },
      { id: "resize", label: "크기", Icon: ResizeIcon, kind: "panel" },
      { id: "adjust", label: "보정", Icon: AdjustIcon, kind: "panel" },
      { id: "filter", label: "필터", Icon: FilterIcon, kind: "panel" },
      { id: "mosaic", label: "가리기", Icon: MosaicIcon, kind: "panel" },
      { id: "rename", label: "이름 변경", Icon: RenameIcon, kind: "text" },
    ],
  },
  // 추후: { id: "video", label: "영상", ... }, { id: "gif", label: "움짤", ... }, { id: "export", label: "내보내기", ... }
];
