import { createContext, useContext } from "react";

// App 전역: 로그인 사용자, 데이터 새로고침 신호, 업로드 큐, 탭 이동.
export const AppContext = createContext({
  user: null,
  refreshKey: 0,
  refresh: () => {},
  startUpload: async () => {},
  upload: null,
  goTab: () => {},
});

export const useApp = () => useContext(AppContext);
