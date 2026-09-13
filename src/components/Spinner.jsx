// 데이터를 불러오는 동안 "불러오는 중…" 같은 텍스트 대신 쓰는 회전 스피너.
// currentColor를 그대로 물려받아 어디(밝은 배경·어두운 뷰어 배경)에 놓이든
// 부모가 지정한 색으로 보인다.
export default function Spinner({ size = 20, className }) {
  return (
    <svg
      className={`spinner${className ? ` ${className}` : ""}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="status"
      aria-label="불러오는 중"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
