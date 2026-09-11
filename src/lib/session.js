import { supabase } from "../supabaseClient";

// 로그인 세션. 서버에서 발급한 토큰만 저장하고(비밀번호는 저장하지 않는다),
// 앱을 열 때 resolve_session으로 아직 유효한 토큰인지 확인한다. 이 토큰은
// 파일 RPC와 R2 presign 엣지 함수에서 사용자를 확인하는 데 그대로 쓰인다.
const STORAGE_KEY = "cache_session";

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* 저장 실패해도(사파리 프라이빗 모드 등) 이번 세션 로그인은 유지된다 */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 지우지 못해도 메모리상 로그아웃은 진행한다 */
  }
}

// 저장된 토큰이 서버에서도 유효한지 확인하고, 맞으면 user_id까지 채워 돌려준다.
export async function verifySession(token) {
  const { data, error } = await supabase.rpc("resolve_session", { p_token: token });
  if (error || !data?.ok) return null;
  return { token, username: data.username, userId: data.user_id };
}
