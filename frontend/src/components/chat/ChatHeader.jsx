import { useEffect, useState } from "react";
import { SidebarSimple, Columns, X, ArrowLeft, ArrowsLeftRight, ArrowsClockwise } from "@phosphor-icons/react";
import { MetadataButton } from "../nebula/CommunityTools.jsx";
import { useNebula, roomName, hierarchy } from "../../store/nebula.js";
import { useChat } from "../../store/chat.js";
import Avatar from "../Avatar.jsx";
import ProfileCard from "../ProfileCard.jsx";
import { useUi } from "../../store/ui.js";
import { useAuth } from "../../store/auth.js";

const TYPING_TICK_MS = 1200;

export default function ChatHeader({ conv, panelOpen = false, onTogglePanel, secondary, splitOpen, onReplace }) {
  useNebula((s) => s.records);
  const myId = useAuth((s) => s.user?.id);
  const presence = useUi((s) => s.presence);
  const [tick, setTick] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), TYPING_TICK_MS);
    return () => clearInterval(t);
  }, []);

  if (!conv) return null;
  void tick;

  const isDirect = conv.type === "DIRECT";
  const other = conv.others?.[0];
  const otherOnline = isDirect && other ? presence[String(other.id)] === true : false;

  const typingNames = useUi
    .getState()
    .typingNames(conv.id, myId)
    .filter((n) => (isDirect ? n === other?.username : true));

  const name = roomName(conv) || `Cuộc trò chuyện #${conv.id}`;
  const statusText = typingNames.length
    ? typingNames.length === 1
      ? `${typingNames[0]} đang nhập…`
      : `${typingNames.join(", ")} đang nhập…`
    : isDirect
      ? otherOnline
        ? "Đang hoạt động"
        : null
      : `${conv.membersCount || 1} thành viên`;

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-3 border-b px-4"
      style={{ borderColor: "var(--border)", background: "var(--bg-chat)" }}
    >

      {!secondary && <button className="m9-back m9-icon" aria-label="Về danh sách hội thoại" onClick={() => { useChat.getState().closeSplit(); useChat.getState().select(null); }}><ArrowLeft size={20} /></button>}
      {isDirect && other && String(other.id) !== String(myId) ? (
        <button
          type="button"
          aria-label={`Xem hồ sơ ${name}`}
          title="Xem hồ sơ"
          className="block shrink-0 rounded-full"
          onClick={() => setProfileOpen(true)}
        >
          <Avatar
            name={name}
            size={40}
            withPresence
            ringToken="--bg-chat"
          />
        </button>
      ) : (
        <Avatar
          name={name}
          size={40}
          isGroup={!isDirect}
          withPresence={isDirect}
          ringToken="--bg-chat"
        />
      )}
      <div className="min-w-0 flex-1">
        <p
          className="m-0 truncate"
          style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
        >
          {name} {hierarchy(conv.id).own.community && <span className="neb-tag" style={{"--neb-color":"var(--accent)"}}>Cộng đồng</span>}{hierarchy(conv.id).own.parentId && <span className="neb-tag" style={{"--neb-color":hierarchy(conv.id).own.color}}>Nhóm con</span>}
        </p>
        <p
          className="m-0 truncate"
          style={{
            fontSize: "12px",
            color: typingNames.length ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          {statusText || "\u00A0"}
        </p>
      </div>
      <MetadataButton conv={conv} type={conv.type === "GROUP" ? "rename" : "nickname"}/>
      {splitOpen && <><button className="m9-icon" title="Thay hội thoại bên này" aria-label="Thay hội thoại bên này" onClick={onReplace}><ArrowsClockwise size={20} /></button><button className="m9-icon" title="Hoán đổi hai bên" aria-label="Hoán đổi hai bên" disabled={useChat.getState().secondaryId == null} onClick={() => useChat.getState().swapPanes()}><ArrowsLeftRight size={20} /></button></>}
      <button className="m9-icon" aria-label={secondary ? "Đóng chia đôi" : "Chia đôi màn hình"} aria-pressed={splitOpen} onClick={() => { const s = useChat.getState(); if (splitOpen) s.closeSplit(); else s.openSecondary(null); }}>
        {secondary ? <X size={16} /> : <Columns size={20} weight={splitOpen ? "fill" : "regular"} />}
      </button>
      <button
        disabled={splitOpen}
        type="button"
        aria-label="Thông tin hội thoại"
        aria-pressed={panelOpen}
        title={panelOpen ? "Đóng khung thông tin" : "Mở khung thông tin"}
        className="flex h-9 w-9 items-center justify-center"
        style={{
          color: panelOpen ? "var(--accent)" : "var(--text-secondary)",
          background: panelOpen ? "var(--bg-item-active)" : "transparent",
          border: "none",
          borderRadius: "var(--radius-md)",
        }}
        onClick={() => onTogglePanel?.()}
      >
        <SidebarSimple size={20} weight={panelOpen ? "fill" : "regular"} />
      </button>

      <ProfileCard
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        userId={other?.id}
        username={other?.username ?? name}
        contextConversationId={conv.id}
        sourceConversationId={null}
      />
    </header>
  );
}
