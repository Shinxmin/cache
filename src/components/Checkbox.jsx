// 리퀴드글라스 톤에 맞춘 체크박스의 시각적 표현만 담당한다. 실제
// <input type="checkbox">와 이를 감싸는 <label>은 호출부에서 구성한다 —
// 라벨 텍스트를 같이 눌러도 토글되게 하려면 그 텍스트까지 label 하나로
// 묶어야 하기 때문이다. 체크 상태는 형제 선택자(input:checked + .checkbox-box)로
// CSS가 직접 읽는다.
export default function CheckboxVisual() {
  return (
    <span className="checkbox-box" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5 9.5 18 20 6" />
      </svg>
    </span>
  );
}
