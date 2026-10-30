import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from '@phosphor-icons/react';
import { useNotifications, isCenterNotification } from '../store/notifications.js';
import { useFriends } from '../store/friends.js';
import { useChat } from '../store/chat.js';
import { useUi } from '../store/ui.js';
export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [marking, setMarking] = useState(false);
  const anchor = useRef(null), panel = useRef(null), timers = useRef([]);
  const allItems = useNotifications((s) => s.items);
  const items = allItems.filter(isCenterNotification);
  const incoming = useFriends((s) => s.incoming);
  useEffect(() => { useNotifications.getState().reconcileRequests(incoming); }, [incoming]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const down = (e) => { if (!panel.current?.contains(e.target) && !anchor.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); anchor.current?.focus(); } };
    document.addEventListener('pointerdown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  const unread = items.filter((n) => !n.read).length;
  function markAll() {
    setMarking(true);
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    timers.current.forEach(clearTimeout);
    timers.current = ids.map((id, i) => setTimeout(() => useNotifications.getState().read(id), i * 40));
    timers.current.push(setTimeout(() => setMarking(false), ids.length * 40));
  }
  async function respond(n, accept) {
    if (busy) return;
    setBusy(n.id);
    try { await useFriends.getState()[accept ? 'accept' : 'decline'](n.requestId); useNotifications.getState().read(n.id); useUi.getState().flashSuccess(accept ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời'); }
    catch (e) { useUi.getState().flashError(e.message); }
    finally { setBusy(null); }
  }
  const rows = items.filter((n) => filter === 'all' || (filter === 'friend' ? ['friend', 'accepted'].includes(n.kind) : n.kind === filter));
  return <>
    <button ref={anchor} className="m9-icon relative mt-2" aria-label={`Thông báo — ${unread} chưa đọc`} aria-expanded={open} onClick={() => setOpen((v) => !v)}><Bell size={20} weight={open ? 'fill' : 'regular'} />{unread > 0 && <span className="ux-notice-badge">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && createPortal(<section ref={panel} tabIndex={-1} role="dialog" aria-label="Trung tâm thông báo" className="ux-notice-center">
      <header><strong>Thông báo</strong><button disabled={!unread || marking} onClick={markAll}>Đánh dấu đã đọc</button><button className="ux-close" aria-label="Đóng trung tâm thông báo" onClick={() => { setOpen(false); anchor.current?.focus(); }}><X size={14} /></button></header>
      <div className="m9-tabs" role="tablist" aria-label="Loại thông báo">{[['all','Tất cả'],['mention','Đề cập (@)'],['friend','Kết bạn']].map(([id, text]) => <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>{text}</button>)}</div>
      <div className="ux-notice-list">{!rows.length && <p className="p-3">Chưa có thông báo.</p>}{rows.map((n) => <article className="ux-notice-row" key={n.id} data-read={n.read}>
        <button className="ux-notice-text" onClick={() => { useNotifications.getState().read(n.id); if (n.conversationId) { const s = useChat.getState(); if (s.items.some((c) => c.id === n.conversationId)) { s.select(n.conversationId); setOpen(false); } else useUi.getState().flashError('Bạn không còn truy cập được hội thoại này.'); } }}><strong>{n.text}</strong>{n.sourceName && <span>Thông qua nhóm {n.sourceName}</span>}{n.detail && <span>{n.detail}</span>}<small>{new Date(n.at).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' })}</small></button><span className="ux-unread-dot" aria-label={n.read ? 'Đã đọc' : 'Chưa đọc'} />
        {n.kind === 'friend' && !n.resolved && incoming.some((r) => r.requestId === n.requestId) && <div className="ux-notice-actions"><button disabled={!!busy} onClick={() => respond(n, true)}>Đồng ý</button><button disabled={!!busy} onClick={() => respond(n, false)}>Từ chối</button></div>}
      </article>)}</div>
    </section>, document.body)}
  </>;
}
