import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { nebulaMessage, nebulaPreview } from '../lib/nebula.js';
import { stickerOf } from '../data/stickers.js';
import { formatBubbleTime } from '../lib/time.js';
import Avatar from './Avatar.jsx';
import { useAuth } from '../store/auth.js';
import { api } from '../lib/api.js';
import { useChat } from '../store/chat.js';
export default function QuickPeek({ item, anchor, onClose, onOpen }) {
  const myId = useAuth((s) => s.user?.id);
  const [state, setState] = useState({ loading: true, list: [] });
  const [retry, setRetry] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, list: [] });
    api(`/message?conversationId=${item.id}&page=0&size=10`, { signal: controller.signal })
      .then((page) => { if (!controller.signal.aborted) setState({ list: (page?.content ?? []).slice().reverse() }); })
      .catch((e) => { if (!controller.signal.aborted) setState({ list: [], error: e.message }); });
    return () => controller.abort();
  }, [item.id, retry]);
  useEffect(() => {
    const previous = document.activeElement;

    const close = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', onClose);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', key); window.removeEventListener('resize', onClose); previous?.focus?.(); };
  }, [onClose]);
  const left = Math.max(8, Math.min(anchor.right + 4, window.innerWidth - 328));
  const top = Math.max(8, Math.min(anchor.top, window.innerHeight - 388));
  return createPortal(<section ref={ref} tabIndex={-1} role="dialog" aria-label={`Xem nhanh ${item.displayName}`} className="m9-peek ux-hold-peek" style={{ left, top }}>
    <header className="m9-peek-header"><Avatar name={item.displayName} size={32} isGroup={item.type === 'GROUP'} /><div className="min-w-0"><strong className="block truncate">{item.displayName}</strong><small>Chế độ xem nhanh · giữ nguyên chưa đọc</small></div></header>
    <div className="m9-peek-body">
      {state.loading && <p role="status">Đang tải tin nhắn…</p>}
      {state.error && <p role="alert">{state.error} <button onClick={() => setRetry((v) => v + 1)}>Thử lại</button></p>}
      {!state.loading && !state.error && !state.list.length && <p>Chưa có tin nhắn.</p>}
      {state.list.filter(m=>!nebulaMessage(m.content)?.hidden).map((m) => <div key={m.id} className="m9-peek-message" data-sticker={!!stickerOf(m.content)} data-mine={String(m.senderId) === String(myId)}><strong>{useChat.getState().members[String(item.id)]?.find((u) => u.id === m.senderId)?.username ?? 'Người dùng'}</strong><p>{stickerOf(m.content) ? <img src={stickerOf(m.content).src} alt={stickerOf(m.content).name} width={128} height={128} /> : nebulaPreview(m.content) ?? m.content}</p><time style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formatBubbleTime(m.createdAt)}</time></div>)}
    </div>
    <footer className="m9-peek-open">Thả để đóng · Bấm nhanh để mở hội thoại</footer>
  </section>, document.body);
}
