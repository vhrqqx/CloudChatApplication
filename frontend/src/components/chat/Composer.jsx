import { useEffect, useRef, useState } from "react";
import { PaperPlaneTilt, Paperclip, X, FileText } from "@phosphor-icons/react";
import { sendMessage, sendTyping } from "../../lib/ws.js";
import { useUi } from "../../store/ui.js";
import { useChat } from "../../store/chat.js";
import { formatBytes, MAX_FILE_BYTES } from "./MessageList.jsx";


const TYPING_INTERVAL_MS = 2000;
const MAX_LINES = 4;











export default function Composer({ conversationId }) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingRef = useRef(0);
  const wsState = useUi((s) => s.wsState);

  const file = pendingFile?.file ?? null;
  const uploading = progress !== null;


  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 4 * 21 + 16)}px`;
  }

  useEffect(() => {
    resize();

  }, [text]);

  function onChange(e) {
    setText(e.target.value.slice(0, 2000));
    const now = Date.now();
    if (now - lastTypingRef.current > TYPING_INTERVAL_MS) {
      lastTypingRef.current = now;
      sendTyping(conversationId);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }


  function onPickFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (picked.size > MAX_FILE_BYTES) {
      setError(`"${picked.name}" vượt quá 50MB — không gửi được.`);
      return;
    }
    setError(null);
    const previewUrl = picked.type?.startsWith("image/") ? URL.createObjectURL(picked) : null;
    setPendingFile({ file: picked, previewUrl });
  }

  function clearPending() {
    if (pendingFile?.previewUrl) URL.revokeObjectURL(pendingFile.previewUrl);
    setPendingFile(null);
    setProgress(null);
  }

  async function submit() {

    if (uploading) return;

    const hasText = text.trim().length > 0;
    if (!file && !hasText) return;

    try {
      if (file) {
        setProgress(0.02);
        await useChat.getState().sendAttachment(conversationId, file, {
          onProgress: (p) => setProgress(Math.max(p, 0.02)),
        });
        clearPending();
      }
      if (hasText) {
        sendMessage(conversationId, text.trim());
        setText("");
        lastTypingRef.current = 0;
      }
      setError(null);
    } catch (e) {
      setError(
        pickFriendly(e) ||
          "Gửi thất bại — thử lại.",
      );
      setProgress(null);
    }
  }

  function pickFriendly(e) {
    if (!e) return null;

    return e.message ? e.message : null;
  }

  return (
    <div
      className="shrink-0 border-t px-3 pt-2 pb-3"
      style={{ borderColor: "var(--border)", background: "var(--bg-chat)" }}
    >
      {wsState !== "connected" && (
        <p
          role="status"
          className="m-0 mb-2 px-1"
          style={{ fontSize: "12px", color: "var(--text-secondary)" }}
        >
          {wsState === "connecting" || wsState === "idle"
            ? "Đang kết nối…"
            : "Mất kết nối — đang thử lại…"}
        </p>
      )}
      {error && (
        <p role="alert" className="m-0 mb-2 px-1" style={{ fontSize: "12px", color: "var(--destructive)" }}>
          {error}
        </p>
      )}

      {                                                                                            }
      {file && (
        <div
          className="relative mb-2 flex items-center gap-2 border px-2 py-1.5"
          style={{
            background: "var(--bubble-them-bg)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius-sm)",
          }}
          aria-label="Tệp sắp gửi"
        >
          {pendingFile.previewUrl ? (
            <img
              src={pendingFile.previewUrl}
              alt=""
              style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }}
            />
          ) : (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center"
              style={{ background: "var(--bg-item-active)", borderRadius: 4, color: "var(--text-secondary)" }}
              aria-hidden="true"
            >
              <FileText size={20} weight="regular" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span
              className="block truncate"
              style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}
              title={file.name}
            >
              {file.name}
            </span>
            <span className="block tnum" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {uploading ? `Đang tải lên… ${Math.round(progress * 100)}%` : formatBytes(file.size)}
            </span>
          </span>
          <button
            type="button"
            aria-label="Bỏ chọn tệp"
            disabled={uploading}
            className="flex h-8 w-8 shrink-0 items-center justify-center"
            style={{
              border: "none",
              background: "none",
              color: "var(--text-secondary)",
              opacity: uploading ? 0.4 : 1,
            }}
            onClick={clearPending}
          >
            <X size={16} weight="regular" />
          </button>
          {                                                  }
          {uploading && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 2,
                background: "transparent",
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${Math.round(progress * 100)}%`,
                  background: "var(--accent)",
                  borderRadius: 2,
                  transition: "width 0.15s ease",
                }}
              />
            </span>
          )}
        </div>
      )}

      <div
        className="flex items-end gap-2 border px-2 py-1.5"
        style={{
          background: "var(--bubble-them-bg)",
          borderColor: "var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onPickFile}
        />
        <button
          type="button"
          aria-label="Gửi tệp đính kèm"
          title="Gửi tệp đính kèm"
          disabled={uploading}
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            color: "var(--text-secondary)",
            opacity: uploading ? 0.4 : 1,
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={20} weight="regular" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Nhập tin nhắn…"
          aria-label="Nhập tin nhắn"
          maxLength={2000}
          className="flex-1 resize-none border-0 bg-transparent outline-none placeholder:opacity-70"
          style={{
            color: "var(--text-primary)",
            fontSize: "14px",
            lineHeight: "21px",
            maxHeight: `${4 * 21 + 16}px`,
          }}
        />
        <button
          type="button"
          aria-label={file ? "Gửi tệp" : "Gửi tin nhắn"}
          title={file ? "Gửi tệp" : "Gửi tin nhắn"}
          disabled={uploading || (!text.trim() && !file)}
          onClick={submit}
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: text.trim() || file ? "var(--accent)" : "transparent",
            color: text.trim() || file ? "var(--on-accent)" : "var(--text-secondary)",
            opacity: uploading || (!text.trim() && !file) ? 0.55 : 1,
          }}
        >
          <PaperPlaneTilt size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
}
