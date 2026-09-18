import { useState } from "react";
import { ADDONS } from "../lib/addons";
import { BackIcon, CheckIcon, TrashIcon } from "../components/icons";
import ConfirmModal from "../components/ConfirmModal";

function PlusIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
    </svg>
  );
}

// 홈 → 애드온 스토어에서 열리는 화면. 스튜디오 툴킷에 넣을 수 있는 애드온
// 목록이다. 행마다 제목, 그 바로 오른쪽에 버전, 밑에 설명(없으면 공란), 오른쪽
// 끝(세로 가운데)에 추가(+) 버튼이 있다. 추가하면 툴킷 레이아웃 끝에 붙어
// 서버에 기록되고, 이미 추가된 애드온은 체크 표시로 바뀌어 다시 누를 수 없다.
// 추가된 애드온만 그 바로 왼쪽에 작은 삭제(휴지통) 버튼이 나타난다 —
// 추가돼 있지 않으면 아예 보이지 않는다. 누르면 확인 모달을 거쳐 삭제한다.
export default function AddonStorePage({ installedIds, onAdd, onRemove, onBack }) {
  const [busyId, setBusyId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const add = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await onAdd(id);
    } finally {
      setBusyId(null);
    }
  };

  const confirmRemove = async () => {
    await onRemove(removeTarget.id);
    setRemoveTarget(null);
  };

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">애드온 스토어</h1>
        </div>
      </header>
      <div className="page page--flush">
        <ul className="addon-list">
          {ADDONS.map((addon) => {
            const installed = installedIds.has(addon.id);
            return (
              <li key={addon.id} className="addon-row">
                <div className="addon-body">
                  <div className="addon-title-line">
                    <span className="addon-title">{addon.name}</span>
                    <span className="addon-version">v{addon.version}</span>
                  </div>
                  <p className="addon-desc">{addon.description || " "}</p>
                </div>
                {installed && (
                  <button
                    className="addon-remove"
                    type="button"
                    aria-label={`${addon.name} 삭제`}
                    onClick={() => setRemoveTarget(addon)}
                  >
                    <TrashIcon size={15} />
                  </button>
                )}
                <button
                  className={`addon-add${installed ? " is-installed" : ""}`}
                  type="button"
                  aria-label={installed ? `${addon.name} 추가됨` : `${addon.name} 추가`}
                  disabled={installed || busyId === addon.id}
                  onClick={() => add(addon.id)}
                >
                  {installed ? <CheckIcon size={16} /> : <PlusIcon />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {removeTarget && (
        <ConfirmModal
          title="애드온 삭제"
          message="애드온을 삭제하시겠습니까?"
          onClose={() => setRemoveTarget(null)}
          onSubmit={confirmRemove}
        />
      )}
    </>
  );
}
