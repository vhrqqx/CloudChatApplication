import { useEffect, useRef, useState, useCallback } from "react";
import { DotsThreeVertical, Eye, PushPin } from "@phosphor-icons/react";
import { useNebula, roomName, hierarchy } from "../store/nebula.js";
import QuickPeek from "./QuickPeek.jsx";
import { useChat } from "../store/chat.js";
import { isForwardDrag, dropForward } from "../lib/forward.js";
import Avatar from "./Avatar.jsx";
import { formatChatListTime } from "../lib/time.js";
import { useUi } from "../store/ui.js";

export default function ConversationItem({
  item,
  active,
  myUsername,
  onOpen,
  onAction,
}) {
  const pins = useNebula(s=>s.pins);
  useNebula(s=>s.records);
  const [peek, setPeek] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const rowRef = useRef(null);
  const pressRef = useRef(null);
  const longPressed = useRef(false);
  const closePeek = useCallback(() => setPeek(null), []);
  const showPeek = () => setPeek(rowRef.current.getBoundingClientRect());
  const cancelPress = () => clearTimeout(pressRef.current);
  useEffect(() => {
    const release = () => { clearTimeout(pressRef.current); setPeek(null); };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('blur', release);
    return () => { release(); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release); };
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef(null);
  const presence = useUi((s) => s.presence);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (!menuWrapRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isAdmin = item.role === "ADMIN";

  const action = isAdmin ? "delete" : item.type === "GROUP" ? "leave" : null;
  const preview = item.preview ?? "Chưa có tin nhắn nào";

  const otherId = item.type === "DIRECT" ? item.others?.[0]?.id : null;
  const otherOnline = otherId != null && presence[String(otherId)] === true;
  const unread = item.unreadCount ?? 0;

  return (
    <div
      ref={rowRef}
      onDragOver={(e) => { if (isForwardDrag(e)) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
      onDrop={(e) => { setDragOver(false); dropForward(e, item); }}
      className={`group relative border-b ${active ? "" : "hover:bg-[var(--bg-item-hover)]"}`}
      style={{
        background: active || dragOver ? "var(--bg-item-active)" : undefined,
        outline: dragOver ? "1px dashed var(--accent)" : undefined,
        outlineOffset: -1,
        borderColor: "var(--border)",
      }}
    >
      <button
        type="button"
        onPointerDown={(e) => { if (e.button !== 0) return; longPressed.current = false;  pressRef.current = setTimeout(() => { longPressed.current = true; showPeek(); }, 400); }}
        onPointerUp={() => { cancelPress(); closePeek(); }}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onClick={(e) => {
          cancelPress();
          if (longPressed.current) { longPressed.current = false; return; }
          if (e.altKey) return;
          if (e.shiftKey) { if (useChat.getState().selectedId !== item.id) useChat.getState().openSecondary(item.id); return; }
          onOpen();
        }}
        aria-current={active ? "true" : undefined}
        className="flex h-16 w-full min-w-0 items-center gap-3 px-3 text-left"
        style={{ background: "transparent", border: "none" }}
      >
        <Avatar
          name={item.displayName ?? ""}
          size={40}
          isGroup={item.type === "GROUP"}
          withPresence={item.type === "DIRECT"}
          ringToken="--bg-list"
        />
        <span className="min-w-0 flex-1">

          <span className="flex w-full items-center justify-between gap-2">
            <span
              className="truncate"
              style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
            >
              {roomName(item) || `Cuộc trò chuyện #${item.id}`}
            </span>
            {hierarchy(item.id).own.community && <span className="neb-list-badge">Cộng đồng</span>}
            {pins[item.id] && <PushPin size={12} weight="fill"/>}
            <span
              className="tnum shrink-0"
              style={{
                fontSize: "11px",
                color: unread ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: unread ? 600 : 400,
              }}
            >
              {formatChatListTime(item.previewAt)}
            </span>
          </span>

          <span className="mt-0.5 flex w-full items-center gap-2 text-left">
            <span
              className={`truncate flex-1 ${unread ? "min-w-0" : "block"}`}
              style={{
                fontSize: "13px",
                color: unread ? "var(--text-primary)" : "var(--text-secondary)",
                minWidth: 0,
              }}
            >
              {dragOver ? "Thả để chuyển tiếp" : preview}
            </span>
            {unread > 0 && (
              <span
                aria-label={`${unread} tin nhắn chưa đọc`}
                className="tnum flex h-5 shrink-0 items-center justify-center"
                style={{
                  minWidth: 20,
                  padding: "0 6px",
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </span>
        </span>
      </button>

      <button className="m9-icon absolute right-10 top-1 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Xem nhanh ${item.displayName}`} onPointerDown={(e) => { if (e.button === 0) showPeek(); }} onPointerUp={closePeek} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); showPeek(); } }} onKeyUp={closePeek} onClick={(e) => e.preventDefault()}><Eye size={16} /></button>
      <button className="m9-icon absolute right-20 top-1 opacity-0 group-hover:opacity-100 focus:opacity-100" title={pins[item.id]?"Bỏ ghim":"Ghim hội thoại"} aria-label={pins[item.id]?"Bỏ ghim hội thoại":"Ghim hội thoại"} aria-pressed={!!pins[item.id]} onClick={()=>useNebula.getState().pin(item.id)}><PushPin size={16} weight={pins[item.id]?"fill":"regular"}/></button>
      {peek && <QuickPeek item={item} anchor={peek} onClose={closePeek} onOpen={onOpen} />}
      {action && (
        <div ref={menuWrapRef} className="absolute right-1.5 top-1.5">
        <button
          type="button"
          aria-label={`Tùy chọn cho ${item.displayName || "cuộc trò chuyện"}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex h-8 w-8 items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100 focus-visible:opacity-100 data-[open=true]:opacity-100"
          data-open={menuOpen}
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setMenuOpen((v) => !v)}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
        >
          <DotsThreeVertical size={20} weight="regular" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-9 z-20 w-max py-1"
            style={{
              background: "var(--bubble-them-bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
            }}
          >
            {isAdmin ? (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("delete");
                }}
                className="block w-full px-4 py-2 text-left whitespace-nowrap"
                style={{ fontSize: "13px", color: "var(--destructive)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-item-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Xóa cuộc trò chuyện
              </button>
            ) : (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onAction("leave");
                }}
                className="block w-full px-4 py-2 text-left whitespace-nowrap"
                style={{ fontSize: "13px", color: "var(--text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-item-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                Rời khỏi cuộc trò chuyện
              </button>
            )}
          </div>
        )}
        </div>
      )}
    </div>
  );
}
