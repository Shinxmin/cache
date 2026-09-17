import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../lib/drive";
import { CloseIcon, DuplicateIcon } from "../components/icons";
import Spinner from "../components/Spinner";

// 스플릿 비교 애드온: 먼저 선택한 A파일을 왼쪽, 나중에 선택한 B파일을 오른쪽에
// 두고 가운데 슬라이더를 드래그해 두 이미지(움짤 포함)를 비교한다. 파일을
// 눌렀을 때 뜨는 기본 뷰어(FileViewer)와 같은 검정 전체화면 톤을 쓰되, 좌우
// 스와이프 넘기기 대신 clip-path로 B 이미지를 슬라이더 위치까지만 드러낸다.
// 두 파일의 확장자·크기가 달라도 각각 object-fit: contain으로 같은 박스 안에
// 맞춰 그리므로 그대로 겹쳐 비교할 수 있다.
//
// 닫기(X) 버튼 왼쪽의 복제 버튼을 누르면 지금 보고 있는 A/B를 그대로
// 복제해 프리셋으로 저장한다(onSavePreset, 실제 저장은 App.jsx가 맡는다).
export default function SplitCompareViewer({ session, items, onClose, onSavePreset }) {
  const [urlA, setUrlA] = useState(null);
  const [urlB, setUrlB] = useState(null);
  const [failed, setFailed] = useState(false);
  const [percent, setPercent] = useState(50);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef(null);

  const [itemA, itemB] = items;

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute("content");
    meta?.setAttribute("content", "#000000");
    return () => {
      if (prev != null) meta?.setAttribute("content", prev);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setUrlA(null);
    setUrlB(null);
    setFailed(false);
    Promise.all([fileUrl(session.token, itemA.r2_key), fileUrl(session.token, itemB.r2_key)])
      .then(([a, b]) => {
        if (cancelled) return;
        setUrlA(a);
        setUrlB(b);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, itemA, itemB]);

  const percentFromClientX = (clientX) => {
    const rect = stageRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  };

  // 핸들 자체는 순서가 바뀌는 목록이 아니라 늘 같은 DOM 노드라, 여기서는
  // setPointerCapture가 안전하다(ToolkitArranger처럼 window 리스너로 갈
  // 필요 없음 — 그 경우는 드래그 중 배열 순서가 바뀌어 노드가 옮겨지는
  // 상황이었다).
  const onHandlePointerDown = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPercent(percentFromClientX(e.clientX));
  };
  const onHandlePointerMove = (e) => {
    setPercent(percentFromClientX(e.clientX));
  };

  const handleSavePreset = async (e) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      await onSavePreset(itemA, itemB);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="viewer-overlay" onClick={onClose}>
      <button
        className="viewer-preset"
        type="button"
        aria-label="프리셋으로 저장"
        disabled={saving}
        onClick={handleSavePreset}
      >
        <DuplicateIcon />
      </button>
      <button className="viewer-close" type="button" aria-label="닫기" onClick={onClose}>
        <CloseIcon />
      </button>
      <div className="split-compare" onClick={(e) => e.stopPropagation()}>
        {failed && <p className="viewer-note">불러오지 못했습니다</p>}
        {!failed && (!urlA || !urlB) && (
          <p className="viewer-note">
            <Spinner />
          </p>
        )}
        {urlA && urlB && (
          <div className="split-stage" ref={stageRef}>
            <img className="split-img" src={urlA} alt={itemA.name} draggable={false} />
            <div className="split-img-clip" style={{ clipPath: `inset(0 0 0 ${percent}%)` }}>
              <img className="split-img" src={urlB} alt={itemB.name} draggable={false} />
            </div>
            <div
              className="split-handle"
              style={{ left: `${percent}%` }}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
            >
              <div className="split-handle-line" />
              <div className="split-handle-grip" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
