import { useEffect, useRef } from "react";
import Rail from "./components/Rail.jsx";
import ConversationList from "./components/ConversationList.jsx";
import ChatPane from "./components/ChatPane.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import { useAuth } from "./store/auth.js";
import { useChat } from "./store/chat.js";
import { useFriends } from "./store/friends.js";
import { useUi } from "./store/ui.js";
import { start, stop, setWsListeners, translateWsError } from "./lib/ws.js";
import { getToken } from "./lib/api.js";

export default function App() {
  const status = useAuth((s) => s.status);
  const init = useAuth((s) => s.init);
  const myIdRef = useRef(null);
  myIdRef.current = useAuth((s) => s.user?.id);

  useEffect(() => {
    setWsListeners({
      message: (msg) => {
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
      state: (s) => useUi.getState().setWsState(s),

      messageDeleted: (ev) => {
        useChat.getState().applyDeleted(ev);
      },

      contacts: (ev) => {
        useFriends.getState().applyEvent(ev);
      },
    });
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (status === "guest") useChat.getState().reset();
  }, [status]);

  useEffect(() => {
    if (status === "authed") {
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
      <main className="flex h-full flex-1 overflow-hidden">
        <ConversationList />
        <ChatPane />
      </main>
      <FlashBanner />
    </div>
  );
}

function FlashBanner() {
  const flash = useUi((s) => s.flash);
  const clearFlash = useUi((s) => s.clearFlash);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(clearFlash, 4000);
    return () => clearTimeout(t);
  }, [flash?.id, clearFlash]);

  if (!flash) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 border px-4 py-2"
      style={{
        background: "var(--bubble-them-bg)",
        borderColor: "var(--destructive)",
        borderRadius: "var(--radius-md)",
        fontSize: "13px",
        color: "var(--text-primary)",
      }}
    >
      {flash.text}
    </div>
  );
}
