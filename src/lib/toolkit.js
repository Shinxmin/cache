import { isAddonId } from "./addons";

// 스튜디오 툴킷의 기본 도구 id와 기본 순서. 즐겨찾기(favorite)는 용량
// 압축(optimize)과 태그(tag) 사이에 온다. 실제로 그려지는 순서는 사용자가
// 설정에서 바꾼 레이아웃(app_users.toolkit_layout)을 따르고, 여기 배열은
// 저장된 레이아웃이 없거나 새 기본 도구가 추가됐을 때의 기준이다.
export const BASE_TOOL_IDS = ["info", "trash", "download", "move", "view", "blur", "optimize", "favorite", "tag", "rename"];

// 저장된 레이아웃을 신뢰할 수 있는 형태로 다듬는다: 모르는 id·중복은 버리고,
// 기본 도구 중 빠진 게 있으면(예전에 저장한 뒤 새 기본 도구가 생긴 경우)
// 기본 순서상의 자리를 참고해 뒤에 붙인다.
export function normalizeLayout(layout) {
  const seen = new Set();
  const out = [];
  for (const id of Array.isArray(layout) ? layout : []) {
    if (typeof id !== "string" || seen.has(id)) continue;
    if (!BASE_TOOL_IDS.includes(id) && !isAddonId(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of BASE_TOOL_IDS) {
    if (!seen.has(id)) {
      // 기본 순서에서 바로 앞에 오는 도구 뒤에 끼워 넣는다(없으면 맨 뒤).
      const prev = BASE_TOOL_IDS[BASE_TOOL_IDS.indexOf(id) - 1];
      const at = prev ? out.indexOf(prev) : -1;
      out.splice(at >= 0 ? at + 1 : out.length, 0, id);
      seen.add(id);
    }
  }
  return out;
}

export function installedAddonIds(layout) {
  return layout.filter(isAddonId);
}
