import { STUDIO_SECTIONS } from "./studioTools";

// 가로 스크롤 메뉴바: 섹션 제목(공통·이미지·…) 아래에 도구 아이콘이 나란히 놓인다.
// activeTool: 지금 옵션 줄이 열려 있는 도구, pressed: 토글이 켜진 도구 id 목록, isEnabled(tool): 도구 사용 가능 여부.
export default function StudioMenuBar({ activeTool, pressed = [], isEnabled, onPick }) {
  return (
    <div className="studio-menubar" role="toolbar" aria-label="스튜디오 도구">
      {STUDIO_SECTIONS.map((section) => (
        <div className="studio-section" key={section.id}>
          <span className="studio-section-label">{section.label}</span>
          <div className="studio-section-tools">
            {section.tools.map((tool) => {
              const on = activeTool === tool.id || pressed.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  className={`studio-tool${on ? " is-on" : ""}`}
                  aria-label={tool.label}
                  aria-pressed={tool.kind === "toggle" ? on : undefined}
                  disabled={!isEnabled(tool)}
                  onClick={() => onPick(tool)}
                >
                  <tool.Icon />
                  <span className="studio-tool-label">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
