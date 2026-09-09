import { fileExt, formatBytes, formatDate } from "../lib/format";
import { isImage } from "../lib/items";

// 폴더/파일 한 줄. 썸네일(thumb)이 있으면 아이콘 자리에 보여 준다.
export default function ItemRow({ item, thumb, meta, onOpen, onMore }) {
  const folder = item.kind === "folder";
  return (
    <div className="row" role="button" tabIndex={0} onClick={() => onOpen?.(item)} onKeyDown={(e) => e.key === "Enter" && onOpen?.(item)}>
      <div className={`row-icon${folder ? " folder" : ""}`} aria-hidden>
        {folder ? <FolderGlyph /> : thumb && isImage(item) ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : fileExt(item.name)}
      </div>
      <div className="row-body">
        <div className="row-name">{item.name}</div>
        <div className="row-meta">{meta ?? (folder ? formatDate(item.updated_at) : `${formatBytes(item.size)} · ${formatDate(item.updated_at)}`)}</div>
      </div>
      {onMore ? (
        <button
          className="row-more"
          aria-label="더 보기"
          onClick={(e) => {
            e.stopPropagation();
            onMore(item);
          }}
        >
          ···
        </button>
      ) : (
        <span className="row-chevron">›</span>
      )}
    </div>
  );
}

function FolderGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    </svg>
  );
}
