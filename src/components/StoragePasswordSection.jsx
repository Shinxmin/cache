import { useEffect, useState } from "react";
import CheckboxVisual from "./Checkbox";
import { deleteStoragePassword, getStoragePasswordStatus, setStoragePassword } from "../lib/drive";

// 설정의 "스토리지 통합 암호" 섹션. 이 암호 하나로 암호화(잠금)한 모든 파일·폴더를 연다.
//  · 암호가 없으면: 새 암호를 입력하고 "설정".
//  · 암호가 있으면: "수정"(현재 암호 + 새 암호) 또는 "삭제"(현재 암호). 둘 다 현재 암호를 서버가 확인한다.
//    암호를 삭제하면 모든 항목의 암호화(잠금)도 함께 풀린다.
const MESSAGES = {
  WRONG_PASSWORD: "현재 암호가 맞지 않습니다",
  INVALID_PASSWORD: "암호는 1~64자로 입력해 주세요",
};

export default function StoragePasswordSection({ session, onChange }) {
  const [hasPw, setHasPw] = useState(null); // null = 확인 중
  const [mode, setMode] = useState(null); // null | "set" | "edit" | "delete"
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStoragePasswordStatus(session.token)
      .then((has) => {
        if (cancelled) return;
        setHasPw(has);
        onChange?.(has);
      })
      .catch(() => {
        if (!cancelled) setHasPw(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.token]);

  const close = () => {
    setMode(null);
    setCurrent("");
    setNext("");
    setError("");
  };
  const finish = (has) => {
    setHasPw(has);
    onChange?.(has);
    close();
  };
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const code = Object.keys(MESSAGES).find((k) => String(e?.message).includes(k));
      setError(code ? MESSAGES[code] : "저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const submitSet = () => run(async () => { await setStoragePassword(session.token, next, null); finish(true); });
  const submitEdit = () => run(async () => { await setStoragePassword(session.token, next, current); finish(true); });
  const submitDelete = () => run(async () => { await deleteStoragePassword(session.token, current); finish(false); });

  const openMode = (m) => {
    setError("");
    setCurrent("");
    setNext("");
    setMode(m);
  };
  // 설정 전이면 곧바로 새 암호 입력 폼을 보여준다.
  const active = hasPw === false && mode === null ? "set" : mode;

  return (
    <div className="settings-pw">
      <div className="settings-row settings-pw-head">
        <span className="settings-row-label">스토리지 통합 암호</span>
        {/* 설정 여부를 알려 주는 체크박스(체크 = 통합 암호가 설정돼 있음). 상태 표시일 뿐이라 눌러서 바꿀 수 없다. */}
        <span className="checkbox settings-pw-check" role="img" aria-label={hasPw ? "설정됨" : "미설정"}>
          <input type="checkbox" checked={Boolean(hasPw)} readOnly tabIndex={-1} aria-hidden="true" onClick={(e) => e.preventDefault()} />
          <CheckboxVisual />
        </span>
      </div>
      {hasPw && !active && (
        <div className="settings-pw-actions">
          <button className="settings-pw-btn" type="button" onClick={() => openMode("edit")}>수정</button>
          <button className="settings-pw-btn" type="button" onClick={() => openMode("delete")}>삭제</button>
        </div>
      )}
      {active && (
        <form
          className="settings-pw-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (active === "set") submitSet();
            else if (active === "edit") submitEdit();
            else submitDelete();
          }}
        >
          {(active === "edit" || active === "delete") && (
            <input className="settings-pw-input" type="password" autoComplete="off" placeholder="현재 암호" value={current} onChange={(e) => setCurrent(e.target.value)} />
          )}
          {(active === "set" || active === "edit") && (
            <input className="settings-pw-input" type="password" autoComplete="off" placeholder="새 암호" maxLength={64} value={next} onChange={(e) => setNext(e.target.value)} />
          )}
          {error && <p className="settings-pw-error">{error}</p>}
          <div className="settings-pw-actions">
            <button
              className="settings-pw-btn settings-pw-btn--primary"
              type="submit"
              disabled={busy || (active !== "delete" && !next) || (active !== "set" && !current)}
            >
              {active === "set" ? "설정" : active === "edit" ? "저장" : "삭제"}
            </button>
            {hasPw && (
              <button className="settings-pw-btn" type="button" onClick={close}>취소</button>
            )}
          </div>
          {active === "delete" && <p className="settings-pw-hint">암호를 삭제하면 암호화한 모든 파일·폴더의 암호화도 풀립니다.</p>}
        </form>
      )}
    </div>
  );
}
