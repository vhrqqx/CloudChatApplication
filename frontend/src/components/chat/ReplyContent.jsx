import { useEffect, useState } from 'react';
import { stickerOf } from '../../data/stickers.js';
import { api, apiBinary } from '../../lib/api.js';
import { replyExcerpt, parseReply } from '../../lib/reply.js';
import { useChat, attachmentOfMessage } from '../../store/chat.js';

const thumbnailRequests = new Map();
function thumbnail(id) {
  if (!thumbnailRequests.has(String(id))) thumbnailRequests.set(String(id), apiBinary(`/attachment/${id}/download`).then((blob) => URL.createObjectURL(blob)).catch((e) => { thumbnailRequests.delete(String(id)); throw e; }));
  return thumbnailRequests.get(String(id));
}

export default function ReplyContent({ reply, conversationId }) {
  const original = useChat((s) => s.messages[String(conversationId)]?.list.find((m) => String(m.id) === String(reply.originalMessageId)));
  const [fetched, setFetched] = useState(null);
  const [src, setSrc] = useState(null);
  const value = parseReply(original?.content ?? fetched?.content)?.text ?? original?.content ?? fetched?.content ?? reply.content;
  const sticker = stickerOf(value);
  const imageToken = /^\[QuoteImage:(\d+):([^\]]*)\]$/.exec(reply.content ?? '');
  const attachment = reply.attachment ?? attachmentOfMessage(conversationId, original ?? fetched);
  const isImage = attachment && (/^image\//i.test(attachment.contentType ?? '') || /\.(jpe?g|png|gif|webp|bmp|svg|heic)$/i.test(attachment.filename ?? ''));
  const imageId = imageToken?.[1] ?? (isImage ? attachment.id : null);
  useEffect(() => {
    let alive = true; setFetched(null);
    if (!original && !stickerOf(reply.content) && !imageToken && /^\[(Nhãn dán|File:|Tệp:)/.test(reply.content ?? '')) {
      api(`/message/${reply.originalMessageId}?conversationId=${conversationId}`).then((m) => { if (alive) setFetched(m); }).catch(() => {});
    }
    return () => { alive = false; };
  }, [reply.originalMessageId, reply.content, conversationId, original]);
  useEffect(() => {
    let alive = true; setSrc(null);
    if (imageId) thumbnail(imageId).then((url) => { if (alive) setSrc(url); }).catch(() => {});
    return () => { alive = false; };
  }, [imageId]);
  let filename = attachment?.filename ?? '';
  if (imageToken) { try { filename = decodeURIComponent(imageToken[2]); } catch { filename = 'Hình ảnh'; } }
  return <span className="reply-media-content">
    {sticker ? <><img src={sticker.src} alt="" width={28} height={28} /><span className="truncate">Nhãn dán: {sticker.name}</span></> : imageId ? <>{src ? <img src={src} alt="" width={28} height={28} /> : <span className="reply-media-loading" aria-hidden="true" />}<span className="truncate">Hình ảnh{filename ? `: ${filename}` : ''}</span></> : <span className="truncate">{replyExcerpt(value) || '[Tin nhắn]'}</span>}
  </span>;
}
