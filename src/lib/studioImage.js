// 스튜디오 이미지 편집 엔진(캔버스). 편집 내용은 ops 객체 하나로 표현하고, 렌더 순서는 항상
//   원본 → 회전·반전(geom 순서대로) → 밝기·대비 → 필터 → 모자이크 → 자르기 → 크기
// 이다. 자르기·모자이크 영역은 "회전·반전이 끝난 전체 이미지" 기준 비율(0~1)로 저장하고,
// 회전·반전을 새로 적용하면 이미 있는 영역도 같이 변환해 항상 화면에 보이는 위치와 맞춘다.
// 되돌리기·다시 하기는 ops 스냅샷 목록으로 처리한다(ops는 불변 객체로만 다룬다).

export const FILTERS = [
  { id: "none", label: "원본" },
  { id: "gray", label: "흑백" },
  { id: "sepia", label: "세피아" },
  { id: "warm", label: "따뜻하게" },
  { id: "cool", label: "차갑게" },
  { id: "fade", label: "페이드" },
  { id: "invert", label: "반전" },
];

export const MOSAIC_LEVELS = [
  { id: 1, label: "작게", f: 0.015 },
  { id: 2, label: "보통", f: 0.03 },
  { id: 3, label: "크게", f: 0.06 },
];

export const CROP_RATIOS = [
  { id: "free", label: "자유", r: null },
  { id: "1:1", label: "1:1", r: 1 },
  { id: "4:3", label: "4:3", r: 4 / 3 },
  { id: "3:4", label: "3:4", r: 3 / 4 },
  { id: "16:9", label: "16:9", r: 16 / 9 },
  { id: "9:16", label: "9:16", r: 9 / 16 },
];

export const makeOps = () => ({
  geom: [], // "rotL" | "rotR" | "flipH" | "flipV"
  crop: null, // { x, y, w, h }
  brightness: 0, // -100 ~ 100
  contrast: 0, // -100 ~ 100
  filter: "none",
  mosaics: [], // { x, y, w, h, level }
  scale: 1, // 출력 크기 배율
});

export const isEdited = (o) =>
  Boolean(o.geom.length || o.crop || o.brightness || o.contrast || o.filter !== "none" || o.mosaics.length || o.scale !== 1);

// 비율 사각형을 회전·반전에 맞춰 변환한다.
export function transformRect(r, g) {
  if (!r) return r;
  const { x, y, w, h } = r;
  if (g === "rotR") return { ...r, x: 1 - y - h, y: x, w: h, h: w };
  if (g === "rotL") return { ...r, x: y, y: 1 - x - w, w: h, h: w };
  if (g === "flipH") return { ...r, x: 1 - x - w };
  if (g === "flipV") return { ...r, y: 1 - y - h };
  return r;
}

export function withGeom(ops, g) {
  return {
    ...ops,
    geom: [...ops.geom, g],
    crop: transformRect(ops.crop, g),
    mosaics: ops.mosaics.map((m) => transformRect(m, g)),
  };
}

const newCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};

function applyGeom(src, g) {
  const w = src.width;
  const h = src.height;
  if (g === "rotR" || g === "rotL") {
    const out = newCanvas(h, w);
    const ctx = out.getContext("2d");
    if (g === "rotR") {
      ctx.translate(h, 0);
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.translate(0, w);
      ctx.rotate(-Math.PI / 2);
    }
    ctx.drawImage(src, 0, 0);
    return out;
  }
  const out = newCanvas(w, h);
  const ctx = out.getContext("2d");
  if (g === "flipH") {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, h);
    ctx.scale(1, -1);
  }
  ctx.drawImage(src, 0, 0);
  return out;
}

function adjustPixels(c, ops) {
  const { brightness, contrast, filter } = ops;
  if (!brightness && !contrast && filter === "none") return;
  const ctx = c.getContext("2d");
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const add = brightness * 2.55;
  const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const doBC = Boolean(brightness || contrast);
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    if (doBC) {
      r = f * (r + add - 128) + 128;
      g = f * (g + add - 128) + 128;
      b = f * (b + add - 128) + 128;
    }
    if (filter === "gray") {
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = v;
    } else if (filter === "sepia") {
      const nr = 0.393 * r + 0.769 * g + 0.189 * b;
      const ng = 0.349 * r + 0.686 * g + 0.168 * b;
      const nb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = nr;
      g = ng;
      b = nb;
    } else if (filter === "warm") {
      r += 18;
      b -= 18;
    } else if (filter === "cool") {
      r -= 18;
      b += 18;
    } else if (filter === "fade") {
      r = r * 0.85 + 34;
      g = g * 0.85 + 34;
      b = b * 0.85 + 34;
    } else if (filter === "invert") {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

function pixelate(c, m) {
  const level = MOSAIC_LEVELS.find((l) => l.id === m.level) ?? MOSAIC_LEVELS[1];
  const rx = Math.max(0, Math.round(m.x * c.width));
  const ry = Math.max(0, Math.round(m.y * c.height));
  const rw = Math.min(c.width - rx, Math.round(m.w * c.width));
  const rh = Math.min(c.height - ry, Math.round(m.h * c.height));
  if (rw < 1 || rh < 1) return;
  const block = Math.max(3, Math.round(Math.min(c.width, c.height) * level.f));
  const small = newCanvas(Math.ceil(rw / block), Math.ceil(rh / block));
  const sctx = small.getContext("2d");
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(c, rx, ry, rw, rh, 0, 0, small.width, small.height);
  const ctx = c.getContext("2d");
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, small.width, small.height, rx, ry, rw, rh);
  ctx.restore();
}

// 편집 결과 캔버스. full=true면 원본 해상도(저장용), 아니면 미리보기 크기로 줄여서 그린다.
// original=true면 편집을 모두 무시한 원본, cropActive=true면 자르기 도구를 쓰는 중이라 자르기를 적용하지 않는다.
export function renderOps(img, ops, { full = false, original = false, cropActive = false, maxSide = 1600 } = {}) {
  const o = original ? makeOps() : ops;
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  const k = full ? 1 : Math.min(1, maxSide / Math.max(sw, sh));
  let c = newCanvas(sw * k, sh * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  for (const g of o.geom) c = applyGeom(c, g);
  adjustPixels(c, o);
  for (const m of o.mosaics) pixelate(c, m);
  if (o.crop && !cropActive) {
    const rx = Math.round(o.crop.x * c.width);
    const ry = Math.round(o.crop.y * c.height);
    const rw = Math.max(1, Math.round(o.crop.w * c.width));
    const rh = Math.max(1, Math.round(o.crop.h * c.height));
    const out = newCanvas(rw, rh);
    out.getContext("2d").drawImage(c, rx, ry, rw, rh, 0, 0, rw, rh);
    c = out;
  }
  if (full && o.scale !== 1) {
    const out = newCanvas(c.width * o.scale, c.height * o.scale);
    const ctx = out.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(c, 0, 0, out.width, out.height);
    c = out;
  }
  return c;
}

// 저장 결과의 원본 해상도 크기(자르기·크기 반영) — 크기 도구에 보여 줄 값.
export function outputSize(img, ops) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  for (const g of ops.geom) if (g === "rotL" || g === "rotR") [w, h] = [h, w];
  if (ops.crop) {
    w *= ops.crop.w;
    h *= ops.crop.h;
  }
  return { w: Math.max(1, Math.round(w * ops.scale)), h: Math.max(1, Math.round(h * ops.scale)) };
}

export function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 열지 못했습니다"));
    };
    img.src = url;
  });
}

// 저장 형식: png·jpg·webp는 그대로, 나머지(움짤 제외 이미지)는 png.
export function saveFormat(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || "");
  const ext = (m?.[1] || "").toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return { ext: "jpg", mime: "image/jpeg" };
  if (ext === "webp") return { ext: "webp", mime: "image/webp" };
  return { ext: "png", mime: "image/png" };
}

export const canvasToBlob = (canvas, mime) =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("저장 이미지를 만들지 못했습니다"))), mime, 0.92));

// 정지 이미지만 편집한다(움짤·영상은 이후 영상/움짤 섹션에서).
export const isStillImage = (it) =>
  !it.is_folder && typeof it.mime === "string" && it.mime.startsWith("image/") && !/\.(gif|apng)$/i.test(it.name || "") && it.mime !== "image/gif";
