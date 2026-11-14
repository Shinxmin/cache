// 업로드·다운로드 기록. 이 기기(브라우저)에 저장되고 새로고침해도 남는다. 성공·실패 모두 남기며 최신순이다.
// 항목: { id, kind: "up" | "down", name, ok, at }
const KEY = "cache_transfer_history";
const MAX = 500;

export function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* 저장 공간 부족 등: 기록만 못 남긴다 */
  }
}

export function addHistory({ kind, name, ok }) {
  const list = loadHistory();
  list.unshift({ id: crypto.randomUUID(), kind, name: name || "(이름 없음)", ok: Boolean(ok), at: Date.now() });
  save(list);
}

export function removeHistory(ids) {
  const drop = new Set(ids);
  save(loadHistory().filter((h) => !drop.has(h.id)));
}

export function clearHistory() {
  save([]);
}
