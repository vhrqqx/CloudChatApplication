import { useState } from "react";
import { Chats, Users } from "@phosphor-icons/react";
import ThemeToggle from "./ThemeToggle.jsx";
import RailAvatar from "./RailAvatar.jsx";
import ContactsModal from "./ContactsModal.jsx";
import { useFriends } from "../store/friends.js";

export default function Rail() {
  const [contactsOpen, setContactsOpen] = useState(false);
  const pending = useFriends((s) => s.incoming.length);

  return (
    <nav
      aria-label="Điều hướng chính"
      className="flex h-full w-16 flex-col items-center justify-between border-r py-3"
      style={{ background: "var(--bg-rail)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          aria-label="Cuộc trò chuyện"
          aria-current="page"
          title="Cuộc trò chuyện"
          className="flex h-9 w-9 items-center justify-center"
          style={{
            borderRadius: "var(--radius-md)",
            background: "var(--bg-item-active)",
          }}
        >
          <Chats size={20} weight="fill" color="var(--accent)" />
        </button>

        <button
          type="button"
          aria-label={`Danh bạ${pending > 0 ? ` — ${pending} lời mời kết bạn` : ""}`}
          title="Danh bạ"
          aria-pressed={contactsOpen}
          className="relative mt-2 flex h-9 w-9 items-center justify-center transition-colors duration-150"
          style={{
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-item-hover)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onClick={() => setContactsOpen(true)}
        >
          <Users size={20} weight="regular" />
          {pending > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1"
              style={{
                background: "var(--destructive)",
                color: "#FFFFFF",
                fontSize: "10px",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {pending > 99 ? "99+" : pending}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <ThemeToggle />
        <RailAvatar />
      </div>

      <ContactsModal open={contactsOpen} onClose={() => setContactsOpen(false)} />
    </nav>
  );
}
