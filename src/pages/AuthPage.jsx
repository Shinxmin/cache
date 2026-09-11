import { useState } from "react";
import { supabase } from "../supabaseClient";

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
        <h1 className="auth-title">반갑습니다</h1>
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
      </form>
    </div>
  );
}
