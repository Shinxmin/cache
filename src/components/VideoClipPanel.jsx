import { useEffect, useRef, useState } from "react";
import { deleteClip, listClips, renameClip } from "../lib/drive";
import { formatDuration } from "../lib/format";
import { CloseIcon } from "./icons";
import useLongPress from "../hooks/useLongPress";

// 다른 기기에서 만들거나 이름을 바꾼 클립도 따라오도록 주기적으로 다시 받아온다
// (이 앱은 Supabase 실시간 구독을 쓰지 않는다 — 세션 토큰 기반 커스텀 인증이라
// 실시간 채널에 RLS를 태울 수 없어서, 대신 짧은 주기로 다시 읽는다).
const POLL_MS = 3000;
// 제목은 확인 버튼 없이 입력하는 대로 저장된다(확인 버튼 없음). 글자마다
// 요청을 보내지 않도록 잠깐 멈췄을 때만 실제로 저장한다.
const SAVE_DEBOUNCE_MS = 400;

// 클립 한 칸(제목 → 시간 → 삭제 순). 제목을 누르면 그 구간으로 이동해
// 재생하고, 꾹 누르면 그 자리에서 제목을 고칠 수 있다. 목록 순서가 바뀌지
// 않으므로 칸마다 훅을 써도 안전하다.
function ClipChip({ clip, active, editing, onPlay, onEdit, onChangeName, onFinishEdit, onDelete }) {
  const press = useLongPress(onPlay, onEdit);
  return (
    <div className={`viewer-clip-chip${active ? " is-active" : ""}`}>
      {editing ? (
        <input
          className="viewer-clip-name-input"
          type="text"
          value={clip.name}
          autoFocus
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={onFinishEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      ) : (
        <button className="viewer-clip-name" type="button" {...press}>
          {clip.name}
        </button>
      )}
      <span className="viewer-clip-range">
        {formatDuration(clip.start_sec)}–{formatDuration(clip.end_sec)}
      </span>
      <button className="viewer-clip-delete" type="button" aria-label={`${clip.name} 삭제`} onClick={onDelete}>
        <CloseIcon size={10} />
      </button>
    </div>
  );
}

// 동영상 뷰어 위에 얹히는 하이라이트 클립 목록 패널. 새 클립을 만드는 건
// 이제 스튜디오의 "하이라이트" 섹션이 맡고(구간 기록 방식이 재생하며
// 시작·끝을 찍던 것에서 시간 텍스트를 직접 입력하는 방식으로 바뀌었다),
// 이 패널은 그렇게 저장된 클립을 재생 중인 영상 위에서 훑어보고(제목을
// 누르면 그 구간으로 이동) 이름을 고치거나 지우는 것만 담당한다. 클립이
// 하나도 없으면 아무것도 그리지 않는다 — 클립은 계정에 저장되므로 다른
// 기기·다른 시점에 만든 것도 그대로 나타난다. 클립이 3개를 넘어가면 한
// 줄에 3개까지만 두고(모든 화면 폭에서 고정 3열이라 겹치지 않는다) 그다음
// 줄로 넘어간다.
export default function VideoClipPanel({ session, item, video, onHasContentChange }) {
  const [clips, setClips] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // 지금 구간 재생 중인 클립. 끝 지점에 닿으면 멈추고 비운다 — 그 뒤에 직접
  // 재생 버튼을 누르면 평소처럼 이어서 볼 수 있다.
  const playingRef = useRef(null);
  const panelRef = useRef(null);
  const saveTimerRef = useRef(0);
  // 제목을 고치는 동안에는 서버에서 받아온 목록으로 덮어쓰지 않는다.
  const editingRef = useRef(null);
  const editPrevNameRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (editingRef.current) return;
      listClips(session.token, item.id)
        .then((rows) => {
          if (!cancelled) setClips(rows);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session.token, item.id]);

  const hasContent = clips.length > 0;

  // 부모(FileViewer)에게 지금 뭔가 그리고 있는지 알려준다 — 그래야 영상을
  // 패널 높이만큼 아래로 밀어낼지 결정할 수 있다.
  useEffect(() => {
    onHasContentChange(hasContent);
    return () => onHasContentChange(false);
  }, [hasContent, onHasContentChange]);

  // 패널이 영상을 가리지 않도록 실제 높이를 재서 넘겨준다 — .viewer-content가
  // 이 값만큼 위쪽 여백을 더 준다(PageHeader의 --header-h와 같은 방식).
  useEffect(() => {
    const root = document.documentElement;
    const el = panelRef.current;
    if (!el) {
      root.style.setProperty("--clip-panel-h", "0px");
      return undefined;
    }
    const update = () => root.style.setProperty("--clip-panel-h", `${el.getBoundingClientRect().height}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasContent, clips.length]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--clip-panel-h");
      clearTimeout(saveTimerRef.current);
    },
    []
  );

  // 클립 목록이 있는 동안은 반복 재생을 끈다 — 구간 끝에서 멈춰야 하는데
  // 영상 자체가 끝나 처음으로 되감기면 그 판정이 어긋난다. 목록이 없어지면
  // (다른 영상으로 넘어가는 등) 평소처럼 되돌린다.
  useEffect(() => {
    if (!video) return undefined;
    if (hasContent) {
      video.loop = false;
      return () => {
        video.loop = true;
      };
    }
    return undefined;
  }, [video, hasContent]);

  // 구간 재생 중 끝 지점에 닿으면 멈춘다.
  useEffect(() => {
    if (!video) return undefined;
    const onTimeUpdate = () => {
      const playing = playingRef.current;
      if (playing && video.currentTime >= playing.end_sec) {
        playingRef.current = null;
        video.pause();
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [video]);

  if (!hasContent) return null;

  const playClip = (clip) => {
    if (!video) return;
    setActiveId(clip.id);
    playingRef.current = clip;
    video.currentTime = clip.start_sec;
    video.play().catch(() => {});
  };

  const startEditing = (clip) => {
    editingRef.current = clip.id;
    editPrevNameRef.current = clip.name;
    setEditingId(clip.id);
  };

  const changeName = (id, value) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, name: value } : c)));
    clearTimeout(saveTimerRef.current);
    if (!value.trim()) return;
    saveTimerRef.current = setTimeout(() => {
      renameClip(session.token, id, value).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  };

  const finishEditing = (id) => {
    clearTimeout(saveTimerRef.current);
    editingRef.current = null;
    setEditingId(null);
    const clip = clips.find((c) => c.id === id);
    // 제목을 다 지운 채로 빠져나오면 이름 없는 클립이 되어 버리므로 고치기 전
    // 이름으로 되돌린다(서버도 빈 이름은 거부한다).
    if (!clip?.name.trim()) {
      const prevName = editPrevNameRef.current;
      setClips((prev) => prev.map((c) => (c.id === id ? { ...c, name: prevName } : c)));
      return;
    }
    renameClip(session.token, id, clip.name).catch(() => {});
  };

  const removeClip = async (id) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (playingRef.current?.id === id) playingRef.current = null;
    if (activeId === id) setActiveId(null);
    try {
      await deleteClip(session.token, id);
    } catch {
      window.alert("클립을 삭제하지 못했습니다");
    }
  };

  return (
    <div className="viewer-clip-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
      {/* 닫기(X) 버튼과 같은 줄 높이만큼 자리를 비워 둔다 — 그래야 클립
          목록이 그 자리를 밀고 올라와 겹치지 않는다. */}
      <div className="viewer-clip-actions" />
      {clips.length > 0 && (
        <div className="viewer-clip-grid">
          {clips.map((clip) => (
            <ClipChip
              key={clip.id}
              clip={clip}
              active={clip.id === activeId}
              editing={clip.id === editingId}
              onPlay={() => playClip(clip)}
              onEdit={() => startEditing(clip)}
              onChangeName={(value) => changeName(clip.id, value)}
              onFinishEdit={() => finishEditing(clip.id)}
              onDelete={() => removeClip(clip.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
