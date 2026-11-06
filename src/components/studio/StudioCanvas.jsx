import { useEffect, useLayoutEffect, useRef, useState } from "react";

const HANDLES = [
  ["nw", 0, 0],
  ["n", 0.5, 0],
  ["ne", 1, 0],
  ["e", 1, 0.5],
  ["se", 1, 1],
  ["s", 0.5, 1],
  ["sw", 0, 1],
  ["w", 0, 0.5],
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// 미리보기: 렌더된 캔버스를 컨테이너에 맞춰 그리고, 그 위에 자르기 사각형 / 모자이크 영역 드래그 오버레이를 얹는다.
// 사각형은 모두 표시 이미지 기준 비율(0~1)이라 화면 크기와 무관하다.
export default function StudioCanvas({ rendered, tool, crop, cropRatio, aspect, onCropChange, onCropCommit, onMosaicAdd }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [draft, setDraft] = useState(null); // 모자이크로 그리는 중인 사각형
  const drag = useRef(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !rendered) return;
    c.width = rendered.width;
    c.height = rendered.height;
    c.getContext("2d").drawImage(rendered, 0, 0);
  }, [rendered]);

  let dw = 0;
  let dh = 0;
  if (rendered && box.w && box.h) {
    const k = Math.min(box.w / rendered.width, box.h / rendered.height);
    dw = Math.floor(rendered.width * k);
    dh = Math.floor(rendered.height * k);
  }

  const pointFrac = (e, el) => {
    const r = el.getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
  };

  // ── 자르기: 모서리·변 핸들과 몸통 드래그 ──
  const startCrop = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const overlay = e.currentTarget.closest(".studio-overlay");
    drag.current = { kind: "crop", mode, start: pointFrac(e, overlay), rect: { ...crop }, overlay };
  };
  const moveCrop = (e) => {
    const d = drag.current;
    if (!d || d.kind !== "crop") return;
    const p = pointFrac(e, d.overlay);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    let { x, y, w, h } = d.rect;
    if (d.mode === "move") {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else {
      let x1 = x;
      let y1 = y;
      let x2 = x + w;
      let y2 = y + h;
      if (d.mode.includes("w")) x1 = clamp(x1 + dx, 0, x2 - 0.05);
      if (d.mode.includes("e")) x2 = clamp(x2 + dx, x1 + 0.05, 1);
      if (d.mode.includes("n")) y1 = clamp(y1 + dy, 0, y2 - 0.05);
      if (d.mode.includes("s")) y2 = clamp(y2 + dy, y1 + 0.05, 1);
      w = x2 - x1;
      h = y2 - y1;
      x = x1;
      y = y1;
      if (cropRatio && aspect) {
        // 비율 고정: 가로 기준으로 세로를 맞추고, 넘치면 가로를 줄인다. 위·왼쪽 모서리를 잡았으면 반대쪽을 고정점으로 둔다.
        const targetH = (w * aspect) / cropRatio;
        let nh = targetH;
        let nw = w;
        if (nh > 1) {
          nh = 1;
          nw = (nh * cropRatio) / aspect;
        }
        const anchorX = d.mode.includes("w") ? x + w : x;
        const anchorY = d.mode.includes("n") ? y + h : y;
        x = d.mode.includes("w") ? anchorX - nw : x;
        y = d.mode.includes("n") ? anchorY - nh : y;
        w = nw;
        h = nh;
        if (x < 0) {
          x = 0;
        }
        if (y < 0) {
          y = 0;
        }
        if (x + w > 1) w = 1 - x;
        if (y + h > 1) h = 1 - y;
      }
    }
    onCropChange({ x, y, w, h });
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind === "crop") onCropCommit();
  };

  // ── 모자이크: 이미지 위에서 드래그해 영역을 만든다 ──
  const startMosaic = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = pointFrac(e, e.currentTarget);
    drag.current = { kind: "mosaic", start: p, el: e.currentTarget };
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
  };
  const moveMosaic = (e) => {
    const d = drag.current;
    if (!d || d.kind !== "mosaic") return;
    const p = pointFrac(e, d.el);
    setDraft({ x: Math.min(d.start.x, p.x), y: Math.min(d.start.y, p.y), w: Math.abs(p.x - d.start.x), h: Math.abs(p.y - d.start.y) });
  };
  const endMosaic = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind !== "mosaic") return;
    setDraft((cur) => {
      if (cur && cur.w > 0.01 && cur.h > 0.01) onMosaicAdd(cur);
      return null;
    });
  };

  const pct = (v) => `${v * 100}%`;
  return (
    <div className="studio-stage" ref={boxRef}>
      {rendered && (
        <div className="studio-canvas-wrap" style={{ width: dw, height: dh }}>
          <canvas ref={canvasRef} className="studio-canvas" />
          {tool === "crop" && crop && (
            <div className="studio-overlay" onPointerMove={moveCrop} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <div className="studio-crop-shade" style={{ top: 0, left: 0, right: 0, height: pct(crop.y) }} />
              <div className="studio-crop-shade" style={{ top: pct(crop.y + crop.h), left: 0, right: 0, bottom: 0 }} />
              <div className="studio-crop-shade" style={{ top: pct(crop.y), left: 0, width: pct(crop.x), height: pct(crop.h) }} />
              <div className="studio-crop-shade" style={{ top: pct(crop.y), left: pct(crop.x + crop.w), right: 0, height: pct(crop.h) }} />
              <div
                className="studio-crop-rect"
                style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h) }}
                onPointerDown={startCrop("move")}
              >
                {HANDLES.filter(([m]) => !cropRatio || m.length === 2).map(([m, fx, fy]) => (
                  <span
                    key={m}
                    className={`studio-crop-handle studio-crop-handle--${m}`}
                    style={{ left: pct(fx), top: pct(fy) }}
                    onPointerDown={startCrop(m)}
                  />
                ))}
              </div>
            </div>
          )}
          {tool === "mosaic" && (
            <div className="studio-overlay studio-overlay--draw" onPointerDown={startMosaic} onPointerMove={moveMosaic} onPointerUp={endMosaic} onPointerCancel={endMosaic}>
              {draft && <div className="studio-mosaic-draft" style={{ left: pct(draft.x), top: pct(draft.y), width: pct(draft.w), height: pct(draft.h) }} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
