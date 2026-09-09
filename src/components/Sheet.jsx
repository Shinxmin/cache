import { useEffect } from "react";

// 하단에서 올라오는 리퀴드글라스 시트(center=true면 가운데 다이얼로그).
export default function Sheet({ open, onClose, title, subtitle, center = false, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`sheet-backdrop${center ? " center" : ""}`} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {!center && <div className="sheet-grabber" />}
        {title && <h2 className="sheet-title">{title}</h2>}
        {subtitle && <p className="sheet-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
