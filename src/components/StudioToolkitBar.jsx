import { useState } from "react";
import CheckboxVisual from "./Checkbox";

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 10.59 6.7 5.29 5.29 6.7 10.59 12l-5.3 5.3 1.41 1.41L12 13.41l5.29 5.3 1.41-1.41L13.41 12l5.3-5.29-1.41-1.42L12 10.59z" />
    </svg>
  );
}

// 홈·파일 탭 전용 "스튜디오 툴킷" 선택 도구줄. 제목·검색바와 같은 fixed 헤더
// 안에 있어 스크롤해도 함께 고정된다(PageHeader.jsx가 마운트를 조건부로 제어).
// 좌우 여백 없이 위아래 가로선으로만 구분된 한 줄이며, 왼쪽엔 전체 선택
// 체크박스+라벨, 오른쪽엔 편집(연필)·닫기(x) 아이콘이 있다.
//
// 지금은 이 바 자체의 UI만 구현한 상태다 — 실제로 파일을 꾹 눌러 활성화하는
// 연결은 파일 목록이 생기면 추가된다(현재는 설정 탭의 체크박스로만 켜고 끌 수 있음).
export default function StudioToolkitBar({ onClose }) {
  const [selectAll, setSelectAll] = useState(false);

  return (
    <div className="studio-toolkit">
      <label className="studio-toolkit-left">
        <span className="checkbox">
          <input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} />
          <CheckboxVisual />
        </span>
        <span className="studio-toolkit-label">전체 선택</span>
      </label>
      <div className="studio-toolkit-right">
        <button className="studio-toolkit-icon-btn" type="button" aria-label="편집">
          <PencilIcon />
        </button>
        <button className="studio-toolkit-icon-btn" type="button" aria-label="닫기" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
