import { useEffect, useState } from "react";
import { listDuplicateFiles, trashFiles } from "../lib/drive";
import { BackIcon, FileIcon, TrashIcon } from "../components/icons";
import Spinner from "../components/Spinner";
import useArmedConfirm from "../hooks/useArmedConfirm";
import { formatBytes } from "../lib/format";

// 설정 → 중복된 파일에서 열리는 화면. 레이아웃·디자인은 태그·휴지통 화면과 같다.
// 같은 종류·같은 크기인 파일들을 한 묶음으로 보고, 묶음마다 가장 먼저 올린 원본은
// 빼고 나머지(중복본)만 리스트로 나열한다 — 그래서 "전체 삭제"를 눌러도 원본은 남는다.
// 삭제는 영구 삭제가 아니라 휴지통으로 보낸다(휴지통에서 되살릴 수 있다). 각 행 오른쪽의
// 휴지통 아이콘은 그 파일 하나만, 제목 우측의 원형 삭제 버튼(태그 화면과 같은
// .header-circle-btn)은 목록 전체를 지운다.
// 두 액션 모두 두 번 눌러야 실행된다(useArmedConfirm).
export default function DuplicatesPage({ session, onBack }) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);
  const { isArmed, press } = useArmedConfirm();

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    listDuplicateFiles(session.token)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, refreshKey]);

  const trash = async (ids) => {
    try {
      await trashFiles(session.token, ids);
      setRefreshKey((k) => k + 1);
    } catch {
      window.alert("삭제하지 못했습니다");
    }
  };

  return (
    <>
      <header className="page-header page-header--static">
        <div className="page-header-row">
          <button className="header-back" type="button" aria-label="뒤로" onClick={onBack}>
            <BackIcon />
          </button>
          <h1 className="page-title">중복된 파일</h1>
          <button
            className={`header-circle-btn${isArmed("all") ? " is-armed" : ""}`}
            type="button"
            aria-label="중복된 파일 전체 삭제"
            data-armed={isArmed("all") ? "true" : undefined}
            disabled={items.length === 0}
            onClick={press("all", () => trash(items.map((it) => it.id)))}
          >
            <TrashIcon size={20} />
          </button>
        </div>
      </header>
      <div className="page page--flush">
        {state === "loading" && <p className="drive-note"><Spinner /></p>}
        {state === "error" && <p className="drive-note">불러오지 못했습니다</p>}
        {state === "ready" && items.length === 0 && <p className="drive-note">중복된 파일이 없습니다</p>}
        {state === "ready" && items.length > 0 && (
          <ul className="drive-list">
            {items.map((item) => (
              <li key={item.id} className="trash-row">
                <span className="drive-row-icon">
                  <FileIcon size={20} />
                </span>
                <span className="drive-row-name">{item.name}</span>
                <span className="trash-row-count">{formatBytes(item.size)}</span>
                <span className="trash-row-actions">
                  <button
                    className={`studio-toolkit-icon-btn${isArmed(`delete:${item.id}`) ? " is-armed" : ""}`}
                    type="button"
                    aria-label="삭제"
                    data-armed={isArmed(`delete:${item.id}`) ? "true" : undefined}
                    onClick={press(`delete:${item.id}`, () => trash([item.id]))}
                  >
                    <TrashIcon size={18} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
