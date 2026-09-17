// 팔레트 추출 애드온: 이미지에서 지배적인 상위 색상을 뽑는다. 작은 캔버스
// (64×64)에 축소해 그린 뒤 각 채널을 16단계로 양자화한 버킷별로 픽셀을
// 세고, 많은 순서대로 고르되 이미 고른 색과 너무 비슷한 버킷(RGB 거리
// 40 미만)은 건너뛰어 눈에 띄게 다른 색이 나오게 한다. 결과는 "#RRGGBB".
const SAMPLE = 64;
const LEVELS = 16;
const MIN_DISTANCE = 40;

function loadImage(blob) {
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

const hex2 = (n) => n.toString(16).padStart(2, "0");

export async function extractPalette(blob, count = 5) {
  const { img, url } = await loadImage(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);

    const buckets = new Map(); // key -> { r, g, b, n }
    const step = 256 / LEVELS;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // 투명 픽셀은 제외
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = `${Math.floor(r / step)},${Math.floor(g / step)},${Math.floor(b / step)}`;
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
      buckets.set(key, bucket);
    }

    const ranked = [...buckets.values()]
      .sort((a, b) => b.n - a.n)
      .map((bk) => ({ r: Math.round(bk.r / bk.n), g: Math.round(bk.g / bk.n), b: Math.round(bk.b / bk.n) }));

    const picked = [];
    for (const c of ranked) {
      const tooClose = picked.some((p) => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) < MIN_DISTANCE);
      if (!tooClose) picked.push(c);
      if (picked.length >= count) break;
    }
    // 색이 너무 단조로워 5개를 못 채우면 비슷한 색이라도 채운다.
    for (const c of ranked) {
      if (picked.length >= count) break;
      if (!picked.includes(c)) picked.push(c);
    }

    return picked.map((c) => `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`.toUpperCase());
  } finally {
    URL.revokeObjectURL(url);
  }
}
