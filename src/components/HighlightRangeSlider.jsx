import { useCallback, useRef } from "react";

// 스튜디오 하이라이트 섹션의 구간 슬라이더. 시작·끝 두 손잡이를 각각
// 드래그하거나, 트랙의 빈 자리를 누르면 더 가까운 쪽 손잡이가 그 위치로
// 옮겨간다. 손잡이는 원형이 아니라 막대(세로로 긴 사각형) 모양이다. 실제
// 0.5초 최소 간격 제한이나 duration 경계 클램프는 App.jsx의
// changeStudioHighlightStart/End가 맡는다 — 여기서는 누른 지점의 초(sec)값만
// 계산해 그대로 올려보낸다.
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

  const onPointerDownThumb = (which) => (e) => {
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

  return (
    <div
      className={`search-bar-highlight-slider${disabled ? " is-disabled" : ""}`}
      ref={trackRef}
      onPointerDown={onPointerDownTrack}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div className="search-bar-highlight-slider-track" />
      <div
        className="search-bar-highlight-slider-range"
        style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
      />
      <button
        type="button"
        className="search-bar-highlight-slider-thumb"
        aria-label="시작 지점"
        style={{ left: `${startPct}%` }}
        onPointerDown={onPointerDownThumb("start")}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        disabled={disabled}
      />
      <button
        type="button"
        className="search-bar-highlight-slider-thumb"
        aria-label="끝 지점"
        style={{ left: `${endPct}%` }}
        onPointerDown={onPointerDownThumb("end")}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        disabled={disabled}
      />
    </div>
  );
}
