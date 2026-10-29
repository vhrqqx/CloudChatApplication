import { create } from "zustand";
import { api, uploadFile } from "../lib/api.js";
import { useAuth } from "./auth.js";
import { syncConversations } from "../lib/ws.js";

const PAGE_SIZE = 50;

export const ATTACHMENT_PREFIX = "[File:";
export function attachmentNameOf(content) {
  if (typeof content !== "string") return null;
  if (!content.startsWith(ATTACHMENT_PREFIX) || !content.endsWith("]")) return null;
  const name = content.slice(ATTACHMENT_PREFIX.length, -1);
  return name || null;
}

export const useChat = create((set, get) => ({
  status: "idle",
  error: null,
  items: [],
  selectedId: null,
  messages: {},
  members: {},

  select(id) {
    set({ selectedId: id });
  },

  reset() {
    set({ status: "idle", error: null, items: [], selectedId: null, messages: {}, members: {} });
  },

  async load() {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const page = await api("/conversation?page=0&size=100&sort=createdAt,desc");
      const base = (page?.content ?? []).map((c) => ({
        id: c.id,
        type: c.conversationType,
        createdAt: c.createdAt,
        displayName: null,
        role: null,
        others: [],
        membersCount: 0,
        preview: null,
        previewAt: c.createdAt,
        unreadCount: 0,
      }));
      base.sort(
        (a, b) =>
          new Date(b.previewAt ?? b.createdAt) - new Date(a.previewAt ?? a.createdAt),
      );
      set({ items: base, status: "ready" });
      await Promise.allSettled(base.map((it) => get().refreshMembers(it.id, { withPreview: true })));

      syncConversations(get().items.map((i) => i.id));
    } catch (e) {
      set({ status: "error", error: e.message });
    }
  },

  patchFromMembers(id, members, last) {
    const myId = useAuth.getState().user?.id;
    const mine = members.find((m) => m.id === myId);
    const others = members
      .filter((m) => m.id !== myId)
      .map((m) => ({ id: m.id, username: m.username }));

    set((s) => ({
      members: { ...s.members, [String(id)]: members },
      items: s.items.map((it) => {
        if (it.id !== id) return it;
        const next = {
          ...it,
          role: mine?.role ?? null,
          membersCount: members.length,
          others,
          displayName:
            it.type === "DIRECT"
              ? others[0] ? (others[0].username ?? "Bạn") : "Bạn"
              : others.length
                ? others.map((o) => o.username).join(", ")
                : "Bạn",
        };
        if (last !== undefined) {
          next.preview = last ? last.content : null;
          next.previewAt = last ? last.createdAt : it.createdAt;
        }
        return next;
      }),
    }));
  },

  async refreshMembers(id, { withPreview = false } = {}) {
    const [membersR, previewR] = await Promise.allSettled([
      api(`/conversation-member?conversationId=${id}`),
      withPreview ? api(`/message?conversationId=${id}&page=0&size=1`) : Promise.resolve(null),
    ]);
    if (membersR.status === "rejected") return;
    const members = membersR.value ?? [];
    const last = previewR.status === "fulfilled" ? (previewR.value?.content?.[0] ?? undefined) : undefined;
    get().patchFromMembers(id, members, last);
  },

  async loadMessages(id) {
    const key = String(id);
    const existing = get().messages[key];
    if (existing?.status === "loading" || existing?.status === "ready") return;
    set((s) => ({
      messages: {
        ...s.messages,
        [key]: { status: "loading", list: existing?.list ?? [] },
      },
    }));
    try {
      const page = await api(`/message?conversationId=${id}&page=0&size=${PAGE_SIZE}`);
      const list = (page?.content ?? []).slice().reverse();
      set((s) => ({
        messages: {
          ...s.messages,
          [key]: {
            status: "ready",
            list,
            hasMore: (page?.content ?? []).length === PAGE_SIZE,
            nextOlderPage: 1,
            loadingOlder: false,
          },
        },
      }));
    } catch (e) {
      set((s) => ({
        messages: {
          ...s.messages,
          [key]: { status: "error", list: existing?.list ?? [], error: e.message },
        },
      }));
    }
  },

  async loadOlder(id) {
    const key = String(id);
    const entry = get().messages[key];
    if (!entry || entry.status !== "ready" || entry.loadingOlder || !entry.hasMore) return false;
    const nextPage = entry.nextOlderPage ?? 1;
    set((s) => ({
      messages: { ...s.messages, [key]: { ...entry, loadingOlder: true } },
    }));
    try {
      const page = await api(`/message?conversationId=${id}&page=${nextPage}&size=${PAGE_SIZE}`);
      const older = (page?.content ?? []).slice().reverse();
      const hasMore = (page?.content ?? []).length === PAGE_SIZE;
      set((s) => {
        const cur = s.messages[key];
        const known = new Set(cur.list.map((m) => m.id));
        const fresh = older.filter((m) => !known.has(m.id));
        return {
          messages: {
            ...s.messages,
            [key]: {
              ...cur,
              list: [...fresh, ...cur.list],
              hasMore,
              nextOlderPage: nextPage + 1,
              loadingOlder: false,
            },
          },
        };
      });
      return true;
    } catch {
      set((s) => ({
        messages: { ...s.messages, [key]: { ...s.messages[key], loadingOlder: false } },
      }));
      return false;
    }
  },

  async refreshLatest(id) {
    const key = String(id);
    const entry = get().messages[key];
    if (entry && (entry.status === "loading" || entry.loadingOlder)) return;

    try {
      const page = await api(`/message?conversationId=${id}&page=0&size=${PAGE_SIZE}`);
      const fresh = (page?.content ?? []).slice().reverse();
      set((s) => {
        const oldList = entry?.list ?? [];

        const meta = new Map(oldList.map((m) => [m.id, m]));
        const seen = new Set();
        const merged = fresh
          .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
          .map((m) => {
            const prev = meta.get(m.id);
            return prev
              ? { ...m, attachment: prev.attachment ?? null, editedAt: prev.editedAt ?? null }
              : m;
          });

        const cur = s.messages[key] ?? {};
        return {
          messages: {
            ...s.messages,
            [key]: {
              ...cur,
              status: "ready",
              list: merged,
              hasMore: cur.hasMore ?? (page?.content ?? []).length === PAGE_SIZE,
              nextOlderPage: cur.nextOlderPage ?? 1,
              loadingOlder: false,
              error: null,
            },
          },
        };
      });

      const last = fresh[fresh.length - 1];
      if (last) {
        set((s) => ({
          items: s.items.map((it) =>
            String(it.id) === key
              ? { ...it, preview: last.content, previewAt: last.createdAt }
              : it,
          ),
        }));
      }
    } catch {

    }
  },

  async sendAttachment(id, file, { onProgress } = {}) {
    const att = await uploadFile(id, file, { onProgress });
    await get().refreshLatest(id);
    if (att?.id) {
      set((s) => {
        const key = String(id);
        const cur = s.messages[key];
        if (!cur?.list) return {};

        const candidates = cur.list.filter(
          (m) =>
            attachmentNameOf(m.content) === att.filename && !m.attachment,
        );
        const target = candidates[candidates.length - 1];
        if (!target) return {};
        return {
          messages: {
            ...s.messages,
            [key]: {
              ...cur,
              list: cur.list.map((m) =>
                m.id === target.id
                  ? {
                      ...m,
                      attachment: {
                        id: att.id,
                        filename: att.filename,
                        contentType: att.contentType,
                        size: att.size,
                        downloadUrl: att.downloadUrl,
                      },
                    }
                  : m,
              ),
            },
          },
        };
      });
    }
    return att;
  },

  async editMessage(id, messageId, content) {
    const res = await api(`/message/${messageId}`, { method: "PATCH", body: { content } });
    const key = String(id);
    set((s) => {
      const cur = s.messages[key];
      if (!cur?.list) return {};
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...cur,
            list: cur.list.map((m) =>
              m.id === messageId
                ? { ...m, content: res?.content ?? content, editedAt: Date.now() }
                : m,
            ),
          },
        },
      };
    });

    set((s) => ({
      items: s.items.map((it) => {
        const list = s.messages[key]?.list ?? [];
        const lastMsg = list[list.length - 1];
        return String(it.id) === key && lastMsg?.id === messageId
          ? { ...it, preview: lastMsg.content }
          : it;
      }),
    }));
    return res;
  },

  async deleteMessage(id, messageId) {
    const myId = useAuth.getState().user?.id;
    const myName = useAuth.getState().user?.username;
    await api(`/message/${messageId}`, { method: "DELETE" });
    this.applyDeleted({
      conversationId: id,
      messageId,
      deleterId: myId,
      deleterName: myName,
    });
  },

  applyDeleted(ev) {
    if (!ev?.messageId || ev?.conversationId == null) return;
    const key = String(ev.conversationId);
    const myId = useAuth.getState().user?.id;
    set((s) => {
      const cur = s.messages[key];
      if (!cur?.list) return {};
      return {
        messages: {
          ...s.messages,
          [key]: {
            ...cur,
            list: cur.list.map((m) =>
              m.id === ev.messageId
                ? {
                    ...m,
                    deletedInfo: {
                      deleterId: ev.deleterId,
                      deleterName: ev.deleterName ?? "",
                      byMe: String(ev.deleterId) === String(myId),
                    },
                  }
                : m,
            ),
          },
        },
      };
    });

    set((s) => {
      const list = s.messages[key]?.list ?? [];
      const lastMsg = list[list.length - 1];
      if (lastMsg?.deletedInfo) {
        return {
          items: s.items.map((it) =>
            String(it.id) === key
              ? { ...it, preview: "Tin nhắn đã thu hồi" }
              : it,
          ),
        };
      }
      return {};
    });
  },

  renameMyself(newName) {
    const prevName = useAuth.getState().user?.username;
    const myId = useAuth.getState().user?.id;
    useAuth.setState({ user: { ...useAuth.getState().user, username: newName } });
    if (prevName == null || prevName === newName) return;
    set((s) => ({
      members: Object.fromEntries(
        Object.entries(s.members).map(([k, list]) => [
          k,
          list.map((m) => (String(m.id) === String(myId) ? { ...m, username: newName } : m)),
        ]),
      ),
      items: s.items.map((it) => {
        const joined = it.others?.map((o) => (String(o.id) === String(myId) ? { ...o, username: newName } : o));
        if (!joined) return it;
        return {
          ...it,
          others: joined,
          displayName:
            it.type === "DIRECT"
              ? joined[0]?.username ?? "Bạn"
              : joined.map((o) => o.username).join(", "),
        };
      }),
    }));
  },

  applyIncoming(msg) {
    if (!msg?.conversationId || !msg?.id) return;
    const key = String(msg.conversationId);
    const myId = useAuth.getState().user?.id;
    const fromMe = String(msg.senderId) === String(myId);

    set((s) => {

      const entry = s.messages[key] ?? { status: "ready", list: [] };
      if (!entry.list.some((m) => m.id === msg.id)) {
        const list = [...entry.list, msg].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
        s.messages = { ...s.messages, [key]: { status: "ready", list } };
      }

      const idx = s.items.findIndex((i) => String(i.id) === key);
      if (idx >= 0) {
        const conv = s.items[idx];
        const unread =
          fromMe || String(s.selectedId) === key ? 0 : (conv.unreadCount ?? 0) + 1;
        const updated = { ...conv, preview: msg.content, previewAt: msg.createdAt, unreadCount: unread };
        const items = [...s.items];
        items.splice(idx, 1);
        items.unshift(updated);
        s.items = items;
      }

      return { messages: s.messages, items: s.items };
    });
  },

  markRead(id) {
    const key = String(id);
    set((s) => ({
      items: s.items.map((it) =>
        String(it.id) === key && it.unreadCount ? { ...it, unreadCount: 0 } : it,
      ),
    }));
  },

  async create({ conversationType = "DIRECT", memberId }) {
    const conv = await api("/conversation", {
      method: "POST",
      body: { conversationType, memberId },
    });
    await get().load();
    if (conv?.id) set({ selectedId: conv.id });
    return conv;
  },

  async remove(id) {
    await api(`/conversation/${id}`, { method: "DELETE" });
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      const messages = { ...s.messages };
      delete messages[String(id)];
      const members = { ...s.members };
      delete members[String(id)];
      return { items, messages, members, selectedId: s.selectedId === id ? null : s.selectedId };
    });
    syncConversations(get().items.map((i) => i.id));
  },

  async leave(id) {
    await api(`/conversation-member/me?conversationId=${id}`, { method: "DELETE" });
    set((s) => {
      const items = s.items.filter((i) => i.id !== id);
      const messages = { ...s.messages };
      delete messages[String(id)];
      const members = { ...s.members };
      delete members[String(id)];
      return { items, messages, members, selectedId: s.selectedId === id ? null : s.selectedId };
    });
    syncConversations(get().items.map((i) => i.id));
  },

  async addMember(id, userId) {
    await api(`/conversation-member?conversationId=${id}`, {
      method: "POST",
      body: { userId },
    });
    await get().refreshMembers(id);
  },

  async changeRole(id, userId, role) {
    await api(`/conversation-member/${userId}?conversationId=${id}`, {
      method: "PATCH",
      body: { role },
    });
    await get().refreshMembers(id);
  },

  async removeMember(id, userId) {
    await api(`/conversation-member/${userId}?conversationId=${id}`, { method: "DELETE" });
    await get().refreshMembers(id);
  },
}));
