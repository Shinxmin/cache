import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const GREETING = "반갑습니다";
const INTRO_DELAY_MS = 500;
const SLIDE_MS = 500;
const TYPE_INTERVAL_MS = 90;

// 비로그인 상태에서 뜨는 로그인/회원가입 화면. 입력창은 검색바와 같은
// 리퀴드글라스 알약 디자인을 그대로 쓴다. 로그인/회원가입 자격 증명은
// public.app_users 테이블에 pgcrypto로 해시되어 저장되며, signup_user/
// verify_login 두 RPC를 통해서만 접근한다(테이블 자체는 RLS로 잠겨 있음).
export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  // 처음엔 로고만 가운데 뜬다. 0.5초 뒤 로고+제목 묶음이 가운데에서 카드
  // 왼쪽 끝으로 자리를 옮기며(로고가 왼쪽으로 밀리는 것처럼 보인다) 동시에
  // 제목 자리도 넓어지고, 그 슬라이드가 끝나면 "반갑습니다"를 한 글자씩
  // 타이핑해 보여준다.
  const [revealed, setRevealed] = useState(false);
  const [typedCount, setTypedCount] = useState(0);
  useEffect(() => {
    const timeouts = [];
    let typeInterval = null;
    timeouts.push(
      setTimeout(() => {
        setRevealed(true);
        timeouts.push(
          setTimeout(() => {
            let i = 0;
            typeInterval = setInterval(() => {
              i += 1;
              setTypedCount(i);
              if (i >= GREETING.length) clearInterval(typeInterval);
            }, TYPE_INTERVAL_MS);
          }, SLIDE_MS)
        );
      }, INTRO_DELAY_MS)
    );
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      clearInterval(typeInterval);
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    // 다시 로그인 버튼을 누르는 순간 이전 에러는 초기화된다(새로고침 시에도
    // 컴포넌트가 새로 마운트되어 자연히 초기화됨).
    setError("");
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: rpcError } = await supabase.rpc("signup_user", {
          p_username: username,
          p_password: password,
        });
        if (rpcError) {
          setError(
            rpcError.message?.includes("USERNAME_TAKEN")
              ? "이미 사용 중인 아이디입니다"
              : "아이디 또는 비밀번호가 일치하지 않습니다"
          );
          return;
        }
        onLogin({ username: data.username, token: data.token });
      } else {
        const { data, error: rpcError } = await supabase.rpc("verify_login", {
          p_username: username,
          p_password: password,
        });
        if (rpcError || !data?.ok) {
          setError("아이디 또는 비밀번호가 일치하지 않습니다");
          return;
        }
        onLogin({ username: data.username, token: data.token });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand-wrap">
          <div className={`auth-brand${revealed ? " is-revealed" : ""}`}>
            <img className="auth-logo" src="/icons/icon-192.png" alt="" />
            <h1 className="auth-title">
              <span className="sr-only">{GREETING}</span>
              <span aria-hidden="true">
                {GREETING.slice(0, typedCount)}
                {typedCount < GREETING.length && revealed && <span className="auth-title-cursor" />}
              </span>
            </h1>
          </div>
        </div>
        <input
          className="auth-input"
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
        />
        <input
          className="auth-input"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
        />
        <div className="auth-error" aria-live="polite">
          {error}
        </div>
        <button className="auth-submit" type="submit" disabled={busy}>
          {isSignup ? "회원가입" : "로그인"}
        </button>
        <div className="auth-toggle-row">
          <span className="auth-toggle-hint">
            {isSignup ? "이미 계정이 있으십니까?" : "아직 계정이 없으십니까?"}
          </span>
          <button
            className="auth-toggle"
            type="button"
            onClick={() => {
              setMode(isSignup ? "login" : "signup");
              setError("");
            }}
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </div>
      </form>
    </div>
  );
}
