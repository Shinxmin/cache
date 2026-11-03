import { useEffect, useState } from "react";
import CheckboxVisual from "./Checkbox";
import { deleteStoragePassword, getStoragePasswordStatus, setStoragePassword } from "../lib/drive";

// 설정의 "스토리지 통합 암호" 영역(보안 섹션 안). 이 암호 하나로 암호화(잠금)한 모든 파일·폴더를 연다.
//  · 암호가 없으면: 암호 입력란(안내문 없음) + 오른쪽의 "확인"으로 설정한다.
//  · 암호가 있으면: "삭제" 버튼만 있다. 누르면 현재 암호 입력란 + "확인"이 나타나고, 맞으면 삭제된다
//    (삭제하면 모든 항목의 암호화도 풀린다). 다른 탭·화면에 다녀오면 다시 "삭제" 버튼만 있는 처음 상태로 돌아간다.
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
  const submitDelete = () => run(async () => { await deleteStoragePassword(session.token, current); finish(false); });

  const openDelete = () => {
    setError("");
    setCurrent("");
    setNext("");
    setMode("delete");
  };
  // 다른 브라우저 탭에 다녀오면(화면이 다시 보이면) 열려 있던 삭제 입력을 닫고 처음 상태로 되돌린다.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) close();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  // 설정 전이면 곧바로 새 암호 입력란을 보여준다.
  const active = hasPw === false ? "set" : mode;

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
          <button className="settings-pw-btn" type="button" onClick={openDelete}>삭제</button>
        </div>
      )}
      {active && (
        <form
          className="settings-pw-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (active === "set") submitSet();
            else submitDelete();
          }}
        >
          {/* 입력란은 섹션 폭의 2/3, 그 오른쪽 빈 곳에 확인 버튼. 안내문(placeholder)은 없다. */}
          <div className="settings-pw-line">
            <input
              className="settings-pw-input"
              type="password"
              autoComplete="off"
              aria-label={active === "set" ? "새 암호" : "현재 암호"}
              maxLength={64}
              value={active === "set" ? next : current}
              onChange={(e) => (active === "set" ? setNext(e.target.value) : setCurrent(e.target.value))}
            />
            <button className="settings-pw-btn settings-pw-btn--primary" type="submit" disabled={busy || !(active === "set" ? next : current)}>
              확인
            </button>
          </div>
          {error && <p className="settings-pw-error">{error}</p>}
        </form>
      )}
    </div>
  );
}
