// 파일·폴더 이름 정렬: 폴더를 먼저 보여주고, 이름은 문자열 그대로가 아니라
// 숫자를 자연수로 비교한다(1,2,3…9,10,11 — 1,100,2,200,3,300 처럼 되지 않게).
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function sortFileList(items) {
  return [...items].sort((a, b) => {
    if (a.is_folder !== b.is_folder) return a.is_folder ? -1 : 1;
    return collator.compare(a.name, b.name);
  });
}
