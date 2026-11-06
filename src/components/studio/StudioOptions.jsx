import { CROP_RATIOS, FILTERS, MOSAIC_LEVELS } from "../../lib/studioImage";

const Chip = ({ on, children, onClick, disabled }) => (
  <button type="button" className={`studio-chip${on ? " is-on" : ""}`} disabled={disabled} onClick={onClick}>
    {children}
  </button>
);

// 선택한 도구의 옵션 줄(가로 스크롤). 슬라이더·칩·버튼으로 값을 정하고, 숫자·이름 입력은 하단바 검색바가 맡는다.
export default function StudioOptions({
  tool,
  ops,
  size,
  ratio,
  mosaicLevel,
  renameCount,
  textMode,
  onRatio,
  onCropReset,
  onGeom,
  onScale,
  onResizeInput,
  onLiveStart,
  onLive,
  onLiveEnd,
  onFilter,
  onMosaicLevel,
  onMosaicUndo,
  onMosaicClear,
}) {
  if (!tool) return <div className="studio-options" />;
  let body = null;
  if (tool === "crop") {
    body = (
      <>
        {CROP_RATIOS.map((r) => (
          <Chip key={r.id} on={ratio === r.id} onClick={() => onRatio(r)}>
            {r.label}
          </Chip>
        ))}
        <Chip onClick={onCropReset} disabled={!ops.crop}>초기화</Chip>
      </>
    );
  } else if (tool === "rotate") {
    body = (
      <>
        <Chip onClick={() => onGeom("rotL")}>왼쪽 90°</Chip>
        <Chip onClick={() => onGeom("rotR")}>오른쪽 90°</Chip>
        <Chip onClick={() => onGeom("flipH")}>좌우 반전</Chip>
        <Chip onClick={() => onGeom("flipV")}>상하 반전</Chip>
      </>
    );
  } else if (tool === "resize") {
    body = (
      <>
        <span className="studio-opt-note">{size ? `${size.w}×${size.h}` : ""}</span>
        {[0.25, 0.5, 0.75, 1, 1.5, 2].map((s) => (
          <Chip key={s} on={Math.abs(ops.scale - s) < 0.001 && textMode !== "resize"} onClick={() => onScale(s)}>
            {Math.round(s * 100)}%
          </Chip>
        ))}
        <Chip on={textMode === "resize"} onClick={onResizeInput}>가로 입력</Chip>
      </>
    );
  } else if (tool === "adjust") {
    body = (
      <div className="studio-sliders">
        {[
          ["brightness", "밝기"],
          ["contrast", "대비"],
        ].map(([key, label]) => (
          <label className="studio-slider" key={key}>
            <span className="studio-slider-label">{label}</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={ops[key]}
              onPointerDown={onLiveStart}
              onChange={(e) => onLive({ [key]: Number(e.target.value) })}
              onPointerUp={onLiveEnd}
              onKeyUp={onLiveEnd}
              onBlur={onLiveEnd}
            />
            <span className="studio-slider-value">{ops[key]}</span>
          </label>
        ))}
      </div>
    );
  } else if (tool === "filter") {
    body = FILTERS.map((f) => (
      <Chip key={f.id} on={ops.filter === f.id} onClick={() => onFilter(f.id)}>
        {f.label}
      </Chip>
    ));
  } else if (tool === "mosaic") {
    body = (
      <>
        <span className="studio-opt-note">드래그해서 가릴 영역 지정</span>
        {MOSAIC_LEVELS.map((l) => (
          <Chip key={l.id} on={mosaicLevel === l.id} onClick={() => onMosaicLevel(l.id)}>
            {l.label}
          </Chip>
        ))}
        <Chip onClick={onMosaicUndo} disabled={!ops.mosaics.length}>마지막 취소</Chip>
        <Chip onClick={onMosaicClear} disabled={!ops.mosaics.length}>모두 지우기</Chip>
      </>
    );
  } else if (tool === "rename") {
    body = <span className="studio-opt-note">{renameCount ? `선택한 ${renameCount}개 파일 · 위 입력창에 이름을 쓰고 확인` : "목록에서 파일을 체크하세요"}</span>;
  }
  return <div className="studio-options">{body}</div>;
}
