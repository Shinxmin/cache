import { useEffect, useRef, useState } from "react";

// 하단바 아이콘(단일 solid fill, currentColor)과 같은 방식으로 그린 돋보기 아이콘.
// 링은 두 원을 evenodd로 겹쳐 만든 진짜 구멍(반투명 색에서도 이중 톤이 생기지
// 않는다 — 겹치는 영역이 아니라 "안 칠해지는" 영역이라 알파가 쌓이지 않음)이고,
// 손잡이는 링 바깥 경계에 딱 맞닿게 배치해 링과 겹치는 면적이 생기지 않게 했다.
// size는 검색바 안(작게)과 스크롤 중 축소 아이콘(조금 크게)에서 재사용하기 위함.
export function SearchIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M17 10A7 7 0 1 1 3 10a7 7 0 0 1 14 0Zm-2.8 0a4.2 4.2 0 1 0-8.4 0 4.2 4.2 0 0 0 8.4 0Z"
      />
      <rect fill="currentColor" x="17" y="8.7" width="6.5" height="2.6" rx="1.3" transform="rotate(45 10 10)" />
    </svg>
  );
}

// 홈·파일 탭 제목 밑에 붙는 검색바. 탭이 바뀔 때 부모가 key={tab}으로 이 컴포넌트를
// 통째로 새로 마운트하므로, 여기 내부 상태(입력 글자)는 탭 전환마다 자동으로 초기화된다.
// hidden이 true인 동안(스크롤 중 축소된 상태)은 포커스를 받을 수 없고, 포커스가
// 있었다면 바로 blur해 숨겨진 입력창에 키보드가 떠 있지 않게 한다.
export default function SearchBar({ onSearch, hidden }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (hidden) inputRef.current?.blur();
  }, [hidden]);

  return (
    <div className="search-bar">
      <span className="search-bar-icon">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        className="search-bar-input"
        type="search"
        inputMode="search"
        enterKeyHint="search"
        placeholder="검색"
        tabIndex={hidden ? -1 : 0}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onSearch?.(e.target.value);
        }}
      />
    </div>
  );
}
