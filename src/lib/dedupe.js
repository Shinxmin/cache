// 문자열 목록에서 서로 겹치는 값에만 뒤에 "(1)","(2)"…를 붙여 구분한다.
// 겹치지 않는 값은 그대로 둔다. 빈 문자열("" — 이름 바꾸기에선 나올 일이
// 없고, 태그에선 "태그 없음"을 뜻한다)은 여러 개 겹쳐도 중복으로 치지 않는다.
export function dedupeStrings(list) {
  const counts = new Map();
  for (const s of list) {
    if (!s) continue;
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  const seen = new Map();
  return list.map((s) => {
    if (!s || counts.get(s) <= 1) return s;
    const idx = (seen.get(s) || 0) + 1;
    seen.set(s, idx);
    return `${s}(${idx})`;
  });
}
