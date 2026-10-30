import { nebulaPreview, nebulaMessage } from "../lib/nebula.js";
import { isAccountRestricted } from "./accountPolicies.js";
import { stickerOf } from "../data/stickers.js";
import { parseReply } from "../lib/reply.js";
import { create } from "zustand";
import { api, uploadFile } from "../lib/api.js";
import { useAuth } from "./auth.js";
import { syncConversations } from "../lib/ws.js";

const PAGE_SIZE = 50;
let conversationsLoading = null;
const directRequests = new Map();
function uniqueConversations(items) {
  const sorted = [...items].sort((a, b) => Number(Boolean(b.preview)) - Number(Boolean(a.preview)) || new Date(b.previewAt ?? b.createdAt) - new Date(a.previewAt ?? a.createdAt));
  const seen = new Set();
  return sorted.filter((item) => {
    const key = item.type === 'DIRECT' && item.others?.length === 1 ? `direct:${item.others[0].id}` : `id:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => new Date(b.previewAt ?? b.createdAt) - new Date(a.previewAt ?? a.createdAt));
}
const ATTACHMENT_CACHE_KEY = "cloudchat-attachment-map-v1";
let attachmentMap;

function getAttachmentMap() {
  if (attachmentMap) return attachmentMap;
  try {
    attachmentMap = JSON.parse(localStorage.getItem(ATTACHMENT_CACHE_KEY) || "{}");
  } catch {
    attachmentMap = {};
  }
  attachmentMap.byMessage ??= {};
  attachmentMap.byName ??= {};
  return attachmentMap;
}

function saveAttachmentMap() {
  try { localStorage.setItem(ATTACHMENT_CACHE_KEY, JSON.stringify(getAttachmentMap())); } catch {}
}

function attachmentRecord(conversationId, messageId, metadata, filename, createdAt) {
  if (!metadata?.id || !filename) return;
  const record = {
    id: metadata.id,
    filename: metadata.filename || filename,
    contentType: metadata.contentType || "",
    size: metadata.size ?? null,
    downloadUrl: metadata.downloadUrl || `/api/v1/attachment/${metadata.id}/download`,
    conversationId: String(conversationId),
    messageId: messageId == null ? null : String(messageId),
    savedAt: Date.now(),
    createdAt: createdAt || null,
  };
  const map = getAttachmentMap();
  if (record.messageId) map.byMessage[`${record.conversationId}:${record.messageId}`] = record;
  map.byName[`${record.conversationId}:${filename}`] = record;
  saveAttachmentMap();
  return record;
}

export function attachmentOfMessage(conversationId, message) {
  if (!message) return null;

  const filename = message.filename ?? message.attachment?.filename ?? attachmentNameOf(message.content);
  const directId = message.attachment?.id ?? message.attachmentId;
  if (directId) return {
    id: directId,
    filename: message.attachment?.filename ?? message.filename ?? filename,
    contentType: message.attachment?.contentType ?? message.contentType ?? "",
    size: message.attachment?.size ?? message.size ?? null,
    downloadUrl: message.attachment?.downloadUrl ?? message.downloadUrl ?? `/api/v1/attachment/${directId}/download`,
  };
  if (!filename) return message.attachment ?? null;

  const map = getAttachmentMap();
  const messageKey = `${String(conversationId)}:${String(message.id)}`;
  let record = map.byMessage[messageKey];
  if (!record) {
    const byName = map.byName[`${String(conversationId)}:${filename}`];
    if (byName) {
      const createdAt = message.createdAt ? new Date(message.createdAt).getTime() : NaN;
      const savedAt = Number(byName.savedAt);
      const nearUpload = !Number.isFinite(createdAt) || Math.abs(createdAt - savedAt) < 10 * 60 * 1000;
      if (nearUpload) record = byName;
    }
  }
  if (!record?.id) return message.attachment ?? null;
  if (message.id != null) map.byMessage[messageKey] = { ...record, messageId: String(message.id) };
  saveAttachmentMap();
  return record;
}

function hydrateMessage(conversationId, message) {
  const attachment = attachmentOfMessage(conversationId, message);
  return attachment ? { ...message, attachment } : message;
}

export const ATTACHMENT_PREFIX = "[File:";
export function attachmentNameOf(content) {
  if (typeof content !== "string") return null;
  if (!content.startsWith(ATTACHMENT_PREFIX) || !content.endsWith("]")) return null;
  const name = content.slice(ATTACHMENT_PREFIX.length, -1);
  return name || null;
}

function messagePreview(message) {
  if (!message) return null;
  const special = nebulaPreview(message.content); if (special) return special;
  const sticker = stickerOf(message.content);
  if (sticker) return `[Hình động] ${sticker.name}`;
  const reply = parseReply(message.content);
  if (reply) return reply.text;
  const filename = message.filename ?? message.attachment?.filename ?? attachmentNameOf(message.content);
  const isImage = /^image\//i.test(message.contentType ?? message.attachment?.contentType ?? "") ||
    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(filename ?? "");
  return isImage ? "[Hình ảnh]" : message.content;
}

export const useChat = create((set, get) => ({
  status: "idle",
  error: null,
  items: [],
  selectedId: null,
  secondaryId: null,
  splitOpen: false,
  openSecondary(id) { set({ secondaryId: id, splitOpen: true }); },
  swapPanes() { set((s) => s.secondaryId == null ? {} : ({ selectedId: s.secondaryId, secondaryId: s.selectedId })); },
  replacePane(secondary, id) { set((s) => secondary ? ({ secondaryId: id, selectedId: String(s.selectedId) === String(id) ? s.secondaryId : s.selectedId }) : ({ selectedId: id, secondaryId: String(s.secondaryId) === String(id) ? s.selectedId : s.secondaryId })); },
  closeSplit() { set({ secondaryId: null, splitOpen: false }); },
  messages: {},
  members: {},

  select(id) {
    set((s) => ({ selectedId: id, secondaryId: String(s.secondaryId) === String(id) ? null : s.secondaryId }));
  },

  reset() {
    set({ status: "idle", error: null, items: [], selectedId: null, secondaryId: null, splitOpen: false, messages: {}, members: {} });
  },

  async load() {
    if (conversationsLoading) return conversationsLoading;
    set({ status: "loading", error: null });
    conversationsLoading = (async () => {
      try {
        const all = [];
        for (let page = 0; ; page++) {
          const result = await api(`/conversation?page=${page}&size=100&sort=createdAt,desc`);
          const rows = result?.content ?? [];
          all.push(...rows);
          if (rows.length < 100 || result?.page?.totalPages <= page + 1) break;
        }
        syncConversations(all.map((c) => c.id));
        const hydrated = await Promise.all(all.map(async (c) => {
          const [members, history] = await Promise.all([api(`/conversation-member?conversationId=${c.id}`), api(`/message?conversationId=${c.id}&page=0&size=1`)]);
          const others = (members ?? []).filter((m) => String(m.id) !== String(useAuth.getState().user?.id));
          return { id: c.id, type: c.conversationType, createdAt: c.createdAt, members, others,
            title: c.title, displayName: c.title || others.map((m) => m.username).join(', ') || 'Bạn', membersCount: members.length,
            role: members.find((m) => String(m.id) === String(useAuth.getState().user?.id))?.role,
            preview: messagePreview(history?.content?.[0]), previewAt: history?.content?.[0]?.createdAt ?? c.createdAt };
        }));
        set((state) => {
          const items = uniqueConversations(hydrated.map((c) => ({ ...c, unreadCount: state.items.find((i) => String(i.id) === String(c.id))?.unreadCount ?? 0 })));
          const canonical = (id) => {
            const previous = state.items.find((i) => String(i.id) === String(id));
            return previous?.type === 'DIRECT' ? items.find((i) => i.type === 'DIRECT' && String(i.others?.[0]?.id) === String(previous.others?.[0]?.id))?.id ?? id : id;
          };
          return { items, status: 'ready', selectedId: canonical(state.selectedId), secondaryId: canonical(state.secondaryId), members: { ...state.members, ...Object.fromEntries(hydrated.map((c) => [String(c.id), c.members])) } };
        });
      } catch (e) { set({ status: 'error', error: e.message }); throw e; }
    })();
    try { return await conversationsLoading; } finally { conversationsLoading = null; }
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
              : it.title || (others.length
                ? others.map((o) => o.username).join(", ")
                : "Bạn"),
        };
        if (last !== undefined) {
          next.preview = messagePreview(last);
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
      const list = (page?.content ?? []).map((message) => hydrateMessage(id, message)).slice().reverse();
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
      const older = (page?.content ?? []).map((message) => hydrateMessage(id, message)).slice().reverse();
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
      const fresh = (page?.content ?? []).map((message) => hydrateMessage(id, message)).slice().reverse();
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
              ? { ...it, preview: messagePreview(last), previewAt: last.createdAt }
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
        if (!cur?.list) {
          attachmentRecord(id, null, att, att.filename, new Date().toISOString());
          return {};
        }

        const candidates = cur.list.filter(
          (m) => attachmentNameOf(m.content) === att.filename,
        );
        const target = candidates[candidates.length - 1];
        attachmentRecord(id, target?.id, att, att.filename, target?.createdAt ?? new Date().toISOString());
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
                      attachment: attachmentOfMessage(id, { ...m, ...att, attachmentId: att.id }),
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
    if (msg?.conversationId && !get().items.some((c) => String(c.id) === String(msg.conversationId))) {
      get().load().then(() => { if (get().items.some((c) => String(c.id) === String(msg.conversationId))) get().applyIncoming(msg); }).catch(() => {});
    }
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
        s.messages = { ...s.messages, [key]: { ...entry, status: "ready", list } };
      }

      const idx = s.items.findIndex((i) => String(i.id) === key);
      if (idx >= 0) {
        const conv = s.items[idx];
        const unread =
          fromMe || String(s.selectedId) === key || (s.splitOpen && String(s.secondaryId) === key) ? 0 : (conv.unreadCount ?? 0) + 1;
        const updated = { ...conv, preview: messagePreview(msg), previewAt: msg.createdAt, unreadCount: unread };
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

  async openOrCreateDirectConversation(targetUserId) {
    if (isAccountRestricted(targetUserId)) throw new Error("Tài khoản đã bị chặn hoặc ẩn. Hãy quản lý trong Hồ sơ & Cài đặt.");
    const key = String(targetUserId);
    if (directRequests.has(key)) return directRequests.get(key);
    const request = (async () => {
      await get().load();
      const existing = get().items.find((c) => c.type === 'DIRECT' && c.others?.length === 1 && String(c.others[0].id) === key);
      let result = existing;
      if (!result) {
        result = await api('/conversation', { method: 'POST', body: { conversationType: 'DIRECT', memberId: [targetUserId] } });
        await get().load();
      }
      set({ selectedId: result.id });
      return result;
    })();
    directRequests.set(key, request);
    try { return await request; } finally { directRequests.delete(key); }
  },

  async create({ conversationType = "DIRECT", memberId, title }) {
    if (conversationType === 'DIRECT') return get().openOrCreateDirectConversation(memberId[0]);
    const conv = await api("/conversation", {
      method: "POST",
      body: { conversationType, memberId, title },
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
      return { items, messages, members, selectedId: s.selectedId === id ? null : s.selectedId, secondaryId: s.secondaryId === id ? null : s.secondaryId };
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
      return { items, messages, members, selectedId: s.selectedId === id ? null : s.selectedId, secondaryId: s.secondaryId === id ? null : s.secondaryId };
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

  async transferAdmin(id, userId) {
    await api(`/conversation-member/${userId}/transfer-admin?conversationId=${id}`, { method: "PATCH" });
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
