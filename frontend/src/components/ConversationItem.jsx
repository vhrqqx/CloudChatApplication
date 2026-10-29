import { useEffect, useRef, useState } from "react";
import { DotsThreeVertical } from "@phosphor-icons/react";
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
      className={`group relative border-b ${active ? "" : "hover:bg-[var(--bg-item-hover)]"}`}
      style={{
        background: active ? "var(--bg-item-active)" : undefined,
        borderColor: "var(--border)",
      }}
    >
      <button
        type="button"
        onClick={onOpen}
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
              {item.displayName || `Cuộc trò chuyện #${item.id}`}
            </span>
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
              {preview}
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
