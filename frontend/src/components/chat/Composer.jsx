import { useEffect, useRef, useState, useId } from "react";
import { PaperPlaneTilt, Paperclip, X, SmileySticker, CheckSquareOffset, ChartBarHorizontal, UserCheck } from "@phosphor-icons/react";
import { sendMessage, sendTyping } from "../../lib/ws.js";
import { useUi } from "../../store/ui.js";
import { useChat } from "../../store/chat.js";
import { formatBytes, MAX_FILE_BYTES, getFileIconAndColor } from "./MessageList.jsx";

import NebulaForm from "../nebula/NebulaForm.jsx";
import { useNebula, memberName } from "../../store/nebula.js";
import ReplyContent from "./ReplyContent.jsx";
import StickerPicker from "./StickerPicker.jsx";
import { replyPrefix, serializeReply, replyExcerpt } from "../../lib/reply.js";
import { mentionQuery } from "../../lib/mentions.js";

const TYPING_INTERVAL_MS = 2000;
const MAX_LINES = 4;

export default function Composer({ conversationId, reply, onCancelReply }) {
  const [nebulaForm, setNebulaForm] = useState(null);
  useNebula((s) => s.records);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [text, setText] = useState("");
  const [caret, setCaret] = useState(0);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const listId = useId();
  const members = useChat((s) => s.members[String(conversationId)]);
  const conv = useChat((s) => s.items.find((i) => i.id === conversationId));
  const query = conv?.type === "GROUP" && !dismissed ? mentionQuery(text, caret) : null;
  const names = [...new Set([...(conv?.type === "GROUP" ? ["Tất cả"] : []), ...(members ?? []).map((m) => memberName(conversationId, m.id, m.username))])];
  const choices = query ? names.filter((n) => n.toLocaleLowerCase('vi').includes(query.query.toLocaleLowerCase('vi'))).slice(0, 5) : [];
  const activeIndex = Math.min(mentionIndex, Math.max(0, choices.length - 1));
  function chooseMention(name) {
    if (!query) return;
    const insert = `@${name} `;
    const next = text.slice(0, query.start) + insert + text.slice(query.end);
    if (next.length > 2000) return;
    setText(next); setDismissed(true);
    const position = query.start + insert.length;
    requestAnimationFrame(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(position, position); setCaret(position); });
  }
  const [pendingFiles, setPendingFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTypingRef = useRef(0);
  const wsState = useUi((s) => s.wsState);

  const file = pendingFiles[0]?.file ?? null;
  const uploading = progress !== null;

  const textLimit = 2000 - replyPrefix(reply).length;
  useEffect(() => { if (reply) textareaRef.current?.focus(); }, [reply]);

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
    setText(e.target.value.slice(0, textLimit));
    setCaret(e.target.selectionStart); setMentionIndex(0); setDismissed(false);
    const now = Date.now();
    if (now - lastTypingRef.current > TYPING_INTERVAL_MS) {
      lastTypingRef.current = now;
      sendTyping(conversationId);
    }
  }

  function onKeyDown(e) {
    if (e.nativeEvent.isComposing) return;
    if (choices.length) {
      if (e.key === "Escape") { e.preventDefault(); setDismissed(true); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((activeIndex + (e.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length); return; }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") { e.preventDefault(); chooseMention(choices[activeIndex]); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function onPickFile(e) {
    const picked = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!picked.length) return;
    const tooLarge = picked.find((item) => item.size > MAX_FILE_BYTES);
    if (tooLarge) { setError(`"${tooLarge.name}" vượt quá 50MB — không gửi được.`); return; }
    setError(null);
    setPendingFiles((current) => [...current, ...picked.map((item) => ({
      file: item,
      previewUrl: item.type?.startsWith("image/") ? URL.createObjectURL(item) : null,
      uploaded: false,
    }))]);
  }

  function clearPending() {
    pendingFiles.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
    setPendingFiles([]);
    setProgress(null);
  }

  async function submit() {

    if (uploading) return;

    const hasText = text.trim().length > 0;
    if (!pendingFiles.length && !hasText) return;

    try {
      if (pendingFiles.length) {
        const queue = pendingFiles.filter((item) => !item.uploaded);
        setProgress(0.02);
        for (let i = 0; i < queue.length; i++) {
          const current = queue[i];
          await useChat.getState().sendAttachment(conversationId, current.file, {
            onProgress: (p) => setProgress(Math.max((i + p) / Math.max(queue.length, 1), 0.02)),
          });
          setPendingFiles((items) => items.map((item) => item === current ? { ...item, uploaded: true } : item));
        }
        clearPending();
      }
      if (hasText) {
        sendMessage(conversationId, serializeReply(reply, text.trim()));
        onCancelReply?.();
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
      className="relative shrink-0 border-t px-3 pt-2 pb-3"
      style={{ borderColor: "var(--border)", background: "var(--bg-chat)" }}
    >
      {nebulaForm && <NebulaForm type={nebulaForm} conv={conv} onClose={() => setNebulaForm(null)} />}
      {reply && <div className="reply-preview"><div className="min-w-0 flex-1"><strong className="block truncate">Trả lời {reply.senderName}</strong><ReplyContent reply={reply} conversationId={conversationId} /></div><button type="button" className="m9-icon" aria-label="Hủy trả lời" onClick={onCancelReply}><X size={14} /></button></div>}
      {stickerOpen && <StickerPicker onClose={() => { setStickerOpen(false); textareaRef.current?.focus(); }} onPick={(content) => { try { sendMessage(conversationId, content); setStickerOpen(false); textareaRef.current?.focus(); } catch (e) { setError(e.message); } }} />}
      {choices.length > 0 && <div id={listId} role="listbox" aria-label="Gợi ý nhắc tên" className="m9-mentions">{choices.map((name, i) => <button key={name} id={`${listId}-${i}`} role="option" aria-selected={i === activeIndex} tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseMention(name)}>@{name}</button>)}</div>}
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

      {pendingFiles.length > 0 && <div className="mb-2 grid gap-1" aria-label="Tệp sắp gửi">
        {pendingFiles.map((pending, index) => {
          const info = getFileIconAndColor(pending.file.name, pending.file.type);
          const Icon = info.Icon;
          return <div key={`${pending.file.name}-${index}`} className="relative flex items-center gap-2 border px-2 py-1.5" style={{ background: "var(--bubble-them-bg)", borderColor: "var(--border)", borderRadius: "var(--radius-sm)" }}>
            {pending.previewUrl ? <img src={pending.previewUrl} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4 }} /> : <span className="ux-file-icon" style={{ "--file-color": info.color }} aria-hidden="true"><Icon size={18} /><small>{info.label}</small></span>}
            <span className="min-w-0 flex-1"><span className="block truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }} title={pending.file.name}>{pending.file.name}</span><span className="block tnum" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{pending.uploaded ? "Đã tải lên" : uploading ? `Đang tải lên… ${Math.round(progress * 100)}%` : formatBytes(pending.file.size)}</span></span>
            <button type="button" aria-label={`Bỏ chọn ${pending.file.name}`} disabled={uploading} className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ border: "none", background: "none", color: "var(--text-secondary)", opacity: uploading ? 0.4 : 1 }} onClick={() => { if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl); setPendingFiles((items) => items.filter((item) => item !== pending)); }}><X size={16} weight="regular" /></button>
          </div>;
        })}
      </div>}

      <div className="neb-composer-tools" aria-label="Công cụ cộng tác">        <button type="button" className="m9-icon" title="Giao việc" aria-label="Giao việc" onClick={() => setNebulaForm('task')}><CheckSquareOffset size={20}/></button>
        {conv?.type==='GROUP' && <><button type="button" className="m9-icon" title="Tạo bình chọn" aria-label="Tạo bình chọn" onClick={() => setNebulaForm('poll')}><ChartBarHorizontal size={20}/></button><button type="button" className="neb-checkin-shortcut" title="Tạo điểm danh" aria-label="Tạo điểm danh" onClick={() => setNebulaForm('checkin')}><UserCheck size={20}/></button></>}
</div>
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
          accept="*/*"
          multiple
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

        <button type="button" data-sticker-toggle className="m9-icon" title="Nhãn dán" aria-label="Nhãn dán" aria-expanded={stickerOpen} onClick={() => setStickerOpen((v) => !v)}><SmileySticker size={20} weight={stickerOpen ? "fill" : "regular"} /></button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={(e) => setCaret(e.target.selectionStart)}
          onBlur={() => setTimeout(() => setDismissed(true), 150)}
          aria-autocomplete="list"
          aria-controls={choices.length ? listId : undefined}
          aria-activedescendant={choices.length ? `${listId}-${activeIndex}` : undefined}
          placeholder="Nhập tin nhắn…"
          aria-label="Nhập tin nhắn"
          maxLength={textLimit}
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
          disabled={uploading || (!text.trim() && !pendingFiles.length)}
          onClick={submit}
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: text.trim() || pendingFiles.length ? "var(--accent)" : "transparent",
            color: text.trim() || pendingFiles.length ? "var(--on-accent)" : "var(--text-secondary)",
            opacity: uploading || (!text.trim() && !pendingFiles.length) ? 0.55 : 1,
          }}
        >
          <PaperPlaneTilt size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
}
