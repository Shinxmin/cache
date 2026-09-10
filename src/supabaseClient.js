import { createClient } from "@supabase/supabase-js";

// 배포 환경에 VITE_SUPABASE_URL/KEY가 아직 설정되지 않은 경우에도 createClient가
// 던지는 예외 때문에 앱 전체가 하얀 화면으로 죽지 않도록 안전한 더미 값으로
// 대체한다. 실제 로그인/회원가입 요청만 실패할 뿐, 나머지 화면은 정상 작동한다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
