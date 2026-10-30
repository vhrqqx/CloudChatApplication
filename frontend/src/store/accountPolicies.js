import { create } from 'zustand';
import { api } from '../lib/api.js';
export const useAccountPolicies = create((set) => ({
  items: [],
  async load() { const items = await api('/account-policy'); set({ items: items ?? [] }); },
  async update(userId, values) {
    const result = await api(`/account-policy/${userId}`, { method: 'PATCH', body: values });
    set((s) => ({ items: [...s.items.filter((p) => String(p.targetId) !== String(userId)), result] }));
  },
  reset() { set({ items: [] }); },
}));
export function isAccountRestricted(userId) {
  return useAccountPolicies.getState().items.some((p) => String(p.targetId) === String(userId) && (p.hidden || p.blocked));
}
