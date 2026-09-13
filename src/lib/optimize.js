// 용량 압축이 실제로 가능한 확장자 목록. 브라우저의 <canvas>가 디코딩할 수
// 있는 정지 래스터 이미지 포맷만 해당한다 — 동영상·PDF·문서류·SVG(벡터)·
// TIFF 등은 캔버스가 아예 못 읽어서 압축이 안 된다. HEIC/HEIF는 사파리·iOS
// 에서만 열리지만, 그 환경에서는 실제로 되므로 목록엔 포함해 둔다(다른
// 환경에서 열리지 않는 경우는 drive.js의 optimizeFiles가 그 파일만 조용히
// 건너뛴다).
const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "jfif", "png", "webp", "bmp", "gif", "avif", "heic", "heif", "ico"]);

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

export function isOptimizableFile(name) {
  return SUPPORTED_EXTENSIONS.has(extensionOf(name));
}
