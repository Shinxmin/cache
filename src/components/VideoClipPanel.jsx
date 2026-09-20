import { useEffect, useRef, useState } from "react";
import { createClip, listClips, renameClip } from "../lib/drive";
import { formatDuration } from "../lib/format";
import useLongPress from "../hooks/useLongPress";

// 다른 기기에서 만들거나 이름을 바꾼 클립도 따라오도록 주기적으로 다시 받아온다
// (이 앱은 Supabase 실시간 구독을 쓰지 않는다 — 세션 토큰 기반 커스텀 인증이라
// 실시간 채널에 RLS를 태울 수 없어서, 대신 짧은 주기로 다시 읽는다).
const POLL_MS = 3000;
// 제목은 확인 버튼 없이 입력하는 대로 저장된다. 글자마다 요청을 보내지 않도록
// 잠깐 멈췄을 때만 실제로 저장한다.
const SAVE_DEBOUNCE_MS = 400;

// 기본 저장 이름은 "클립_1", "클립_2"… 순이다. 이미 있는 번호 다음을 쓴다.
function nextClipName(clips) {
  const used = clips
    .map((c) => /^클립_(\d+)$/.exec(c.name))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10));
  return `클립_${used.length ? Math.max(...used) + 1 : 1}`;
}

// 클립 한 줄. 이름을 누르면 그 구간으로 이동해 재생하고, 꾹 누르면 그 자리에서
// 제목을 고칠 수 있다. 목록 순서가 바뀌지 않으므로 행마다 훅을 써도 안전하다.
function ClipRow({ clip, active, editing, onPlay, onEdit, onChangeName, onFinishEdit }) {
  const press = useLongPress(onPlay, onEdit);
  return (
    <li className={`viewer-clip-row${active ? " is-active" : ""}`}>
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
        {formatDuration(clip.start_sec)} – {formatDuration(clip.end_sec)}
      </span>
    </li>
  );
}

// 하이라이트 클립 애드온 v1.0: 동영상 뷰어 위에 얹히는 구간 기록 패널.
// 닫기(X) 버튼과 같은 줄 왼쪽에 시작·끝 버튼이 있고, 바로 밑에 위아래 가로선
// 으로 구분된 클립 목록이 생긴다. 클립은 계정에 저장되므로 다른 기기에서
// 같은 영상을 열어도 그대로 보인다.
export default function VideoClipPanel({ session, item, video }) {
  const [clips, setClips] = useState([]);
  // 시작 버튼을 눌러 찍어 둔 지점(초). null이면 아직 안 찍은 상태라 끝 버튼을
  // 누를 수 없다.
  const [pendingStart, setPendingStart] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // 지금 구간 재생 중인 클립. 끝 지점에 닿으면 멈추고 비운다 — 그 뒤에 직접
  // 재생 버튼을 누르면 평소처럼 이어서 볼 수 있다.
  const playingRef = useRef(null);
  const listRef = useRef(null);
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

  // 목록이 영상을 가리지 않도록 실제 높이를 재서 넘겨준다 — .viewer-content가
  // 이 값만큼 위쪽 여백을 더 준다(PageHeader의 --header-h와 같은 방식).
  useEffect(() => {
    const root = document.documentElement;
    const el = listRef.current;
    if (!el) {
      root.style.setProperty("--clip-panel-h", "0px");
      return undefined;
    }
    const update = () => root.style.setProperty("--clip-panel-h", `${el.getBoundingClientRect().height}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clips.length]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--clip-panel-h");
      clearTimeout(saveTimerRef.current);
    },
    []
  );

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

  const markStart = () => {
    if (video) setPendingStart(video.currentTime);
  };

  const markEnd = async () => {
    if (!video || pendingStart === null) return;
    const end = video.currentTime;
    // 끝이 시작보다 앞이면 아직 완성된 구간이 아니다 — 시작 지점은 그대로 두고
    // 제대로 된 끝 지점을 다시 찍게 둔다.
    if (end <= pendingStart) return;
    try {
      const created = await createClip(session.token, {
        fileId: item.id,
        name: nextClipName(clips),
        start: pendingStart,
        end,
      });
      setPendingStart(null);
      setClips((prev) => [...prev, created]);
    } catch {
      window.alert("클립을 저장하지 못했습니다");
    }
  };

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

  return (
    <>
      <div className="viewer-clip-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`viewer-clip-btn${pendingStart !== null ? " is-armed" : ""}`}
          type="button"
          onClick={markStart}
        >
          시작
        </button>
        <button className="viewer-clip-btn" type="button" disabled={pendingStart === null} onClick={markEnd}>
          끝
        </button>
      </div>
      {clips.length > 0 && (
        <ul className="viewer-clip-list" ref={listRef} onClick={(e) => e.stopPropagation()}>
          {clips.map((clip) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              active={clip.id === activeId}
              editing={clip.id === editingId}
              onPlay={() => playClip(clip)}
              onEdit={() => startEditing(clip)}
              onChangeName={(value) => changeName(clip.id, value)}
              onFinishEdit={() => finishEditing(clip.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
