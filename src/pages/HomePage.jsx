import { ChevronRightIcon } from "../components/icons";

// 홈 탭 본문. 구분선으로 나뉜 두 섹션: 즐겨찾기(누르면 즐겨찾기 화면),
// 애드온 스토어(누르면 스토어 화면).
export default function HomePage({ onOpenFavorites, onOpenAddonStore }) {
  return (
    <div className="home">
      <section className="home-section">
        <button className="settings-row settings-row--link home-link" type="button" onClick={onOpenFavorites}>
          <span className="settings-row-label">즐겨찾기</span>
          <ChevronRightIcon size={18} />
        </button>
      </section>

      <section className="home-section">
        <button className="settings-row settings-row--link home-link" type="button" onClick={onOpenAddonStore}>
          <span className="settings-row-label">애드온 스토어</span>
          <ChevronRightIcon size={18} />
        </button>
      </section>
    </div>
  );
}
