import { create } from "zustand";

const TYPING_TTL = 2500;

export const useUi = create((set) => ({
  wsState: "idle",
  setWsState: (s) => set({ wsState: s }),

  presence: {},
  setPresence: (p) =>
    set((s) => ({
      presence: { ...s.presence, [String(p.userId)]: Boolean(p.online) },
    })),

  typing: {},
  markTyping: (conversationId, userId, displayName) =>
    set((s) => ({
      typing: {
        ...s.typing,
        [String(conversationId)]: {
          ...(s.typing[String(conversationId)] || {}),
          [String(userId)]: { name: displayName, at: Date.now() },
        },
      },
    })),

  isTyping: (convId, userId, now) =>
    Date.now() - (useUi.getState().typing[String(convId)]?.[String(userId)]?.at ?? 0) < TYPING_TTL,
  typingNames: (convId, excludeUserId) => {
    const byUser = useUi.getState().typing[String(convId)] || {};
    const now = Date.now();
    return Object.entries(byUser)
      .filter(([id, v]) => String(id) !== String(excludeUserId) && now - v.at < TYPING_TTL)
      .map(([, v]) => v.name);
  },

  flash: null,
  flashError: (text) => set({ flash: { id: Date.now(), text } }),
  clearFlash: () => set({ flash: null }),
}));
