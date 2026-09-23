// 용량 압축이 실제로 가능한 확장자 목록. 브라우저의 <canvas>가 디코딩할 수
// 있는 정지 래스터 이미지 포맷만 해당한다 — 동영상·PDF·문서류·SVG(벡터)·
// TIFF 등은 캔버스가 아예 못 읽어서 압축이 안 된다. HEIC/HEIF는 사파리·iOS
// 에서만 열리지만, 그 환경에서는 실제로 되므로 목록엔 포함해 둔다(다른
// 환경에서 열리지 않는 경우는 drive.js의 optimizeFiles가 그 파일만 조용히
// 건너뛴다). webp·gif는 애니메이션이면 캔버스에 첫 프레임만 남아 움직임이
// 깨지므로 비지원으로 분류한다.
const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "jfif", "png", "bmp", "avif", "heic", "heif", "ico"]);

function extensionOf(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

export function isOptimizableFile(name) {
  return SUPPORTED_EXTENSIONS.has(extensionOf(name));
}

// 최적화 패널의 압축 비율 3단계(25/50/75%). App.jsx(확인 시 실제 비율로
// 변환)와 BottomSearchBar.jsx(세그먼트 렌더링) 둘 다 같은 값을 써야 해서
// 여기 하나로 둔다.
export const OPTIMIZE_LEVELS = [25, 50, 75];

// 위 배열과 같은 순서의 화면 표시용 라벨(퍼센트 대신 체감 강도로 보여준다).
export const OPTIMIZE_LEVEL_LABELS = ["낮음", "중간", "높음"];
