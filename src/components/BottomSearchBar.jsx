import { useState } from "react";

// 하단바 아이콘(단일 solid fill, currentColor)과 같은 방식으로 그린 돋보기 아이콘.
// 링은 두 원을 evenodd로 겹쳐 만든 진짜 구멍(반투명 색에서도 이중 톤이 생기지
// 않는다 — 겹치는 영역이 아니라 "안 칠해지는" 영역이라 알파가 쌓이지 않음)이고,
// 손잡이는 링 바깥 경계에 딱 맞닿게 배치해 링과 겹치는 면적이 생기지 않게 했다.
function SearchIcon({ size = 18 }) {
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

// 예전 하단 내비바가 있던 자리에 고정된 검색바. 파일 화면(과 그 안에서 연
// 즐겨찾기 화면)에서 항상 떠 있다 — "검색바 항상 활성화" 설정은 없어졌고
// 이제 이게 유일한 동작이다.
//
// 스튜디오 툴킷의 삭제(휴지통) 아이콘을 누르면(confirmOpen) 별도 모달을
// 띄우지 않고 이 바 자체가 위로 커지면서(애니메이션) 검색창이 있던 자리에
// "삭제하시겠습니까?" 확인 문구와 취소·확인 버튼이 나타난다 — 딱 이 동작
// 하나에만 적용되는 처리이고, 다른 삭제·복원 확인(휴지통 화면 등)은 전부
// 그대로 ConfirmModal을 쓴다.
export default function BottomSearchBar({ searchQuery, onSearch, confirmOpen, onConfirmDelete, onCancelDelete }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirmDelete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bottom-search-wrap">
      <div className={`search-bar${confirmOpen ? " is-confirm" : ""}`}>
        {confirmOpen ? (
          <>
            <p className="search-bar-confirm-title">삭제하시겠습니까?</p>
            <div className="search-bar-confirm-actions">
              <button type="button" className="search-bar-confirm-btn" onClick={onCancelDelete} disabled={busy}>
                취소
              </button>
              <button
                type="button"
                className="search-bar-confirm-btn search-bar-confirm-btn--primary"
                onClick={confirm}
                disabled={busy}
              >
                확인
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="search-bar-icon">
              <SearchIcon />
            </span>
            <input
              className="search-bar-input"
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder="검색"
              value={searchQuery}
              onChange={(e) => onSearch?.(e.target.value)}
              onKeyDown={(e) => {
                // 모바일 키보드의 "검색" 확인 버튼도 엔터와 동일한 keydown을 발생시킨다.
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
