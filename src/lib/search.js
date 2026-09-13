// 검색바에 입력한 문자열을 이름 검색어와 태그 검색어로 나눈다. "#"으로
// 시작하는 조각은 태그 검색어(# 뗀 나머지를 이어 붙인다)로, 그 외는 이름
// 검색어로 이어 붙인다. 예: "승비 #태그1" → { name: "승비", tag: "태그1" }.
// 이름·태그 둘 다 있으면 서버(search_files RPC)가 AND로 좁힌다.
export function parseSearchQuery(raw) {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const nameTokens = [];
  const tagTokens = [];
  for (const token of tokens) {
    if (token.startsWith("#") && token.length > 1) tagTokens.push(token.slice(1));
    else nameTokens.push(token);
  }
  return { name: nameTokens.join(" "), tag: tagTokens.join(" ") };
}

export function isSearchActive(raw) {
  return raw.trim().length > 0;
}
