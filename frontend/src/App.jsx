import { useEffect, useRef } from "react";
import ToastStack from "./components/ToastStack.jsx";
import { useNotifications } from "./store/notifications.js";
import { notifyMessage } from "./lib/notify.js";
import Rail from "./components/Rail.jsx";
import ConversationList from "./components/ConversationList.jsx";
import ChatPane from "./components/ChatPane.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import { useAuth } from "./store/auth.js";
import { useChat } from "./store/chat.js";
import { useNebula } from "./store/nebula.js";
import { useAccountPolicies } from "./store/accountPolicies.js";
import { useFriends } from "./store/friends.js";
import { useUi } from "./store/ui.js";
import { start, stop, ensureConversation, setWsListeners, translateWsError } from "./lib/ws.js";
import { getToken } from "./lib/api.js";

export default function App() {
  const selectedId = useChat((s) => s.selectedId);
  const splitOpen = useChat((s) => s.splitOpen);
  const secondaryId = useChat((s) => s.secondaryId);
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);
  const myIdRef = useRef(null);
  myIdRef.current = useAuth((s) => s.user?.id);

  useEffect(() => {
    setWsListeners({
      message: (msg) => {
        notifyMessage(msg);
        useChat.getState().applyIncoming(msg);
      },
      typing: (conversationId, signal) => {
        if (signal?.userId != null && String(signal.userId) !== String(myIdRef.current)) {
          useUi.getState().markTyping(conversationId, signal.userId, signal.displayName);
        }
      },
      presence: (signal) => {
        if (signal?.userId != null) useUi.getState().setPresence(signal);
      },
      error: (err) => {
        useUi.getState().flashError(translateWsError(err));
      },
      state: (s) => {
        useUi.getState().setWsState(s);
        if (s === 'connected') { useNebula.getState().load().catch(()=>{}); useChat.getState().load().catch((e) => useUi.getState().flashError(e.message)); }
      },

      messageDeleted: (ev) => {
        useChat.getState().applyDeleted(ev);
      },

      contacts: (ev) => {
        if (ev?.kind === "nebula" && String(ev.targetId) === String(myIdRef.current)) { useNebula.getState().load().then(() => useChat.getState().load()).catch((e) => useUi.getState().flashError(e.message)); return; }
        if (String(ev?.targetId) === String(myIdRef.current) && ev?.conversationId) {
          ensureConversation(ev.conversationId);
          useChat.getState().load().then(() => useChat.getState().refreshLatest(ev.conversationId)).catch((e) => useUi.getState().flashError(e.message));
        }
        useFriends.getState().applyEvent(ev);
        if (ev?.kind === 'accepted' && String(ev.targetId) === String(myIdRef.current) && String(ev.acceptedBy) !== String(myIdRef.current)) {
          useNotifications.getState().push({ kind: 'accepted', text: `${ev.friendName} đã đồng ý kết bạn` });
        }
        if (ev?.kind === 'request' && String(ev.targetId) === String(myIdRef.current)) {
          useNotifications.getState().push({ id: `friend-${ev.requestId}`, kind: 'friend', requestId: ev.requestId, text: `${ev.senderName} muốn kết bạn với bạn`, sourceName: ev.sourceName });
        }
      },
    });
  }, []);

  useEffect(() => {
    init();
  }, [init]);
  useEffect(() => {
    const update = (event) => { if (event.key?.startsWith('nebula-pins:')) useNebula.getState().loadPins(); };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);


  useEffect(() => {
    if (status === "guest") { useNebula.getState().reset(); useAccountPolicies.getState().reset(); useChat.getState().reset(); useNotifications.getState().reset(); }
  }, [status]);

  useEffect(() => {
    if (status === "authed") {
      useAccountPolicies.getState().load().catch(() => {});
      useNebula.getState().loadPins();
      useNebula.getState().load().catch(() => {});
      start(getToken());
    } else {
      stop();
      useUi.getState().setWsState("idle");
    }
  }, [status]);

  useEffect(() => {
    if (status === "authed") useFriends.getState().load().catch(() => {});
  }, [status]);

  if (status === "booting") {
    return (
      <div
        className="flex h-full items-center justify-center"
        style={{ background: "var(--bg-chat)" }}
      >
        <p
          className="m-0"
          style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-secondary)" }}
        >
          CloudChat
        </p>
      </div>
    );
  }

  if (status === "guest") return <AuthScreen />;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Rail />
      <main data-selected={selectedId != null} data-split={splitOpen} className="m9-main flex h-full min-w-0 flex-1 overflow-hidden">
        <ConversationList />
        <ChatPane />
        {splitOpen && <div className="flex min-w-0 flex-1 border-l" style={{ borderColor: "var(--border)" }}><ChatPane secondary conversationId={secondaryId} /></div>}
      </main>
      <ToastStack />
    </div>
  );
}
