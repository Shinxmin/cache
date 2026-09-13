import { useEffect, useState } from "react";
import { deleteAllTags, deleteTag, listDistinctTags } from "../lib/drive";
import { BackIcon, HashIcon, TrashIcon } from "../components/icons";
import ConfirmModal from "../components/ConfirmModal";
import Spinner from "../components/Spinner";

// 설정 → 태그에서 열리는 화면. 지금 쓰이고 있는(휴지통에 있지 않은 파일에
// 붙어 있는) 태그를 전부 나열하고, 이름 바로 오른쪽에 그 태그가 붙은
// 파일·폴더 개수를 작은 글씨로 덧붙인다("3개 항목"). 각 행 오른쪽의 휴지통
// 아이콘은 그 태그 하나만(붙어 있던 모든 파일에서 태그만 뗀다, 파일
// 자체는 그대로) 지우고,
// 제목 우측의 원형 삭제 버튼(전송 현황의 기록 삭제와 같은 .header-circle-btn
// 재질·아이콘)은 지금 목록에 있는 태그를 한꺼번에 전부 지운다. 휴지통
// 화면과 마찬가지로 두 액션 모두 ConfirmModal로 한 번 확인을 거친다.
export default function TagsPage({ session, onBack }) {
  const [tags, setTags] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  // null이면 확인 모달이 닫혀 있는 상태. 열려 있으면 { kind: "deleteAll" | "delete", tag? }.
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listDistinctTags(session.token)
      .then((rows) => {
        if (cancelled) return;
        setTags(rows);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, refreshKey]);

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.kind === "deleteAll") {
        await deleteAllTags(session.token);
      } else {
        await deleteTag(session.token, pendingAction.tag);
      }
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("태그를 삭제하지 못했습니다");
    }
    setPendingAction(null);
  };

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">태그</h1>
          <button
            className="header-circle-btn"
            type="button"
            aria-label="태그 전체 삭제"
            disabled={tags.length === 0}
            onClick={() => setPendingAction({ kind: "deleteAll" })}
          >
            <TrashIcon size={20} />
          </button>
        </div>
      </header>
      <div className="page page--flush">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && tags.length === 0 && <p className="drive-note">태그가 없습니다</p>}
        {state === "ready" && tags.length > 0 && (
          <ul className="drive-list">
            {tags.map(({ tag, count }) => (
              <li key={tag} className="trash-row">
                <span className="drive-row-icon">
                  <HashIcon size={20} />
                </span>
                <span className="drive-row-name">{tag}</span>
                <span className="trash-row-count">{count}개 항목</span>
                <span className="trash-row-actions">
                  <button
                    className="studio-toolkit-icon-btn"
                    type="button"
                    aria-label="태그 삭제"
                    onClick={() => setPendingAction({ kind: "delete", tag })}
                  >
                    <TrashIcon size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pendingAction && (
        <ConfirmModal
          title="삭제"
          message="태그를 삭제하시겠습니까?"
          onClose={() => setPendingAction(null)}
          onSubmit={confirmPendingAction}
        />
      )}
    </>
  );
}
