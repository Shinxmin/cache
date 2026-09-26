import { useCallback, useLayoutEffect, useRef, useState } from "react";

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

// 트랙 양 끝에 남기는 여백(px) — 진한 회색 구간(과 그 안의 < > 손잡이)이
// 트랙 좌우 끝에 닿지 않고 이만큼 안쪽에서 시작·끝나도록 한다.
const TRACK_INSET_PX = 6;
// < > 손잡이(각 20px 너비)가 서로 겹치지 않으려면 두 위치가 최소 이만큼(px)
// 떨어져 있어야 한다.
const MIN_HANDLE_GAP_PX = 40;
// 트랙 폭을 실측하기 전(첫 렌더) 쓰는 기본값 — 검색바의
// .search-bar-highlight-col CSS width(176px)와 맞춘 값이다.
const DEFAULT_TRACK_WIDTH_PX = 176;

// 스튜디오 하이라이트 섹션의 구간 슬라이더. 연한 회색 알약 트랙 위에 선택된
// 구간(약간 진한 회색)이 있고, 그 구간 안쪽 왼쪽 끝의 < 와 오른쪽 끝의 >
// 가 각각 시작·끝 손잡이다 — 드래그하면 그 시간이 옮겨지고, 트랙의 빈
// 자리를 누르면 더 가까운 쪽 손잡이가 그 위치로 옮겨간다. 최소 간격·길이
// 클램프는 App.jsx의 changeStudioHighlightStart/End가 맡는다.
export default function HighlightRangeSlider({ duration, start, end, onChangeStart, onChangeEnd, disabled }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(null); // "start" | "end" | null
  const [trackWidth, setTrackWidth] = useState(DEFAULT_TRACK_WIDTH_PX);

  // 레이아웃이 잡힌 뒤(페인트 전) 트랙의 실제 렌더링 폭을 한 번 측정해 둔다
  // — 이 값으로 최소 간격(px)을 시간·퍼센트로 정확히 환산한다.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (el) setTrackWidth(el.getBoundingClientRect().width);
  }, []);

  const usableWidth = Math.max(0, trackWidth - TRACK_INSET_PX * 2);
  const minGapSec = usableWidth > 0 && duration ? (MIN_HANDLE_GAP_PX / usableWidth) * duration : 0;

  const secAt = useCallback(
    (clientX) => {
      const el = trackRef.current;
      if (!el || !duration || usableWidth <= 0) return 0;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left - TRACK_INSET_PX) / usableWidth));
      return ratio * duration;
    },
    [duration, usableWidth]
  );

  // <, > 손잡이(각 20px 너비)가 서로 겹치지 않도록, 두 손잡이 위치 사이의
  // 실제 화면 간격이 항상 40px 이상이 되게 하는 최소 시간 간격만큼 클램프한다.
  const moveHandle = (which, sec) => {
    if (which === "start") onChangeStart?.(Math.max(0, Math.min(sec, end - minGapSec)));
    else onChangeEnd?.(Math.min(duration || sec, Math.max(sec, start + minGapSec)));
  };

  // 0~100% 위치를, 트랙 좌우로 TRACK_INSET_PX만큼 여백을 둔 안쪽 구간
  // [TRACK_INSET_PX, 100% - TRACK_INSET_PX]에 매핑하는 CSS 길이.
  const insetLeft = (pct) => `calc(${TRACK_INSET_PX}px + (100% - ${TRACK_INSET_PX * 2}px) * ${pct / 100})`;
  const insetWidth = (deltaPct) => `calc((100% - ${TRACK_INSET_PX * 2}px) * ${deltaPct / 100})`;

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
  const rawEndPct = duration ? (end / duration) * 100 : 100;
  // 아직 사용자가 건드리지 않은 기본값(예: 0:00~0:10)이 긴 영상에서는
  // 실제 시간상 간격은 있어도 화면 픽셀 간격이 최소치보다 좁을 수 있다 —
  // 이때도 두 손잡이가 겹쳐 보이지 않도록, 실제 end 값은 바꾸지 않은 채
  // 보여주기용 끝 위치만 최소 간격만큼 밀어서 그린다.
  const minGapPct = duration ? (minGapSec / duration) * 100 : 0;
  const endPct = Math.max(rawEndPct, Math.min(100, startPct + minGapPct));

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
        style={{ left: insetLeft(startPct), width: insetWidth(Math.max(0, endPct - startPct)) }}
      />
      <button
        {...handleProps("start")}
        className="search-bar-highlight-slider-handle"
        aria-label="시작 지점"
        style={{ left: insetLeft(startPct) }}
      >
        <ChevronLeftIcon />
      </button>
      <button
        {...handleProps("end")}
        className="search-bar-highlight-slider-handle search-bar-highlight-slider-handle--end"
        aria-label="끝 지점"
        style={{ left: insetLeft(endPct) }}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
