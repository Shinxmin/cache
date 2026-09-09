import { useEffect, useState } from "react";
import TabBar, { TABS } from "./components/TabBar";
import PageHeader from "./components/PageHeader";
import SearchBar from "./components/SearchBar";

// 검색바는 홈·파일 탭에서만 뜬다(설정에는 없음).
const SEARCH_TABS = new Set(["home", "files"]);

const THEME_COLORS = { dark: "#1B1B1B", light: "#F5F5F7" };

// 시스템 다크/라이트 설정을 따라 html[data-theme]와 theme-color를 맞춘다.
function useSystemTheme() {
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = mq.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", theme);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
}

export default function App() {
  useSystemTheme();
  const [tab, setTab] = useState(TABS[0].id);
  const title = TABS.find((t) => t.id === tab).label;

  return (
    <>
      <main className="page">
        <PageHeader title={title} />
        {/* key={tab}: 탭을 바꾸면 이 컴포넌트가 통째로 새로 마운트되어 입력값이 초기화된다 */}
        {SEARCH_TABS.has(tab) && <SearchBar key={tab} />}
      </main>
      <TabBar
        active={tab}
        onChange={(id) => {
          setTab(id);
          window.scrollTo({ top: 0 });
        }}
      />
    </>
  );
}
