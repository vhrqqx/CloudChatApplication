import { useEffect, useRef, useState } from "react";
import {
  FileText,
  FileArchive,
  DownloadSimple,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import Avatar from "../Avatar.jsx";
import Dialog from "../Dialog.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { apiBinary } from "../../lib/api.js";
import { formatBubbleTime } from "../../lib/time.js";
import { useChat, attachmentNameOf } from "../../store/chat.js";
import { useUi } from "../../store/ui.js";

const CLUSTER_WINDOW_MS = 2 * 60 * 1000;
const SCROLL_EDGE = 60;
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function formatBytes(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const thumbCache = new Map();

function loadBlob(downloadUrl) {

  const path = String(downloadUrl).replace(/^\/api\/v1/, "");
  return apiBinary(path);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "file";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function AttachmentImage({ attachment, alt, onOpenFull }) {
  const [src, setSrc] = useState(thumbCache.get(attachment.id) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (thumbCache.has(attachment.id)) {
      setSrc(thumbCache.get(attachment.id));
      return;
    }
    let alive = true;
    loadBlob(attachment.downloadUrl)
      .then((blob) => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        thumbCache.set(attachment.id, url);
        setSrc(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attachment.id]);

  if (failed) {
    return <FileCard attachment={attachment} downloadable={false} />;
  }
  return (
    <button
      type="button"
      className="block cursor-zoom-in"
      style={{ border: "none", background: "none", padding: 0 }}
      onClick={onOpenFull}
      aria-label={`Xem ảnh lớn: ${alt}`}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="block"
          style={{
            maxWidth: "100%",
            maxHeight: 240,
            borderRadius: 6,
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex items-center justify-center"
          style={{
            width: 160,
            height: 120,
            borderRadius: 6,
            background: "var(--bg-item-hover)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          Đang tải ảnh…
        </span>
      )}
    </button>
  );
}

function ImageViewer({ attachment, onClose }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadBlob(attachment.downloadUrl)
      .then((blob) => alive && setSrc(URL.createObjectURL(blob)))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [attachment]);

  return (
    <Dialog onClose={onClose} labelledById="view-image-title" width={720}>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span
            id="view-image-title"
            className="truncate"
            style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}
          >
            {attachment.filename}
          </span>
          <button
            type="button"
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center"
            style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
            onClick={onClose}
          >
            <X size={20} weight="regular" />
          </button>
        </div>
        {src ? (
          <img
            src={src}
            alt={attachment.filename}
            style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 6 }}
          />
        ) : error ? (
          <p role="alert" className="m-0" style={{ fontSize: "13px", color: "var(--destructive)" }}>
            {error || "Không tải được ảnh."}
          </p>
        ) : (
          <p role="status" className="m-0 text-center" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Đang tải ảnh…
          </p>
        )}
      </div>
    </Dialog>
  );
}

function FileCard({ attachment, downloadable, onErrorFlash }) {
  const [busy, setBusy] = useState(false);
  const name = attachment.filename;
  const lower = String(name).toLowerCase();
  const isArchive = /\.(zip|rar|7z|tar|gz)$/.test(lower);

  async function download() {
    setBusy(true);
    try {
      const blob = await loadBlob(attachment.downloadUrl);
      triggerDownload(blob, attachment.filename);
    } catch (e) {
      onErrorFlash?.(e.message || "Không tải được tệp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center"
        style={{
          background: "var(--bg-item-active)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
        }}
        aria-hidden="true"
      >
        {isArchive ? <FileArchive size={20} weight="regular" /> : <FileText size={20} weight="regular" />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}
          title={name}
        >
          {name}
        </span>
        <span
          className="block tnum"
          style={{ fontSize: "11px", color: "var(--text-secondary)" }}
        >
          {attachment.size != null ? formatBytes(attachment.size) : "Tệp đính kèm"}
        </span>
      </span>
      {downloadable && (
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            border: "none",
            background: "none",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
          }}
          title={busy ? "Đang tải…" : "Tải về"}
        >
          <button
            type="button"
            aria-label={`Tải về ${name}`}
            disabled={busy}
            style={{
              border: "none",
              background: "none",
              color: "var(--text-secondary)",
              cursor: busy ? "default" : "pointer",
              padding: 0,
            }}
            onClick={download}
          >
            <DownloadSimple size={16} weight="regular" />
          </button>
        </span>
      )}
    </span>
  );
}

function BubbleRow({ msg, conv, myId, spacingTop, showMeta }) {
  const isMine = String(msg.senderId) === String(myId);
  const flashError = useUi.getState().flashError;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content ?? "");
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const taRef = useRef(null);

  const tomb = msg.deletedInfo;
  const attName = attachmentNameOf(msg.content);
  const attachment =
    msg.attachment ??
    (attName ? { filename: attName, size: null, contentType: null, downloadUrl: null } : null);
  const isImage = Boolean(attachment?.contentType?.startsWith("image/"));
  const canDownload = Boolean(attachment?.downloadUrl);
  const isText = !attName;

  useEffect(() => {
    if (editing) {
      taRef.current?.focus();
      taRef.current?.select();
    }
  }, [editing]);

  async function saveEdit() {
    const content = draft.trim();
    if (!content || content === msg.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await useChat.getState().editMessage(conv.id, msg.id, content);
      setEditing(false);
    } catch (e) {
      flashError(e.message || "Không sửa được tin nhắn.");
    } finally {
      setSaving(false);
    }
  }

  function onViewFull() {
    if (attachment?.downloadUrl) setViewer(true);
  }

  const metaRow = showMeta && (
    <span
      className="tnum"
      style={{
        fontSize: "11px",
        color: "var(--text-secondary)",
        marginTop: 2,
        marginLeft: isMine ? 0 : 36,
      }}
    >
      {formatBubbleTime(msg.createdAt)}
      {isMine && msg.editedAt ? " (đã chỉnh sửa)" : ""}
    </span>
  );

  if (editing) {
    return (
      <div
        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
        style={{ marginTop: spacingTop }}
      >
        <div className="flex w-full items-end justify-end gap-2">
          <div
            style={{
              maxWidth: "68%",
              minWidth: 220,
              background: "var(--bubble-me-bg)",
              border: `1px solid var(--accent)`,
              borderRadius: "12px 12px 4px 12px",
              padding: "5px 8px",
            }}
          >
            <textarea
              ref={taRef}
              rows={2}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                }
              }}
              aria-label="Sửa nội dung tin nhắn"
              className="w-full resize-none border-0 bg-transparent outline-none"
              style={{
                color: "var(--text-primary)",
                fontSize: "13px",
                lineHeight: "1.45",
              }}
            />
            <span className="mt-1 flex items-center justify-end gap-1">
              <button
                type="button"
                aria-label="Hủy sửa"
                className="px-2 py-1"
                style={{
                  border: "none",
                  background: "none",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
                onClick={() => setEditing(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                aria-label="Lưu thay đổi"
                disabled={saving || !draft.trim()}
                className="px-2 py-1"
                style={{
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: "12px",
                  fontWeight: 600,
                  opacity: saving || !draft.trim() ? 0.5 : 1,
                }}
                onClick={saveEdit}
              >
                {saving ? "Đang lưu…" : "Lưu"}
              </button>
            </span>
          </div>
        </div>
        {metaRow}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
      style={{ marginTop: spacingTop }}
    >
      <div className={`flex w-full items-end ${isMine ? "justify-end" : "justify-start"}`}>
        {!isMine && (
          <span
            className="shrink-0 self-end pb-0.5"
            style={{ width: showMeta ? 28 : 36, marginRight: showMeta ? 8 : 0 }}
            aria-hidden="true"
          >
            {showMeta && (
              <Avatar
                name={
                  conv.others?.find((o) => String(o.id) === String(msg.senderId))?.username ?? ""
                }
                size={28}
                ringToken="--bg-chat"
              />
            )}
          </span>
        )}

        <div className="group relative min-w-0" style={{ maxWidth: "68%" }}>

          {isMine && !tomb && (
            <div
              className="absolute right-full top-1/2 z-10 flex -translate-y-1/2 items-center pr-1.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
              style={{ gap: 2 }}
            >
              {isText && (
                <button
                  type="button"
                  aria-label="Sửa tin nhắn"
                  title="Sửa tin nhắn"
                  className="flex h-7 w-7 items-center justify-center"
                  style={{
                    border: "none",
                    background: "none",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => {
                    setDraft(msg.content ?? "");
                    setEditing(true);
                  }}
                >
                  <PencilSimple size={14} weight="regular" />
                </button>
              )}
              <button
                type="button"
                aria-label="Xóa tin nhắn"
                title="Xóa tin nhắn"
                className="flex h-7 w-7 items-center justify-center"
                style={{
                  border: "none",
                  background: "none",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-secondary)",
                }}
                onClick={() => setDeleting(true)}
              >
                <Trash size={14} weight="regular" />
              </button>
            </div>
          )}

          {tomb ? (

            <div
              role="status"
              style={{
                background: "transparent",
                border: "1px dashed var(--border)",
                color: "var(--text-secondary)",
                borderRadius: isMine ? "10px 10px 4px 10px" : "10px 10px 10px 4px",
                padding: "7px 12px",
                fontSize: "13px",
                fontStyle: "italic",
              }}
            >
              {tomb.byMe ? "Bạn đã xóa một tin nhắn" : `${tomb.deleterName} đã xóa một tin nhắn`}
            </div>
          ) : (
            <div
              style={{
                minWidth: 42,
                background: isMine ? "var(--bubble-me-bg)" : "var(--bubble-them-bg)",
                color: isMine ? "var(--bubble-me-text)" : "var(--bubble-them-text)",
                border: `1px solid ${isMine ? "var(--bubble-me-border)" : "var(--bubble-them-border)"}`,
                borderRadius: isMine ? "10px 10px 4px 10px" : "10px 10px 10px 4px",
                padding: attachment ? "6px" : "7px 12px",
                fontSize: "13px",
                lineHeight: "1.45",
                overflowWrap: "anywhere",
                whiteSpace: attachment ? "normal" : "pre-wrap",
              }}
            >
              {attachment ? (
                isImage && attachment.contentType ? (
                  attachment.downloadUrl ? (
                    <AttachmentImage
                      attachment={attachment}
                      alt={attachment.filename}
                      onOpenFull={onViewFull}
                    />
                  ) : (
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Ảnh: {attachment.filename}
                    </span>
                  )
                ) : (
                  <FileCard
                    attachment={attachment}
                    downloadable={canDownload}
                    onErrorFlash={flashError}
                  />
                )
              ) : (
                msg.content
              )}
            </div>
          )}
        </div>
      </div>

      {metaRow}

      {viewer && attachment?.downloadUrl && (
        <ImageViewer attachment={attachment} onClose={() => setViewer(false)} />
      )}

      <ConfirmDialog
        open={deleting}
        title="Xóa tin nhắn?"
        description={`"${(msg.content ?? "").slice(0, 60)}" sẽ bị xóa vĩnh viễn — kèm cả tệp đính kèm nếu có, không thể hoàn tác.`}
        confirmLabel="Xóa"
        action={async () => {
          try {
            await useChat.getState().deleteMessage(conv.id, msg.id);
          } catch (e) {
            flashError(e.message || "Không xóa được tin nhắn.");
          }
        }}
        onClose={() => setDeleting(false)}
      />
    </div>
  );
}

function withClusterFlags(list) {
  return list.map((msg, i) => {
    const prev = list[i - 1];
    const next = list[i + 1];
    const inClusterPrev =
      prev &&
      prev.senderId === msg.senderId &&
      new Date(msg.createdAt) - new Date(prev.createdAt) <= CLUSTER_WINDOW_MS;
    const inClusterNext =
      next &&
      next.senderId === msg.senderId &&
      new Date(next.createdAt) - new Date(msg.createdAt) <= CLUSTER_WINDOW_MS;
    return {
      msg,
      spacingTop: inClusterPrev ? 2 : 10,
      showMeta: !inClusterNext,
    };
  });
}

export default function MessageList({
  conv,
  messagesEntry,
  myId,
  onLoadOlder,
}) {
  const scrollerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const anchorRef = useRef(null);
  const fetchingRef = useRef(false);

  const list = messagesEntry?.list ?? [];
  const hasMore = messagesEntry?.hasMore ?? false;
  const loadingOlder = messagesEntry?.loadingOlder ?? false;

  useEffect(() => {
    if (anchorRef.current) return;
    const el = scrollerRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [list]);

  useEffect(() => {
    if (messagesEntry?.status === "ready") {
      nearBottomRef.current = true;
      const el = scrollerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messagesEntry?.status]);

  useEffect(() => {
    if (!anchorRef.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const { height, top } = anchorRef.current;
    anchorRef.current = null;
    el.scrollTop = el.scrollHeight - height + top;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, [list]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;

    if (
      el.scrollTop <= SCROLL_EDGE &&
      hasMore &&
      !loadingOlder &&
      !fetchingRef.current &&
      messagesEntry?.status === "ready"
    ) {
      fetchingRef.current = true;
      anchorRef.current = { height: el.scrollHeight, top: el.scrollTop };
      Promise.resolve(onLoadOlder(conv.id)).finally(() => {
        fetchingRef.current = false;
      });
    }
  }

  if (messagesEntry == null || messagesEntry.status === "loading") {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: "var(--bg-chat)" }}
        aria-busy="true"
      >
        <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Đang tải tin nhắn…
        </p>
      </div>
    );
  }

  if (messagesEntry.status === "error") {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: "var(--bg-chat)" }}
        role="alert"
      >
        <p className="m-0" style={{ fontSize: "13px", color: "var(--destructive)" }}>
          {messagesEntry.error || "Không tải được tin nhắn."}
        </p>
      </div>
    );
  }

  const rows = withClusterFlags(list);

  return (
    <div
      ref={scrollerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
      style={{ background: "var(--bg-chat)" }}
      role="log"
      aria-label="Cuộc trò chuyện"
      aria-live="polite"
    >
      {loadingOlder && (
        <p className="m-0 py-2 text-center" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Đang tải tin nhắn cũ…
        </p>
      )}

      {rows.length === 0 ? (
        <div className="flex h-full items-center justify-center" role="status">
          <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Chưa có tin nhắn nào — gửi lời chào đầu tiên
          </p>
        </div>
      ) : (
        rows.map(({ msg, spacingTop, showMeta }) => (
          <BubbleRow
            key={msg.id}
            msg={msg}
            conv={conv}
            myId={myId}
            spacingTop={spacingTop}
            showMeta={showMeta}
          />
        ))
      )}
    </div>
  );
}

export { MAX_FILE_BYTES, formatBytes, triggerDownload };
