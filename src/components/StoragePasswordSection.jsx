import { useEffect, useRef, useState } from "react";
import CheckboxVisual from "./Checkbox";
import { deleteStoragePassword, getStoragePasswordStatus, setStoragePassword } from "../lib/drive";

// 설정의 "스토리지 통합 암호" 영역(보안 섹션 안). 이 암호 하나로 암호화(잠금)한 모든 파일·폴더를 연다.
// 암호 입력란(안내문 없음)과 오른쪽의 "확인" 버튼은 항상 보인다.
//  · 암호가 없으면: 입력란에 새 암호를 쓰고 "확인"하면 설정된다(체크박스가 체크된다).
//  · 암호가 있으면: 입력란·"확인"은 표준 비활성 디자인으로 흐려져 있다. 체크된 통합 암호 체크박스를 눌러
//    해제하려 하면 입력란이 켜지고, 현재 암호를 쓰고 "확인"해서 맞으면 해제(삭제)된다. 삭제하면 모든 항목의
//    암호화도 풀린다. 다른 탭·화면에 다녀오면 해제 준비 상태는 닫히고 처음(흐린) 상태로 돌아간다.
const MESSAGES = {
  WRONG_PASSWORD: "현재 암호가 맞지 않습니다",
  INVALID_PASSWORD: "암호는 1~64자로 입력해 주세요",
};

export default function StoragePasswordSection({ session, onChange }) {
  const [hasPw, setHasPw] = useState(null); // null = 확인 중
  const [releasing, setReleasing] = useState(false); // 체크박스를 눌러 해제하려는 중(현재 암호 입력)
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

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

  const reset = () => {
    setReleasing(false);
    setValue("");
    setError("");
  };
  const finish = (has) => {
    setHasPw(has);
    onChange?.(has);
    reset();
  };
  // 다른 브라우저 탭에 다녀오면(화면이 다시 보이면) 해제 준비를 닫고 처음 상태로 되돌린다.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) reset();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

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

  // 설정 전: 새 암호 설정 / 설정 후(해제 준비 중): 현재 암호를 확인하고 삭제.
  const unset = hasPw === false;
  const inputEnabled = unset || (hasPw && releasing);
  const submit = () => {
    if (!value || !inputEnabled) return;
    if (unset) run(async () => { await setStoragePassword(session.token, value, null); finish(true); });
    else run(async () => { await deleteStoragePassword(session.token, value); finish(false); });
  };

  // 체크된 체크박스를 누르면 해제 준비(입력란 켜기·포커스), 한 번 더 누르면 닫는다. 설정 전에는 눌러도 아무 일 없다.
  const toggleRelease = () => {
    if (!hasPw) return;
    if (releasing) {
      reset();
      return;
    }
    setError("");
    setValue("");
    setReleasing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="settings-pw">
      <div className="settings-row settings-pw-head">
        <span className="settings-row-label">스토리지 통합 암호</span>
        <label className={`checkbox settings-pw-check${hasPw ? " is-clickable" : ""}`} aria-label="스토리지 통합 암호 해제">
          <input type="checkbox" checked={Boolean(hasPw)} disabled={!hasPw} onChange={toggleRelease} />
          <CheckboxVisual />
        </label>
      </div>
      <form
        className="settings-pw-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* 입력란은 섹션 폭의 2/3, 그 오른쪽 빈 곳에 확인 버튼. 안내문(placeholder)은 없다. */}
        <div className="settings-pw-line">
          <input
            ref={inputRef}
            className="settings-pw-input"
            type="password"
            autoComplete="off"
            aria-label={unset ? "새 암호" : "현재 암호"}
            maxLength={64}
            disabled={!inputEnabled}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="settings-pw-btn settings-pw-btn--primary" type="submit" disabled={busy || !inputEnabled || !value}>
            확인
          </button>
        </div>
        {error && <p className="settings-pw-error">{error}</p>}
      </form>
    </div>
  );
}
