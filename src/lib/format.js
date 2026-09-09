export function formatBytes(bytes, digits) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const d = digits ?? (v >= 100 ? 0 : v >= 10 ? 1 : 2);
  return `${v.toFixed(d)} ${units[i]}`;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("ko-KR", sameYear ? { month: "long", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}

export function fileExt(name) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name ?? "");
  return m ? m[1].toUpperCase() : "FILE";
}
