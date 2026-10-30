import { useEffect, useState } from "react";
import { Chat } from "@phosphor-icons/react";
import { useChat } from "../store/chat.js";
import { useAuth } from "../store/auth.js";
import { ensureConversation } from "../lib/ws.js";
import { PinnedTasks } from "./nebula/CommunityTools.jsx";
import ConversationPicker from "./chat/ConversationPicker.jsx";
import ChatHeader from "./chat/ChatHeader.jsx";
import MessageList from "./chat/MessageList.jsx";
import Composer from "./chat/Composer.jsx";
import MediaPanel from "./chat/MediaPanel.jsx";
import { dropForward, isForwardDrag } from "../lib/forward.js";

export default function ChatPane({ secondary = false, conversationId }) {
  const primaryId = useChat((s) => s.selectedId);
  const selectedId = secondary ? conversationId : primaryId;
  const splitOpen = useChat((s) => s.splitOpen);
  const conv = useChat((s) => s.items.find((i) => String(i.id) === String(selectedId)));
  const messagesEntry = useChat((s) => s.messages[String(selectedId)]);
  const myId = useAuth((s) => s.user?.id);
  const loadOlder = useChat((s) => s.loadOlder);
  const [reply, setReply] = useState(null);
  useEffect(() => { setReply(null); }, [selectedId]);
  const [choosing, setChoosing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => { setChoosing(false); }, [selectedId, splitOpen]);

  useEffect(() => { if (splitOpen) setPanelOpen(false); }, [splitOpen]);

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

  if (splitOpen && (choosing || (secondary && (selectedId == null || !conv)))) {
    return <section aria-label="Khung hội thoại" className="h-full min-w-0 flex-1" style={{ background: 'var(--bg-chat)' }}><ConversationPicker secondary={secondary} onChoose={(id) => { useChat.getState().replacePane(secondary, id); setChoosing(false); }} onCancel={() => { setChoosing(false); if (secondary && selectedId == null) useChat.getState().closeSplit(); }} /></section>;
  }

  if (selectedId == null || !conv) {
    return (
      <section
        aria-label="Khung hội thoại"
        className="flex h-full min-w-0 flex-1 items-center justify-center"
        style={{ background: "var(--bg-chat)" }}
      >
        <div className="flex flex-col items-center gap-3" role="status">
          {secondary && <button onClick={() => useChat.getState().closeSplit()}>Đóng chia đôi</button>}
          <Chat
            size={28}
            weight="regular"
            color="var(--text-secondary)"
            style={{ opacity: 0.5 }}
            aria-hidden={true}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {secondary ? "Shift + bấm hội thoại để mở bên phải" : "Chưa chọn cuộc trò chuyện nào"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      onDragOver={(e) => { if (isForwardDrag(e)) e.preventDefault(); }}
      onDrop={(e) => dropForward(e, conv)}
      aria-label="Khung hội thoại"
      className="flex h-full min-w-0 flex-1 flex-col"
      style={{ background: "var(--bg-chat)" }}
    >
      <ChatHeader
        conv={conv}
        onReplace={() => setChoosing(true)}
        secondary={secondary}
        splitOpen={splitOpen}
        panelOpen={panelOpen}
        onTogglePanel={() => { if (!splitOpen) setPanelOpen((v) => !v); }}
      />

      <PinnedTasks conv={conv}/>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageList key={`messages-${conv.id}`} conv={conv} messagesEntry={messagesEntry} myId={myId} onLoadOlder={loadOlder} onReply={setReply} />
          <Composer key={`composer-${conv.id}`} conversationId={conv.id} reply={reply} onCancelReply={() => setReply(null)} />
        </div>
        {panelOpen && !splitOpen && <MediaPanel key={conv.id} conv={conv} />}
      </div>
    </section>
  );
}
