import { create } from "zustand";
import { api } from "../lib/api.js";
import { useChat } from "./chat.js";

export const useFriends = create((set, get) => ({
  status: "idle",
  error: null,
  friends: [],
  incoming: [],
  outgoing: [],
  loadedOnce: false,

  relation(userId) {
    const uid = String(userId);
    if (get().friends.some((f) => String(f.userId) === uid)) return "friends";
    if (get().outgoing.some((r) => String(r.otherId) === uid)) return "outgoing";
    if (get().incoming.some((r) => String(r.otherId) === uid)) return "incoming";
    return "none";
  },

  async load() {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const data = await api("/friend-request");
      set({
        friends: data?.friends ?? [],
        incoming: data?.incoming ?? [],
        outgoing: data?.outgoing ?? [],
        status: "ready",
        loadedOnce: true,
      });
    } catch (e) {
      set({ status: "error", error: e.message });
    }
  },

  async send(receiverId, sourceConversationId) {
    const requestId = await api("/friend-request", {
      method: "POST",
      body: { receiverId, sourceConversationId: sourceConversationId ?? null },
    });

    set((s) => ({
      outgoing: [
        {
          requestId: typeof requestId === "string" ? Number(requestId) : requestId,
          otherId: receiverId,
          otherName: s.friends.find((f) => String(f.userId) === String(receiverId))?.username ?? "",
          createdAt: new Date().toISOString(),
        },
        ...s.outgoing,
      ],
    }));
    return requestId;
  },

  async accept(requestId) {
    await api(`/friend-request/${requestId}/accept`, { method: "POST" });
    await useChat.getState().load();

    const req = get().incoming.find((r) => r.requestId === requestId);
    set((s) => ({
      incoming: s.incoming.filter((r) => r.requestId !== requestId),
      friends:
        req && !s.friends.some((f) => String(f.userId) === String(req.otherId))
          ? [...s.friends, { userId: req.otherId, username: req.otherName }]
          : s.friends,
    }));
  },

  async unfriend(userId) {
    await api(`/friend-request/friend/${userId}`, { method: "DELETE" });
    set((s) => ({ friends: s.friends.filter((f) => String(f.userId) !== String(userId)) }));
  },

  async decline(requestId) {
    await api(`/friend-request/${requestId}/decline`, { method: "POST" });
    set((s) => ({ incoming: s.incoming.filter((r) => r.requestId !== requestId) }));
  },

  async cancel(requestId) {
    await api(`/friend-request/${requestId}`, { method: "DELETE" });
    set((s) => ({ outgoing: s.outgoing.filter((r) => r.requestId !== requestId) }));
  },

  reset() {
    set({ status: "idle", error: null, friends: [], incoming: [], outgoing: [], loadedOnce: false });
  },

  applyEvent(ev) {
    if (!ev || ev.targetId == null) return;
    const myId = String(useAuthId());
    if (String(ev.targetId) !== myId) return;

    if (ev.kind === "removed") {
      set((s) => ({ friends: s.friends.filter((f) => String(f.userId) !== String(ev.friendId)) }));
    } else if (ev.kind === "request") {
      set((s) => ({
        incoming: [
          {
            requestId: ev.requestId,
            otherId: ev.senderId,
            otherName: ev.senderName,
            sourceConversationId: ev.sourceConversationId ?? null,
            sourceName: ev.sourceName ?? null,
            createdAt: ev.createdAt ?? new Date().toISOString(),
          },
          ...s.incoming.filter((r) => String(r.otherId) !== String(ev.senderId)),
        ],
      }));
    } else if (ev.kind === "accepted") {
      const friendId = ev.friendId;
      set((s) => ({
        friends: s.friends.some((f) => String(f.userId) === String(friendId))
          ? s.friends
          : [...s.friends, { userId: friendId, username: ev.friendName }],
        incoming: s.incoming.filter(
          (r) => String(r.otherId) !== String(friendId) && r.requestId !== ev.requestId,
        ),
        outgoing: s.outgoing.filter(
          (r) => String(r.otherId) !== String(friendId) && r.requestId !== ev.requestId,
        ),
      }));
    } else if (ev.kind === "declined") {
      set((s) => ({
        outgoing: s.outgoing.filter((r) => r.requestId !== ev.requestId),
      }));
    } else if (ev.kind === "cancelled") {
      set((s) => ({
        incoming: s.incoming.filter((r) => r.requestId !== ev.requestId),
      }));
    }
  },
}));

function useAuthId() {
  try {
    const store = userStoreRef;
    return store?.getState?.()?.user?.id ?? null;
  } catch {
    return null;
  }
}

let userStoreRef = null;

export function setAuthRef(authStore) {
  userStoreRef = authStore;
}
