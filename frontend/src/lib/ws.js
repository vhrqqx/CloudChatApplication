import { Client } from "@stomp/stompjs";
















const TOPIC_PREFIX = "/topic/conversation/";

const state = {
  client: null,
  started: false,
  convIds: new Set(),
  convSubs: new Map(),
  presenceSub: null,
  contactsSub: null,
  errorsSub: null,
};

const listeners = {
  message: null,
  typing: null,
  presence: null,
  error: null,
  state: null,
  messageDeleted: null,
  contacts: null,
};

export function setWsListeners(handlers) {
  Object.assign(listeners, handlers);
}

function emitState(s) {
  listeners.state?.(s);
}

function routeTopicMessage(conversationId, message) {
  let obj;
  try {
    obj = JSON.parse(message.body);
  } catch {
    return;
  }
  if (obj && obj.kind === "messageDeleted") {

    listeners.messageDeleted?.(obj);
  } else if (obj && "content" in obj && "conversationId" in obj) {
    listeners.message?.(obj);
  } else if (obj && "userId" in obj) {

    listeners.typing?.(Number(conversationId), obj);
  }
}

function subscribeConversation(id) {
  const key = String(id);
  if (!state.convIds.has(key)) state.convIds.add(key);
  if (!state.client?.connected) return;
  state.convSubs.get(key)?.unsubscribe();
  state.convSubs.set(
    key,
    state.client.subscribe(`${TOPIC_PREFIX}${key}`, (m) =>
      routeTopicMessage(key, m),
    ),
  );
}

function unsubscribeConversation(id) {
  const key = String(id);
  state.convSubs.get(key)?.unsubscribe();
  state.convSubs.delete(key);
  state.convIds.delete(key);
}


export function syncConversations(ids = []) {
  const wanted = new Set(ids.map(String));
  for (const id of [...state.convIds]) {
    if (!wanted.has(id)) unsubscribeConversation(id);
  }
  for (const id of wanted) subscribeConversation(id);
}


export function ensureConversation(id) {
  subscribeConversation(id);
}

export function start(token) {
  if (state.started) return;
  state.started = true;
  emitState("connecting");

  const client = new Client({
    brokerURL: `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
    connectHeaders: { Authorization: `Bearer ${token}` },
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: 3000,
    onConnect: () => {
      state.client = client;

      for (const id of state.convIds) subscribeConversation(id);
      state.presenceSub?.unsubscribe?.();
      state.presenceSub = client.subscribe("/topic/presence", (m) => {
        try {
          listeners.presence?.(JSON.parse(m.body));
        } catch {

        }
      });
      state.contactsSub?.unsubscribe?.();
      state.contactsSub = client.subscribe("/topic/contacts", (m) => {
        try {
          listeners.contacts?.(JSON.parse(m.body));
        } catch {

        }
      });
      state.errorsSub?.unsubscribe?.();
      state.errorsSub = client.subscribe("/user/queue/errors", (m) => {
        try {
          listeners.error?.(JSON.parse(m.body));
        } catch {

        }
      });
      emitState("connected");
    },
    onWebSocketClose: () => {
      emitState("disconnected");
    },
    onStompError: (frame) => {

      listeners.error?.({
        status: Number(frame.headers?.["message"]?.match(/\d+/)?.[0] ?? 0) || 0,
        message: frame.headers?.message || "Kết nối trò chuyện bị từ chối.",
      });
    },
  });

  client.activate();
}

export function stop() {
  if (state.presenceSub) state.presenceSub = null;
  if (state.contactsSub) state.contactsSub = null;
  if (state.errorsSub) state.errorsSub = null;
  for (const sub of state.convSubs.values()) sub?.unsubscribe?.();
  state.convSubs.clear();
  state.convIds.clear();
  state.client?.deactivate();
  state.client = null;
  state.started = false;
  emitState("disconnected");
}


function canPublish() {
  const c = state.client;
  return Boolean(c && c.connected && c.active);
}

export function sendMessage(conversationId, content) {
  if (!canPublish()) {
    throw new Error("Chưa kết nối — đang thử lại…");
  }
  state.client.publish({
    destination: `/app/chat/${conversationId}`,
    body: JSON.stringify({ messageContent: content }),
  });
}

export function sendTyping(conversationId) {
  if (!canPublish()) return;
  state.client.publish({ destination: `/app/typing/${conversationId}` });
}


export function translateWsError(err) {
  const m = err?.message ?? "";
  if (/ExecutorSubscribableChannel|clientInboundChannel/i.test(m)) {
    return "Kết nối trò chuyện vừa gián đoạn — tin nhắn chưa gửi. Thử lại sau ít giây.";
  }
  if (/token|jwt|Bearer|Invalid or missing/i.test(m)) {
    return "Phiên đăng nhập đã hết hiệu lực — vui lòng đăng nhập lại.";
  }
  const member = m.match(/not a member of conversation (\d+)/i);
  if (member) return "Bạn không còn là thành viên của cuộc trò chuyện này.";
  if (/closed|discconnect|handshake/i.test(m)) {
    return "Kết nối trò chuyện bị gián đoạn — đang tự kết nối lại.";
  }
  return m || "Có lỗi từ máy chủ trò chuyện.";
}
