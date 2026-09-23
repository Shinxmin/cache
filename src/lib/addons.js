// 애드온 스토어 카탈로그. 사용자가 "추가"하면 그 id가 스튜디오 툴킷
// 레이아웃(도구 id 배열)에 들어가고, 그게 곧 "설치됨"이다 — 설치 목록을
// 따로 두지 않는다. 추가·삭제·정렬은 전부 set_toolkit_layout RPC를 통해
// 서버(app_users.toolkit_layout + toolkit_events 로그)에 기록된다.
export const ADDONS = [
  {
    id: "palette",
    name: "팔레트 추출",
    version: "1.1.0",
    description: "이미지에서 지배적인 상위 5가지 주요 색상을 팔레트 자동 생성합니다",
  },
  {
    id: "split",
    name: "스플릿 비교",
    version: "1.0.0",
    description: "두 이미지를 나란히 두고 슬라이더로 드래그해 차이를 비교합니다",
  },
  {
    id: "clip",
    name: "하이라이트 클립",
    version: "1.0.0",
    description: "동영상에서 원하는 구간의 시작과 끝을 찍어 하이라이트 클립으로 모아 둡니다",
  },
  {
    id: "thumbnail",
    name: "폴더 썸네일",
    version: "1.0.0",
    description: "폴더 안 이미지·움짤·동영상 중 하나를 골라 그 폴더의 대표 얼굴로 지정합니다",
  },
];

export const ADDON_IDS = new Set(ADDONS.map((a) => a.id));

export function isAddonId(id) {
  return ADDON_IDS.has(id);
}

export function addonById(id) {
  return ADDONS.find((a) => a.id === id) ?? null;
}
