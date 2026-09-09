import { useState } from "react";
import { supabase, isSupabaseConfigured } from "../supabaseClient";

export default function AuthPage() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!isSupabaseConfigured) {
      setError("Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 설정되지 않았습니다.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setNotice("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.");
      }
    } catch (err) {
      setError(translate(err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <h1>cache</h1>
      <p>{mode === "signin" ? "계정으로 로그인하세요." : "새 계정을 만드세요."}</p>
      <form onSubmit={submit}>
        <input
          className="field"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="field"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <div className="error">{error}</div>}
        {notice && <div className="hint" style={{ textAlign: "left", margin: "4px 2px 0" }}>{notice}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "잠시만요…" : mode === "signin" ? "로그인" : "가입하기"}
        </button>
      </form>
      <div className="hint">
        {mode === "signin" ? "계정이 없나요?" : "이미 계정이 있나요?"}
        <button type="button" onClick={() => (setMode(mode === "signin" ? "signup" : "signin"), setError(""))}>
          {mode === "signin" ? "가입하기" : "로그인"}
        </button>
      </div>
    </div>
  );
}

function translate(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (m.includes("email not confirmed")) return "이메일 인증이 아직 완료되지 않았습니다.";
  if (m.includes("already registered")) return "이미 가입된 이메일입니다.";
  if (m.includes("password should be")) return "비밀번호는 6자 이상이어야 합니다.";
  if (m.includes("signups not allowed")) return "현재 새 가입이 허용되지 않습니다.";
  if (m.includes("rate limit")) return "요청이 너무 많습니다. 잠시 후 다시 시도하세요.";
  return msg || "요청에 실패했습니다.";
}
