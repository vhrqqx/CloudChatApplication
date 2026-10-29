import { useEffect, useRef } from "react";






export default function Dialog({ onClose, labelledById, width = 360, elevated = true, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.activeElement;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        style={{
          width,
          background: "var(--bubble-them-bg)",
          borderColor: "var(--border)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          boxShadow: elevated ? "0 12px 32px rgba(0, 0, 0, 0.18)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
