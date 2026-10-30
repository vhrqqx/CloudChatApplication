import { useEffect, useRef, useState } from "react";
import {
  FileText, FilePdf, FileDoc, FileXls, FilePpt, FileCode,
  FileArchive, FileAudio, FileVideo, Image as ImageIcon,
  DownloadSimple,
  PencilSimple, ArrowUUpLeft, CrownSimple, ShareFat,
  Trash,
  X,
} from "@phosphor-icons/react";
import { stickerOf } from "../../data/stickers.js";
import NebulaCard, { ForwardPicker } from "../nebula/NebulaCard.jsx";
import { useNebula, hierarchy, memberName } from "../../store/nebula.js";
import { nebulaMessage, nebulaPreview } from "../../lib/nebula.js";
import ReplyContent from "./ReplyContent.jsx";
import { parseReply, replyExcerpt } from "../../lib/reply.js";
import { mentionParts } from "../../lib/mentions.js";
import { beginForward, endForward } from "../../lib/forward.js";
import { useAuth } from "../../store/auth.js";
import Avatar from "../Avatar.jsx";
import Dialog from "../Dialog.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import { apiBinary } from "../../lib/api.js";
import { formatBubbleTime } from "../../lib/time.js";
import { useChat, attachmentNameOf, attachmentOfMessage } from "../../store/chat.js";
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
const imageRequests = new Map();
function imageBlob(attachmentId) {
  const key = String(attachmentId);
  if (thumbCache.has(key)) return Promise.resolve(thumbCache.get(key));
  if (!imageRequests.has(key)) imageRequests.set(key, apiBinary(`/attachment/${key}/download`).then((blob) => {
    const url = URL.createObjectURL(blob); thumbCache.set(key, url); imageRequests.delete(key); return url;
  }).catch((error) => { imageRequests.delete(key); throw error; }));
  return imageRequests.get(key);
}
function getFileIconAndColor(fileName, contentType = '') {
  const ext = String(fileName ?? '').split('.').pop().toLowerCase();
  const images = ['jpg','jpeg','png','webp','gif','bmp','svg','heic'];
  const videos = ['mp4','mov','avi','mkv','webm','m4v','mpeg','mpg'];
  const audios = ['mp3','wav','ogg','m4a','aac','flac','opus'];
  const archives = ['zip','rar','7z','tar','gz','bz2','xz'];
  const code = ['js','ts','jsx','tsx','py','java','c','cpp','html','css','json','xml','sql'];
  const text = ['txt','csv','rtf','md'];
  if (/^image\//i.test(contentType) || images.includes(ext)) return { label:'ẢNH', type:'Hình ảnh', color:'#3B82F6', Icon:ImageIcon, image:true };
  if (videos.includes(ext) || /^video\//i.test(contentType)) return { label:'VIDEO', type:'Video', color:'#E11D48', Icon:FileVideo };
  if (audios.includes(ext) || /^audio\//i.test(contentType)) return { label:'AUDIO', type:'Âm thanh', color:'#9333EA', Icon:FileAudio };
  if (archives.includes(ext)) return { label:'ZIP', type:'Tệp nén', color:'#7C3AED', Icon:FileArchive };
  if (code.includes(ext)) return { label:'CODE', type:'Mã nguồn', color:'#0D9488', Icon:FileCode };
  if (text.includes(ext)) return { label:'TXT', type:'Văn bản', color:'#0D9488', Icon:FileCode };
  if (['doc','docx'].includes(ext)) return { label:'DOC', type:'Word', color:'#3B82F6', Icon:FileDoc };
  if (ext === 'pdf') return { label:'PDF', type:'PDF', color:'#F97316', Icon:FilePdf };
  if (['xls','xlsx'].includes(ext)) return { label:'XLS', type:'Excel', color:'#22C55E', Icon:FileXls };
  if (['ppt','pptx'].includes(ext)) return { label:'PPT', type:'PowerPoint', color:'#F59E0B', Icon:FilePpt };
  if (['odt','ods'].includes(ext)) return { label:ext.toUpperCase(), type:'Tài liệu', color:'#6B7280', Icon:FileText };
  return { label:(ext.slice(0,4)||'FILE').toUpperCase(), type:contentType || 'Tệp', color:'#6B7280', Icon:FileText };
}
const typeInfo = getFileIconAndColor;

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

function AttachmentImage({ attachment, alt, onOpenFull, onDownload }) {
  const [src, setSrc] = useState(thumbCache.get(attachment.id) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (thumbCache.has(attachment.id)) {
      setSrc(thumbCache.get(attachment.id));
      return;
    }
    let alive = true;
    imageBlob(attachment.id)
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attachment.id]);

  if (failed) {
    return <FileCard attachment={attachment} downloadable={false} />;
  }
  return (
    <span className="ux-image-wrap">
      <button type="button" className="block cursor-zoom-in" onClick={onOpenFull} aria-label={`Xem ảnh lớn: ${alt}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="block"
          style={{
            maxWidth: 280,
            maxHeight: 320,
            border: "1px solid var(--border)",
            borderRadius: 8,
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex items-center justify-center"
          style={{
            width: 220,
            height: 180,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-item-hover)",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          Đang tải ảnh…
        </span>
      )}
      </button>
      <button className="ux-image-download" type="button" aria-label={`Tải ${alt}`} onClick={onDownload}><DownloadSimple size={18} /></button>
    </span>
  );
}

async function triggerDownloadFromAttachment(attachment, onError) {
  try { triggerDownload(await loadBlob(attachment.downloadUrl), attachment.filename); } catch (e) { onError(e.message); }
}

function ImageViewer({ attachment, onClose }) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    imageBlob(attachment.id)
      .then((url) => { if (alive) setSrc(url); })
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
  const info = typeInfo(name, attachment.contentType);
  const Icon = info.Icon;

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
    <span className="chat-file-card">
      <span className="ux-file-icon" style={{ "--file-color": info.color }} aria-label={info.type}>
        <Icon size={20} weight="regular" /><small>{info.label}</small>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate"
          style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}
          title={name}
        >
          {name}
        </span>
        <span
          className="block truncate tnum"
          style={{ fontSize: "11px", color: "var(--text-secondary)" }}
        >
          {info.type}{attachment.size != null ? ` · ${formatBytes(attachment.size)}` : ""}
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
            <DownloadSimple size={18} weight="regular" />
          </button>
        </span>
      )}
    </span>
  );
}

function BubbleRow({ msg, conv, myId, spacingTop, showMeta, onReply, onQuoteJump }) {
  useNebula((s) => s.records);
  const special = nebulaMessage(msg.content);
  const scope = hierarchy(conv.id);
  const leaderMessage = scope.community && String(scope.leaderId) === String(msg.senderId);
  const subgroupTags = scope.community ? scope.children.filter(g => (g.memberIds ?? []).some(id => String(id) === String(msg.senderId))) : [];
  const [forwardOpen, setForwardOpen] = useState(false);
  const isMine = String(msg.senderId) === String(myId);
  const flashError = useUi.getState().flashError;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.content ?? "");
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const taRef = useRef(null);
  const swipe = useRef(null);
  const [offset, setOffset] = useState(0);
  function replyToMessage() {
    if (msg.deletedInfo) return;
    const senderName = String(msg.senderId) === String(myId) ? useAuth.getState().user?.username : useChat.getState().members[String(conv.id)]?.find((u) => String(u.id) === String(msg.senderId))?.username ?? conv.others?.find((u) => String(u.id) === String(msg.senderId))?.username;
    onReply?.({ originalMessageId: msg.id, senderName: senderName ?? 'Người dùng', content: msg.content, attachment: attachmentOfMessage(conv.id, msg) });
  }
  function touchMove(e) {
    if (!swipe.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - swipe.current.x;
    const dy = e.touches[0].clientY - swipe.current.y;
    if (Math.abs(dy) > Math.abs(dx) && !swipe.current.horizontal) { swipe.current = null; setOffset(0); return; }
    if (dx > 8 && Math.abs(dx) > Math.abs(dy)) swipe.current.horizontal = true;
    if (swipe.current.horizontal) { swipe.current.distance = Math.max(0, Math.min(dx, 90)); setOffset(swipe.current.distance); }
  }
  function touchEnd() {
    if ((swipe.current?.distance ?? 0) > 50) replyToMessage();
    swipe.current = null; setOffset(0);
  }

  const members = useChat((s) => s.members[String(conv.id)]);
  const originalUsername = useAuth((s) => s.user?.username);
  const username = memberName(conv.id,myId,originalUsername);
  const quote = parseReply(msg.content);
  const parts = conv.type !== 'GROUP' ? [{ text: quote?.text ?? msg.content ?? '' }] : mentionParts(quote?.text ?? msg.content, [...(members ?? []).flatMap((m) => [m.username, m.username?.replaceAll(' ', '_'), memberName(conv.id,m.id,m.username), memberName(conv.id,m.id,m.username)?.replaceAll(' ', '_')]), ...(conv.type === 'GROUP' ? ['Tất cả'] : [])]);
  const mentioned = conv.type === 'GROUP' && !isMine && parts.some((p) => p.name && [username, username?.replaceAll(' ', '_'), originalUsername, originalUsername?.replaceAll(' ', '_'), ...(conv.type === 'GROUP' ? ['Tất cả'] : [])].includes(p.name));
  const tomb = msg.deletedInfo;
  const attName = attachmentNameOf(msg.content);
  const attachment = attachmentOfMessage(conv.id, msg) ?? (attName ? { filename: attName, size: null, contentType: null, downloadUrl: null } : null);
  const isImage = Boolean(attachment && typeInfo(attachment.filename, attachment.contentType).image);
  const canDownload = Boolean(attachment?.downloadUrl);
  const sticker = stickerOf(msg.content);
  const isText = !attName && !sticker && !special;

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
              borderRadius: "8px 8px 4px 8px",
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
                fontSize: leaderMessage ? "15.5px" : "14px",
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
                name={memberName(conv.id,msg.senderId,conv.others?.find((o) => String(o.id) === String(msg.senderId))?.username ?? '')}
                size={28}
                ringToken="--bg-chat"
              />
            )}
          </span>
        )}

        <div data-message-id={msg.id} className="group relative min-w-0" style={{ width: attachment && !isImage && !sticker ? 340 : undefined, maxWidth: leaderMessage ? "78%" : "68%", transform: `translateX(${offset}px)`, transition: offset ? 'none' : 'transform 180ms ease', touchAction: 'pan-y' }}
          onTouchStart={(e) => { if (!tomb && e.touches.length === 1) swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, distance: 0 }; }} onTouchMove={touchMove} onTouchEnd={touchEnd} onTouchCancel={() => { swipe.current = null; setOffset(0); }}>
          {(scope.community || memberName(conv.id,msg.senderId,null)) && <div className="neb-author"><strong title={(members ?? []).find(m=>String(m.id)===String(msg.senderId))?.username}>{memberName(conv.id,msg.senderId,(members ?? []).find(m=>String(m.id)===String(msg.senderId))?.username??'Thành viên')}</strong>{leaderMessage ? <span className="neb-leader"><CrownSimple size={14} weight="fill"/>Trưởng cộng đồng</span> : subgroupTags.map((g,i)=><span key={g.id} className={i?'neb-dot':'neb-tag'} style={{'--neb-color':g.color}} title={g.title??`Nhóm #${g.roomId}`}>{i?'':g.title??`Nhóm #${g.roomId}`}</span>)}</div>}
          {offset > 0 && <span className="reply-swipe-icon" style={{ opacity: Math.min(offset / 50, 1) }}><ArrowUUpLeft size={14} /></span>}

          {!tomb && (
            <div
              className={`reply-actions absolute ${isMine ? "right-full pr-1.5" : "left-full pl-1.5"} top-1/2 z-10 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100`}
              style={{ gap: 2 }}
            >
              <button type="button" className="reply-action flex h-7 w-7 items-center justify-center" aria-label="Trả lời tin nhắn" title="Trả lời" onClick={replyToMessage}><ArrowUUpLeft size={14} /></button>
              <button type="button" className="reply-action flex h-7 w-7 items-center justify-center" title="Chuyển tiếp" aria-label="Chuyển tiếp" onClick={()=>setForwardOpen(true)}><ShareFat size={16}/></button>
              {isMine && isText && (
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
              {isMine && !special && <button
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
              </button>}
            </div>
          )}

          {tomb ? (

            <div
              role="status"
              style={{
                background: "transparent",
                border: "1px dashed var(--border)",
                color: "var(--text-secondary)",
                borderRadius: isMine ? "8px 8px 4px 8px" : "8px 8px 8px 4px",
                padding: "7px 12px",
                fontSize: "13px",
                fontStyle: "italic",
              }}
            >
              {tomb.byMe ? "Bạn đã xóa một tin nhắn" : `${tomb.deleterName} đã xóa một tin nhắn`}
            </div>
          ) : (
            <div
              draggable
              onDragStart={(e) => beginForward(e, msg, conv)}
              onDragEnd={endForward}
              style={{
                minWidth: 42,
                background: (isImage || sticker) ? "transparent" : isMine ? "var(--bubble-me-bg)" : "var(--bubble-them-bg)",
                color: isMine ? "var(--bubble-me-text)" : "var(--bubble-them-text)",
                border: (isImage || sticker) ? "none" : `1px solid ${isMine ? "var(--bubble-me-border)" : "var(--bubble-them-border)"}`,
                borderRadius: (isImage || sticker) ? 0 : isMine ? "8px 8px 4px 8px" : "8px 8px 8px 4px",
                borderLeft: leaderMessage ? "2px solid #F59E0B" : subgroupTags[0] ? `3px solid ${subgroupTags[0].color}` : mentioned ? "2px solid var(--accent)" : undefined,
                outline: leaderMessage && !sticker && !isImage ? "1px solid #F59E0B" : undefined,
                padding: special ? 0 : (isImage || sticker) ? 0 : leaderMessage ? "12px 16px" : attachment ? "6px" : "7px 12px",
                fontWeight: leaderMessage ? 600 : undefined,
                fontSize: leaderMessage ? "15.5px" : "14px",
                lineHeight: "1.45",
                overflowWrap: "anywhere",
                whiteSpace: attachment ? "normal" : "pre-wrap",
              }}
            >
              {quote && <button type="button" className="reply-quote" onClick={() => onQuoteJump(quote.originalMessageId)} title="Xem tin nhắn gốc"><strong className="block truncate">{quote.senderName}</strong><ReplyContent reply={quote} conversationId={conv.id} /></button>}
              {special ? <NebulaCard message={msg} parsed={special} conv={conv}/> : sticker ? <img src={sticker.src} alt={sticker.name} title={sticker.name} width={128} height={128} className="chat-sticker" /> : attachment ? (
                isImage ? (
                  attachment.downloadUrl ? (
                    <AttachmentImage
                      attachment={attachment}
                      alt={attachment.filename}
                      onOpenFull={onViewFull}
                      onDownload={() => triggerDownloadFromAttachment(attachment, flashError)}
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
                nebulaPreview(msg.content) ? nebulaPreview(msg.content) : parts.map((p, i) => p.name ? <strong key={i} className="m9-mention">{p.text}</strong> : p.text)
              )}
            </div>
          )}
        </div>
      </div>

      {metaRow}

      {forwardOpen && <ForwardPicker msg={msg} conv={conv} onClose={()=>setForwardOpen(false)}/>}
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
  onReply,
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

  async function jumpToMessage(id) {
    const find = () => scrollerRef.current?.querySelector(`[data-message-id="${Number(id)}"]`);
    let target = find();
    try {
      while (!target && useChat.getState().messages[String(conv.id)]?.hasMore) {
        if (!await onLoadOlder(conv.id)) break;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        target = find();
      }
      if (!target) { useUi.getState().flashError('Tin nhắn gốc đã bị xóa hoặc không còn trong lịch sử.'); return; }
      nearBottomRef.current = false;
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      target.classList.remove('reply-highlight');
      requestAnimationFrame(() => target.classList.add('reply-highlight'));
      setTimeout(() => target.classList.remove('reply-highlight'), 1600);
    } catch (e) { useUi.getState().flashError(e.message); }
  }

  useEffect(() => {
    const jump = (event) => { if (String(event.detail?.conversationId) === String(conv.id)) jumpToMessage(event.detail.messageId); };
    window.addEventListener('cloudchat:jump-message', jump);
    return () => window.removeEventListener('cloudchat:jump-message', jump);
  }, [conv.id]);

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

  const rows = withClusterFlags(list.filter(m => !nebulaMessage(m.content)?.hidden));

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
            onReply={onReply}
            onQuoteJump={jumpToMessage}
            spacingTop={spacingTop}
            showMeta={showMeta}
          />
        ))
      )}
    </div>
  );
}

export { MAX_FILE_BYTES, formatBytes, triggerDownload, ImageViewer, loadBlob, FileCard, typeInfo, getFileIconAndColor, imageBlob };
