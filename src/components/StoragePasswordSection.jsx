import CheckboxVisual from "./Checkbox";

// 설정의 "스토리지 통합 암호" 영역(보안 섹션 안): 소제목과 설정 여부 체크박스만 있다(체크 = 통합 암호가 설정됨).
// 설정·해제는 이 체크박스를 눌러 시작하고, 암호 입력과 확인은 하단바(제목 "암호" 팝업)에서 한다 —
// 설정 전에 누르면 새 암호를 입력해 설정하고, 설정된 뒤에 누르면 현재 암호를 입력해 맞으면 해제(삭제)한다.
// 해제하면 암호화한 모든 파일·폴더의 암호화도 풀린다.
export default function StoragePasswordSection({ hasPw, onToggle }) {
  return (
    <div className="settings-pw">
      <div className="settings-row settings-pw-head">
        <span className="settings-row-label">스토리지 통합 암호</span>
        <label className="checkbox settings-pw-check is-clickable" aria-label={hasPw ? "스토리지 통합 암호 해제" : "스토리지 통합 암호 설정"}>
          <input type="checkbox" checked={Boolean(hasPw)} onChange={() => onToggle?.()} />
          <CheckboxVisual />
        </label>
      </div>
    </div>
  );
}
