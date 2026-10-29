import { useState } from "react";
import Dialog from "./Dialog.jsx";





export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  action,
  onClose,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  async function onConfirm() {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { fontSize: "13px" };

  return (
    <Dialog onClose={busy ? () => {} : onClose} labelledById="confirm-title" width={320}>
      <div className="p-6">
        <h2
          id="confirm-title"
          className="m-0"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        <p className="mt-2 mb-0" style={{ ...fieldStyle, color: "var(--text-secondary)" }}>
          {description}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 mb-0"
            style={{ ...fieldStyle, color: "var(--destructive)" }}
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-[38px] items-center justify-center px-4"
            style={{
              ...fieldStyle,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              background: "transparent",
            }}
          >
            Thôi
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex h-[38px] items-center justify-center px-4"
            style={{
              ...fieldStyle,
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: "var(--destructive)",
              color: "#FFFFFF",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
