import { useEffect, useRef, useState } from "react";
import BottomSearchBar from "../components/BottomSearchBar";
import PageHeader from "../components/PageHeader";
import Spinner from "../components/Spinner";
import { ImportIcon } from "../components/icons";
import { fileUrl, renameFiles } from "../lib/drive";
import { isVideo, looksLikeVideoFile } from "../lib/thumbnail";

// 업로드할 수 있는 파일: 이미지·동영상·움짤만(폴더는 고를 수 없다).
export const STUDIO_ACCEPT =
  "image/*,video/*,.jpeg,.jpg,.png,.apng,.gif,.webp,.mp4,.avi,.mov,.m4v,.mkv,.webm";

const SWIPE_THRESHOLD = 50;

// 하단바 섹션(제목 자리의 내비게이션 바 버튼). 기본은 편집. 변환·저장 등은 이후 기능을 붙인다.
const SECTIONS = [
  { id: "edit", label: "편집" },
  { id: "convert", label: "변환" },
  { id: "save", label: "저장" },
];

// 스튜디오 화면(편집 기능은 나중에 붙인다). 불러오기·업로드한 파일을 파일 뷰어처럼 한 파일씩 크게 띄우고(좌우로 넘기기),
// 하단바의 스튜디오 영역은 정보 패널처럼 항상 열려 지금 파일의 이름(연필 검색바)·날짜·용량을 보여준다.
// 하단바: 위쪽은 섹션 버튼(편집·변환·저장)과 < >, 그 밑은 섹션별 내용, 검색바(편집 섹션에서만 켜져 이름을 수정), <는 홈으로, 설정은 설정 화면(거기서 < 로 나오면 다시 스튜디오), + 안에 업로드·불러오기. 검색은 비활성이다.
export default function StudioPage({ session, files, onUpload, onImport, onOpenSettings, onBack, onRenamed, transfers, onOpenTransfers }) {
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const swipe = useRef(null);
  const [section, setSection] = useState("edit");
  // 편집·변환 내용은 "저장"을 눌러야 실제 파일에 적용된다. 그 전까지는 여기에 보류해 둔다(지금은 이름 수정).
  const [pending, setPending] = useState({}); // { [fileId]: 새 이름 }
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const item = files[Math.min(index, files.length - 1)] ?? null;
  const at = item ? files.indexOf(item) : -1;

  useEffect(() => {
    if (index > files.length - 1) setIndex(Math.max(0, files.length - 1));
  }, [files.length]);

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!item) return undefined;
    let cancelled = false;
    fileUrl(session.token, item.r2_key)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  // 보고 있는 파일이 바뀌거나 보류 값이 바뀌면 이름 입력칸을 그 값으로 맞춘다.
  useEffect(() => {
    setDraft(item ? pending[item.id] ?? item.name : "");
  }, [item?.id, item?.name]);

  const shownName = item ? pending[item.id] ?? item.name : "";
  const typed = draft.trim();
  const canConfirm = Boolean(item) && Boolean(typed) && typed !== shownName;
  const confirmName = () => {
    if (!item || !typed) return;
    setPending((prev) => {
      const next = { ...prev };
      if (typed === item.name) delete next[item.id];
      else next[item.id] = typed;
      return next;
    });
  };

  const pendingCount = Object.keys(pending).length;
  const save = async () => {
    if (!pendingCount || saving) return;
    setSaving(true);
    try {
      const renames = Object.entries(pending).map(([id, name]) => ({ id, name }));
      await renameFiles(session.token, renames);
      onRenamed(Object.fromEntries(renames.map((r) => [r.id, r.name])));
      setPending({});
    } catch {
      window.alert("저장하지 못했습니다");
    } finally {
      setSaving(false);
    }
  };

  const go = (d) => setIndex((i) => Math.min(files.length - 1, Math.max(0, i + d)));
  const isVid = item && (isVideo(item.mime) || looksLikeVideoFile(item.name, item.mime));

  // 섹션마다 정보 영역에 보이는 내용이 바뀐다. 편집: 날짜·용량은 숨기고 빈 공간(이름은 검색바에서 수정), 변환: 비어 있음,
  // 저장: 보류된 변경 요약과 저장 버튼.
  const blank = (
    <>
      <p className="search-bar-confirm-desc">{"\u00a0"}</p>
      <p className="search-bar-confirm-desc">{"\u00a0"}</p>
    </>
  );
  const content =
    section === "save" ? (
      <>
        <div className="studio-save-line">
          <p className="search-bar-confirm-desc">{pendingCount ? `변경한 파일 ${pendingCount}개` : "변경 사항 없음"}</p>
          <button className="studio-save-btn" type="button" disabled={!pendingCount || saving} onClick={save}>
            저장
          </button>
        </div>
        <p className="search-bar-confirm-desc">{"\u00a0"}</p>
      </>
    ) : (
      blank
    );

  const info = {
    sections: SECTIONS,
    section,
    onSection: setSection,
    name: section === "edit" ? draft : shownName,
    editable: section === "edit" && Boolean(item),
    onChangeName: setDraft,
    onConfirmName: confirmName,
    canConfirm,
    content,
    onPrev: () => go(-1),
    onNext: () => go(1),
    prevDisabled: at <= 0,
    nextDisabled: at >= files.length - 1,
  };

  return (
    <>
      <PageHeader title="스튜디오" transfers={transfers} onOpenTransfers={onOpenTransfers} />
      <div className="page page--has-dock page--studio-dock">
        <div
          className="studio-viewport"
          onPointerDown={(e) => {
            swipe.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          }}
        >
          {item && failed && <p className="viewer-note">불러오지 못했습니다</p>}
          {item && !failed && !url && <p className="viewer-note"><Spinner /></p>}
          {item && url && !isVid && <img className="studio-media" src={url} alt={item.name} draggable={false} />}
          {item && url && isVid && <video className="studio-media" src={url} controls playsInline />}
        </div>
      </div>
      <BottomSearchBar
        studioDock
        studioInfo={info}
        searchDisabled={!info.editable}
        searchQuery=""
        onSearch={() => {}}
        canGoBack
        onBack={onBack}
        onOpenSettings={onOpenSettings}
        onUpload={onUpload}
        onNewFolder={onImport}
        plusAccept={STUDIO_ACCEPT}
        plusSecondLabel="불러오기"
        plusSecondIcon={<ImportIcon size={17} />}
      />
    </>
  );
}
