import { useEffect, useMemo, useRef, useState } from "react";
import BottomSearchBar from "../components/BottomSearchBar";
import PageHeader from "../components/PageHeader";
import { ImportIcon } from "../components/icons";
import StudioMenuBar from "../components/studio/StudioMenuBar";
import StudioOptions from "../components/studio/StudioOptions";
import StudioCanvas from "../components/studio/StudioCanvas";
import { copyFileTo, fetchFileBlob, renameFiles, thumbnailUrls } from "../lib/drive";
import {
  canvasToBlob,
  isEdited,
  isStillImage,
  loadImage,
  makeOps,
  outputSize,
  renderOps,
  saveFormat,
  withGeom,
} from "../lib/studioImage";

// 업로드할 수 있는 파일: 이미지·동영상·움짤만(폴더는 고를 수 없다).
export const STUDIO_ACCEPT =
  "image/*,video/*,.jpeg,.jpg,.png,.apng,.gif,.webp,.mp4,.avi,.mov,.m4v,.mkv,.webm";

const HIST_MAX = 100;
const fresh = () => ({ list: [makeOps()], idx: 0 });
const stemOf = (name) => name.replace(/\.[^.]+$/, "");
const extOf = (name) => (/\.([^.]+)$/.exec(name)?.[1] ?? "");

// 스튜디오 화면. 위에서부터: 불러온 파일 목록(탭 = 편집할 파일, 체크 = 일괄 작업 대상), 미리보기(+자르기·모자이크
// 오버레이), 하단바(검색바 → 가로 메뉴바 → 도구 옵션 줄 → < · + · 설정).
// 하단바의 연필 검색바는 숫자·이름 입력이 필요한 도구(크기 "가로 입력", 이름 변경)를 쓸 때만 켜지고, 그때만 확인 버튼이 보인다.
// 편집 기록(되돌리기)·선택은 store에 두어 스튜디오를 나갔다 와도(새로고침 전까지) 이어진다.
export default function StudioPage({ session, files, store, onUpload, onImport, onBack, onSaved, onRenamed, transfers, onAckTransfer }) {
  const [activeId, setActiveId] = useState(store.activeId);
  const [checked, setChecked] = useState(() => new Set(store.checked));
  const active = files.find((f) => f.id === activeId) ?? files[0] ?? null;
  const [thumbs, setThumbs] = useState({});
  const [src, setSrc] = useState(null); // { img, url }
  const [hist, setHist] = useState(fresh);
  const [live, setLive] = useState(null);
  const [tool, setTool] = useState(null);
  const [textMode, setTextMode] = useState(null); // null | "resize" | "rename"
  const [textValue, setTextValue] = useState("");
  const [ratio, setRatio] = useState("free");
  const [mosaicLevel, setMosaicLevel] = useState(2);
  const [showOriginal, setShowOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rendered, setRendered] = useState(null);

  const canEdit = Boolean(active) && isStillImage(active);
  const baseOps = hist.list[hist.idx];
  const ops = live ?? baseOps;

  // ── 선택·기록을 store에 보관 ──
  useEffect(() => {
    store.activeId = active?.id ?? null;
  }, [active?.id]);
  useEffect(() => {
    store.checked = checked;
  }, [checked]);
  useEffect(() => {
    if (active) store.edits.set(active.id, hist);
  }, [hist]);

  // ── 파일이 바뀌면 원본 이미지를 받아 열고, 그 파일의 편집 기록을 불러온다 ──
  useEffect(() => {
    setSrc(null);
    setLive(null);
    setShowOriginal(false);
    setTool(null);
    setTextMode(null);
    if (!active) return undefined;
    setHist(store.edits.get(active.id) ?? fresh());
    if (!isStillImage(active)) return undefined;
    let cancelled = false;
    let url = null;
    fetchFileBlob(session.token, active.r2_key)
      .then(loadImage)
      .then((r) => {
        url = r.url;
        if (cancelled) URL.revokeObjectURL(r.url);
        else setSrc(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [active?.id]);

  // 목록 썸네일
  useEffect(() => {
    const keys = files.map((f) => f.thumb_key).filter((k) => k && !thumbs[k]);
    if (!keys.length) return;
    thumbnailUrls(session.token, keys)
      .then((urls) => setThumbs((prev) => ({ ...prev, ...urls })))
      .catch(() => {});
  }, [files]);

  // ── 렌더(드래그 중에도 부드럽게 한 프레임에 한 번만) ──
  const cropping = tool === "crop" && !showOriginal;
  useEffect(() => {
    if (!src) {
      setRendered(null);
      return undefined;
    }
    const id = requestAnimationFrame(() => {
      setRendered(renderOps(src.img, ops, { original: showOriginal, cropActive: cropping }));
    });
    return () => cancelAnimationFrame(id);
  }, [src, ops, showOriginal, cropping]);

  // ── 편집 기록 ──
  const commit = (next) => {
    setHist((h) => {
      const list = h.list.slice(0, h.idx + 1).concat(next).slice(-HIST_MAX);
      return { list, idx: list.length - 1 };
    });
    setLive(null);
  };
  const canUndo = hist.idx > 0;
  const canRedo = hist.idx < hist.list.length - 1;
  const undo = () => canUndo && setHist((h) => ({ ...h, idx: h.idx - 1 }));
  const redo = () => canRedo && setHist((h) => ({ ...h, idx: h.idx + 1 }));
  const liveStart = () => setLive((cur) => cur ?? baseOps);
  const liveUpdate = (patch) => setLive((cur) => ({ ...(cur ?? baseOps), ...patch }));
  const liveEnd = () => {
    if (live) commit(live);
  };

  // ── 자르기 ──
  const cropRatio = CROP_R[ratio] ?? null;
  const aspect = rendered ? rendered.width / rendered.height : 1;
  const cropRect = ops.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const applyRatio = (r) => {
    setRatio(r.id);
    if (!r.r) return;
    const q = r.r / aspect;
    const w = q >= 1 ? 1 : q;
    const h = q >= 1 ? 1 / q : 1;
    commit({ ...baseOps, crop: { x: (1 - w) / 2, y: (1 - h) / 2, w, h } });
  };

  // ── 도구 선택 ──
  const pressedTools = showOriginal ? ["original"] : [];
  const isEnabled = (t) => {
    if (t.id === "undo") return canUndo;
    if (t.id === "redo") return canRedo;
    if (t.id === "original") return Boolean(src) && isEdited(baseOps);
    if (t.id === "save") return Boolean(src) && isEdited(baseOps) && !busy;
    if (t.id === "rename") return checked.size > 0;
    return Boolean(src) && canEdit;
  };
  const pick = (t) => {
    if (t.id === "undo") return undo();
    if (t.id === "redo") return redo();
    if (t.id === "original") return setShowOriginal((v) => !v);
    if (t.id === "save") return save();
    setShowOriginal(false);
    setTextValue("");
    if (t.kind === "text") {
      setTool(t.id);
      setTextMode(t.id);
      return undefined;
    }
    setTextMode(null);
    setTool((cur) => (cur === t.id ? null : t.id));
    return undefined;
  };

  // ── 크기: 칩 또는 검색바에 가로(px) 입력 ──
  const size = src ? outputSize(src.img, ops) : null;
  const setScale = (s) => {
    setTextMode(null);
    setTextValue("");
    commit({ ...baseOps, scale: s });
  };

  // ── 검색바 입력(크기 가로 입력 / 일괄 이름 변경) 확인 ──
  const submitText = async () => {
    const typed = textValue.trim();
    if (!typed) return;
    if (textMode === "resize") {
      const w = parseInt(typed, 10);
      if (!src || !w || w < 1) return;
      const baseW = outputSize(src.img, { ...baseOps, scale: 1 }).w;
      commit({ ...baseOps, scale: Math.min(8, Math.max(0.05, w / baseW)) });
      setTextMode(null);
      setTextValue("");
      return;
    }
    if (textMode === "rename") {
      const targets = files.filter((f) => checked.has(f.id));
      if (!targets.length) return;
      const renames = targets.map((f, i) => {
        const ext = extOf(f.name);
        const n = targets.length === 1 ? typed : `${typed}_${i + 1}`;
        return { id: f.id, name: ext ? `${n}.${ext}` : n };
      });
      try {
        await renameFiles(session.token, renames);
        onRenamed(Object.fromEntries(renames.map((r) => [r.id, r.name])));
        setTextMode(null);
        setTextValue("");
        setTool(null);
      } catch {
        window.alert("이름을 바꾸지 못했습니다");
      }
    }
  };

  // ── 저장: 원본은 그대로 두고 "이름_편집" 새 파일로 저장 ──
  const save = async () => {
    if (!src || !active || busy || !isEdited(baseOps)) return;
    setBusy(true);
    try {
      const canvas = renderOps(src.img, baseOps, { full: true });
      const fmt = saveFormat(active.name);
      const blob = await canvasToBlob(canvas, fmt.mime);
      const name = `${stemOf(active.name)}_편집.${fmt.ext}`;
      await copyFileTo({
        token: session.token,
        userId: session.userId,
        item: active,
        blob,
        mime: fmt.mime,
        name,
        parentId: active.parent_id ?? null,
      });
      onSaved(name);
    } catch {
      window.alert("저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const toggleChecked = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const content = useMemo(
    () => (
      <div className="studio-dock-content">
        <StudioMenuBar activeTool={tool} pressed={pressedTools} isEnabled={isEnabled} onPick={pick} />
        <StudioOptions
          tool={tool}
          ops={ops}
          size={size}
          ratio={ratio}
          mosaicLevel={mosaicLevel}
          renameCount={checked.size}
          textMode={textMode}
          onRatio={applyRatio}
          onCropReset={() => commit({ ...baseOps, crop: null })}
          onGeom={(g) => commit(withGeom(baseOps, g))}
          onScale={setScale}
          onResizeInput={() => {
            setTextMode("resize");
            setTextValue("");
          }}
          onLiveStart={liveStart}
          onLive={liveUpdate}
          onLiveEnd={liveEnd}
          onFilter={(f) => commit({ ...baseOps, filter: f })}
          onMosaicLevel={setMosaicLevel}
          onMosaicUndo={() => commit({ ...baseOps, mosaics: baseOps.mosaics.slice(0, -1) })}
          onMosaicClear={() => commit({ ...baseOps, mosaics: [] })}
        />
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, ops, size?.w, size?.h, ratio, mosaicLevel, checked, textMode, hist, live, showOriginal, src, active?.id, busy]
  );

  return (
    <>
      <PageHeader title="스튜디오" transfers={transfers} onAckTransfer={onAckTransfer} />
      <div className="page page--has-dock page--studio-dock">
        {files.length > 0 && (
          <div className="studio-strip">
            {files.map((f) => (
              <div className={`studio-thumb${active?.id === f.id ? " is-active" : ""}`} key={f.id}>
                <button type="button" className="studio-thumb-btn" aria-label={f.name} onClick={() => setActiveId(f.id)}>
                  {f.thumb_key && thumbs[f.thumb_key] ? <img src={thumbs[f.thumb_key]} alt="" draggable={false} /> : <span>{f.name.slice(0, 1)}</span>}
                </button>
                <button
                  type="button"
                  className={`studio-thumb-check${checked.has(f.id) ? " is-on" : ""}`}
                  aria-label={checked.has(f.id) ? "선택 해제" : "선택"}
                  aria-pressed={checked.has(f.id)}
                  onClick={() => toggleChecked(f.id)}
                />
              </div>
            ))}
          </div>
        )}
        <StudioCanvas
          rendered={rendered}
          tool={showOriginal ? null : tool}
          crop={cropRect}
          cropRatio={cropRatio}
          aspect={aspect}
          onCropChange={(r) => setLive({ ...(live ?? baseOps), crop: r })}
          onCropCommit={() => setLive((cur) => {
            if (cur) setTimeout(() => commit(cur), 0);
            return cur;
          })}
          onMosaicAdd={(r) => commit({ ...baseOps, mosaics: [...baseOps.mosaics, { ...r, level: mosaicLevel }] })}
        />
      </div>
      <BottomSearchBar
        studioDock
        studioContent={content}
        studioText={{
          active: Boolean(textMode),
          value: textValue,
          onChange: setTextValue,
          onSubmit: submitText,
          canSubmit: textValue.trim() !== "",
        }}
        searchDisabled={!textMode}
        settingsDisabled
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        onUpload={onUpload}
        onNewFolder={onImport}
        plusAccept={STUDIO_ACCEPT}
        plusSecondLabel="불러오기"
        plusSecondIcon={<ImportIcon size={17} />}
      />
    </>
  );
}

const CROP_R = { "1:1": 1, "4:3": 4 / 3, "3:4": 3 / 4, "16:9": 16 / 9, "9:16": 9 / 16 };
