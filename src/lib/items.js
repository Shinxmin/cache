// 폴더/파일 메타데이터(Supabase items 테이블) + R2 객체를 함께 다루는 데이터 계층.
import { supabase } from "../supabaseClient";
import { r2, putWithProgress } from "./r2";

const ITEM_COLUMNS = "id, parent_id, kind, name, size, mime, r2_key, created_at, updated_at";

function throwIf(error) {
  if (error) throw new Error(error.message || "요청에 실패했습니다");
}

export async function listChildren(parentId) {
  let q = supabase.from("items").select(ITEM_COLUMNS);
  q = parentId ? q.eq("parent_id", parentId) : q.is("parent_id", null);
  const { data, error } = await q.order("kind", { ascending: false }).order("name", { ascending: true });
  throwIf(error);
  return sortItems(data ?? []);
}

export async function getItem(id) {
  const { data, error } = await supabase.from("items").select(ITEM_COLUMNS).eq("id", id).maybeSingle();
  throwIf(error);
  return data;
}

// 루트까지의 경로(브레드크럼)를 만든다.
export async function pathTo(id) {
  const path = [];
  let cur = id;
  for (let i = 0; cur && i < 64; i++) {
    const item = await getItem(cur);
    if (!item) break;
    path.unshift({ id: item.id, name: item.name });
    cur = item.parent_id;
  }
  return path;
}

export async function recentFiles(limit = 8) {
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .eq("kind", "file")
    .order("updated_at", { ascending: false })
    .limit(limit);
  throwIf(error);
  return data ?? [];
}

export async function searchItems(query, limit = 50) {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .ilike("name", `%${q.replace(/[%_]/g, "\\$&")}%`)
    .order("kind", { ascending: false })
    .order("name")
    .limit(limit);
  throwIf(error);
  return data ?? [];
}

export async function usage() {
  const { data, error } = await supabase.rpc("storage_usage");
  throwIf(error);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    usedBytes: Number(row?.used_bytes ?? 0),
    fileCount: Number(row?.file_count ?? 0),
    folderCount: Number(row?.folder_count ?? 0),
  };
}

export const DEFAULT_LIMIT_BYTES = 10 * 1024 ** 3;

export async function getProfile() {
  const { data, error } = await supabase.from("profiles").select("storage_limit_bytes").maybeSingle();
  throwIf(error);
  return { storageLimitBytes: Number(data?.storage_limit_bytes ?? DEFAULT_LIMIT_BYTES) };
}

export async function setStorageLimit(bytes) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: auth.user.id, storage_limit_bytes: Math.max(0, Math.round(bytes)) }, { onConflict: "user_id" });
  throwIf(error);
}

export async function createFolder(parentId, name) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("items")
    .insert({ user_id: auth.user.id, parent_id: parentId ?? null, kind: "folder", name: cleanName(name) })
    .select(ITEM_COLUMNS)
    .single();
  if (error?.code === "23505") throw new Error("같은 이름의 항목이 이미 있습니다");
  throwIf(error);
  return data;
}

export async function renameItem(id, name) {
  const { error } = await supabase.from("items").update({ name: cleanName(name) }).eq("id", id);
  if (error?.code === "23505") throw new Error("같은 이름의 항목이 이미 있습니다");
  throwIf(error);
}

export async function moveItem(id, newParentId) {
  const { error } = await supabase.from("items").update({ parent_id: newParentId ?? null }).eq("id", id);
  if (error?.code === "23505") throw new Error("이동할 위치에 같은 이름의 항목이 있습니다");
  throwIf(error);
}

// 파일이면 R2 객체를, 폴더면 하위 전체 파일의 R2 객체를 지운 뒤 행을 삭제한다(하위 행은 cascade).
export async function deleteItem(item) {
  if (item.kind === "file") {
    if (item.r2_key) await r2.remove(item.r2_key);
  } else {
    const { data, error } = await supabase.rpc("subtree_r2_keys", { root_id: item.id });
    throwIf(error);
    const keys = (data ?? []).map((row) => (typeof row === "string" ? row : row.key)).filter(Boolean);
    for (let i = 0; i < keys.length; i += 200) await r2.removeBatch(keys.slice(i, i + 200));
  }
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  throwIf(error);
}

export async function downloadUrl(item) {
  return r2.presignGet(item.r2_key, { download: true, filename: item.name });
}

export async function viewUrl(item) {
  return r2.presignGet(item.r2_key);
}

export async function thumbnailUrls(items) {
  const keys = items.filter((i) => i.kind === "file" && isImage(i) && i.r2_key).map((i) => i.r2_key);
  if (!keys.length) return {};
  const out = {};
  for (let i = 0; i < keys.length; i += 100) Object.assign(out, await r2.presignGetBatch(keys.slice(i, i + 100)));
  return out;
}

// ── 업로드 ──────────────────────────────────────────────────────────────
// 여러 파일을 동시에 최대 concurrency개씩 R2에 올리고, 성공한 것만 items에 기록한다.
// onProgress({ loaded, total, done, count }) 로 전체 진행률을 알려 준다.
export async function uploadFiles(files, parentId, { onProgress, concurrency = 3, signal } = {}) {
  const list = Array.from(files).filter((f) => f && f.size >= 0);
  if (!list.length) return { uploaded: [], failed: [] };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user.id;

  // 같은 폴더 안 이름 충돌은 " (2)" 식으로 피한다.
  const existing = new Set((await listChildren(parentId)).map((i) => i.name));
  const takenNames = new Set(existing);

  const total = list.reduce((s, f) => s + f.size, 0);
  const loadedBy = new Map();
  let done = 0;
  const report = () => {
    let loaded = 0;
    loadedBy.forEach((v) => (loaded += v));
    onProgress?.({ loaded, total, done, count: list.length });
  };
  report();

  const uploaded = [];
  const failed = [];

  const uploadOne = async (file, idx) => {
    const name = uniqueName(cleanName(file.name || `file-${idx + 1}`), takenNames);
    takenNames.add(name);
    const key = `${userId}/${crypto.randomUUID()}/${name}`;
    try {
      const url = await r2.presignPut(key, file.type || "application/octet-stream");
      await putWithProgress(url, file, { signal, onProgress: (l) => (loadedBy.set(idx, l), report()) });
      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          parent_id: parentId ?? null,
          kind: "file",
          name,
          size: file.size,
          mime: file.type || null,
          r2_key: key,
        })
        .select(ITEM_COLUMNS)
        .single();
      if (error) {
        await r2.remove(key).catch(() => {});
        throw new Error(error.message);
      }
      uploaded.push(data);
    } catch (e) {
      failed.push({ name, error: e });
    } finally {
      loadedBy.set(idx, file.size);
      done += 1;
      report();
    }
  };

  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (next < list.length && !signal?.aborted) {
      const i = next++;
      await uploadOne(list[i], i);
    }
  });
  await Promise.all(workers);
  return { uploaded, failed };
}

// ── 유틸 ─────────────────────────────────────────────────────────────────
export function cleanName(name) {
  const n = String(name ?? "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
  return n || "이름 없음";
}

export function uniqueName(name, taken) {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let n = 2; n < 10000; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
}

export function isImage(item) {
  return /^image\//.test(item?.mime ?? "") || /\.(png|jpe?g|gif|webp|avif|heic|heif|bmp|svg)$/i.test(item?.name ?? "");
}

export function sortItems(items) {
  const collator = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
  return [...items].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return collator.compare(a.name, b.name);
  });
}
