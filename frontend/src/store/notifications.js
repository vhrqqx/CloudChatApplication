import { create } from 'zustand';
let sequence = 0;
export const isCenterNotification = (item) => ['friend', 'accepted', 'mention'].includes(item?.kind);
export const useNotifications = create((set, get) => ({
  items: [], toasts: [],
  push(item, toast = true) {
    if (!isCenterNotification(item)) return;
    const id = item.id ?? `notice-${++sequence}`;
    if (get().items.some((n) => n.id === id)) return;
    const next = { ...item, id, read: false, at: Date.now() };
    set((s) => ({ items: [next, ...s.items].slice(0, 200) }));
    if (toast) get().toast(next);
  },
  toast(item) {
    set((s) => ({ toasts: [{ ...item, toastId: ++sequence, remaining: 4000 }, ...s.toasts].slice(0, 3) }));
  },
  dismiss(id) { set((s) => ({ toasts: s.toasts.filter((n) => n.toastId !== id) })); },
  tick(elapsed) { set((s) => ({ toasts: s.toasts.map((t) => ({ ...t, remaining: t.remaining - elapsed })).filter((t) => t.remaining > 0) })); },
  read(id) { set((s) => ({ items: s.items.map((n) => n.id === id ? { ...n, read: true } : n) })); },
  reconcileRequests(incoming) {
    const ids = new Set(incoming.map((r) => `friend-${r.requestId}`));
    set((s) => ({ items: s.items.map((n) => n.kind === 'friend' && !ids.has(n.id) ? { ...n, resolved: true, read: true } : n) }));
    incoming.forEach((r) => get().push({ id: `friend-${r.requestId}`, kind: 'friend', requestId: r.requestId, text: `${r.otherName} muốn kết bạn với bạn`, sourceName: r.sourceName }, false));
  },
  reset() { set({ items: [], toasts: [] }); },
}));
