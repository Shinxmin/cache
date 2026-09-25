import { useCallback, useRef } from "react";

// 머티리얼 디자인 chevron_left / chevron_right.
function ChevronLeftIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

function ChevronRightIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

// 스튜디오 하이라이트 섹션의 구간 슬라이더. 연한 회색 알약 트랙 위에 선택된
// 구간(약간 진한 회색)이 있고, 그 구간 안쪽 왼쪽 끝의 < 와 오른쪽 끝의 >
// 가 각각 시작·끝 손잡이다 — 드래그하면 그 시간이 옮겨지고, 트랙의 빈
// 자리를 누르면 더 가까운 쪽 손잡이가 그 위치로 옮겨간다. 최소 간격·길이
// 클램프는 App.jsx의 changeStudioHighlightStart/End가 맡는다.
export default function HighlightRangeSlider({ duration, start, end, onChangeStart, onChangeEnd, disabled }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null); // "start" | "end" | null

  const secAt = useCallback(
    (clientX) => {
      const el = trackRef.current;
      if (!el || !duration) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  const moveHandle = (which, sec) => {
    if (which === "start") onChangeStart?.(sec);
    else onChangeEnd?.(sec);
  };

  const onPointerDownHandle = (which) => (e) => {
    if (disabled) return;
    e.stopPropagation();
    draggingRef.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownTrack = (e) => {
    if (disabled || !duration) return;
    const sec = secAt(e.clientX);
    const which = Math.abs(sec - start) <= Math.abs(sec - end) ? "start" : "end";
    draggingRef.current = which;
    moveHandle(which, sec);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    const which = draggingRef.current;
    if (!which || disabled) return;
    moveHandle(which, secAt(e.clientX));
  };

  const finish = () => {
    draggingRef.current = null;
  };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;

  const handleProps = (which) => ({
    type: "button",
    onPointerDown: onPointerDownHandle(which),
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    disabled,
  });

  return (
    <div
      className={`search-bar-highlight-slider${disabled ? " is-disabled" : ""}`}
      ref={trackRef}
      onPointerDown={onPointerDownTrack}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div
        className="search-bar-highlight-slider-range"
        style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
      />
      <button
        {...handleProps("start")}
        className="search-bar-highlight-slider-handle"
        aria-label="시작 지점"
        style={{ left: `${startPct}%` }}
      >
        <ChevronLeftIcon />
      </button>
      <button
        {...handleProps("end")}
        className="search-bar-highlight-slider-handle search-bar-highlight-slider-handle--end"
        aria-label="끝 지점"
        style={{ left: `${endPct}%` }}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
