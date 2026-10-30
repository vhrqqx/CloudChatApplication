import { useEffect, useState } from 'react';
import { X, Bell, WarningCircle, Check } from '@phosphor-icons/react';
import { useNotifications } from '../store/notifications.js';
import { useChat } from '../store/chat.js';
export default function ToastStack() {
  const toasts = useNotifications((s) => s.toasts);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const expanded = hover || focus;
  useEffect(() => {
    if (expanded || !toasts.length) return;
    let last = Date.now();
    const timer = setInterval(() => { const now = Date.now(); useNotifications.getState().tick(now - last); last = now; }, 100);
    return () => clearInterval(timer);
  }, [expanded, toasts.length]);
  return <div className="ux-toast-stack" data-expanded={expanded} aria-label="Thông báo mới" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocusCapture={() => setFocus(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocus(false); }} style={{ height: toasts.length ? (expanded ? toasts.length * 94 - 6 : 88 + (toasts.length - 1) * 8) : 0 }}>
    {toasts.map((t, i) => <div key={t.toastId} className="ux-toast" role={t.kind === 'error' ? 'alert' : 'status'} style={{ zIndex: 3 - i, transform: `translateY(-${i * (expanded ? 94 : 8)}px) scale(${expanded ? 1 : 1 - i * .04})` }}>
      {t.kind === 'error' ? <WarningCircle size={20} /> : t.kind === 'success' ? <Check size={20} /> : <Bell size={20} />}
      <button className="ux-toast-content" disabled={!t.conversationId} onClick={() => { useChat.getState().select(t.conversationId); useNotifications.getState().read(t.id); useNotifications.getState().dismiss(t.toastId); }}><strong>{t.text}</strong>{t.detail && <span>{t.detail}</span>}</button>
      <button className="ux-close" aria-label="Đóng thông báo" onClick={() => useNotifications.getState().dismiss(t.toastId)}><X size={14} /></button>
    </div>)}
  </div>;
}
