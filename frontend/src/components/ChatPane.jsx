import { useEffect, useState } from "react";
import { Chat } from "@phosphor-icons/react";
import { useChat } from "../store/chat.js";
import { useAuth } from "../store/auth.js";
import { ensureConversation } from "../lib/ws.js";
import ChatHeader from "./chat/ChatHeader.jsx";
import MessageList from "./chat/MessageList.jsx";
import Composer from "./chat/Composer.jsx";
import MemberPanel from "./chat/MemberPanel.jsx";








export default function ChatPane() {
  const selectedId = useChat((s) => s.selectedId);
  const conv = useChat((s) => s.items.find((i) => i.id === s.selectedId));
  const messagesEntry = useChat((s) => s.messages[String(s.selectedId)]);
  const myId = useAuth((s) => s.user?.id);
  const loadOlder = useChat((s) => s.loadOlder);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    if (selectedId == null) {
      setPanelOpen(false);
      return;
    }
    ensureConversation(selectedId);
    useChat.getState().markRead(selectedId);
    if (!useChat.getState().messages[String(selectedId)]) {
      useChat.getState().loadMessages(selectedId);
    } else {


      useChat.getState().refreshLatest(selectedId);
    }
  }, [selectedId]);

  if (selectedId == null || !conv) {
    return (
      <section
        aria-label="Khung hội thoại"
        className="flex h-full flex-1 items-center justify-center"
        style={{ background: "var(--bg-chat)" }}
      >
        <div className="flex flex-col items-center gap-3" role="status">
          <Chat
            size={28}
            weight="regular"
            color="var(--text-secondary)"
            style={{ opacity: 0.5 }}
            aria-hidden={true}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            Chưa chọn cuộc trò chuyện nào
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Khung hội thoại"
      className="flex h-full min-w-0 flex-1 flex-col"
      style={{ background: "var(--bg-chat)" }}
    >
      <ChatHeader
        conv={conv}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      {

                                          }
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageList conv={conv} messagesEntry={messagesEntry} myId={myId} onLoadOlder={loadOlder} />
          <Composer conversationId={conv.id} />
        </div>
        {panelOpen && <MemberPanel conv={conv} />}
      </div>
    </section>
  );
}
