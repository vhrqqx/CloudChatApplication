import { useEffect, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useAuth } from "../store/auth.js";
import { useChat } from "../store/chat.js";
import { useFriends } from "../store/friends.js";
import Avatar from "./Avatar.jsx";
import Dialog from "./Dialog.jsx";

export default function CreateConversationModal({ open, onClose }) {
  const myId = useAuth((s) => s.user?.id);
  const create = useChat((s) => s.create);
  const items = useChat((s) => s.items);
  const select = useChat((s) => s.select);
  const friends = useFriends((s) => s.friends);
  const friendsStatus = useFriends((s) => s.status);
  const loadFriends = useFriends((s) => s.load);

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("DIRECT");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQuery("");
    setTitle("");
    setError(null);
    if (friendsStatus === "idle") loadFriends().catch(() => {});
  }, [open, friendsStatus, loadFriends]);

  if (!open) return null;

  const users = friends.filter((f) => String(f.userId) !== String(myId));

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => (u.username || "").toLowerCase().includes(q)) : users;

  const selectedUsernames = users
    .filter((u) => selected.has(u.userId))
    .map((u) => u.username);

  function toggle(id) {
    setSelected((prev) => {
      if (mode === "DIRECT") return new Set([id]);
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function findExistingDirect(userActorId) {
    const conv = items.find(
      (it) =>
        it.type === "DIRECT" &&
        it.others?.length === 1 &&
        String(it.others[0]?.id) === String(userActorId),
    );
    return conv?.id ?? null;
  }

  async function onStart() {
    if (busy || (mode === "GROUP" ? selected.size < 2 : selected.size !== 1)) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "DIRECT") {
        const memberUserId = [...selected][0];
        const existingId = findExistingDirect(memberUserId);
        if (existingId != null) {

          select(existingId);
          onClose();
          return;
        }
        await create({ conversationType: "DIRECT", memberId: [memberUserId] });
      } else {
        await create({
          conversationType: "GROUP",
          title: title.trim() || null,
          memberId: [...selected],
        });
      }
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const canSubmit =
    !busy && selected.size > 0 && (mode === "DIRECT" || selected.size >= 2);

  return (
    <Dialog onClose={busy ? () => {} : onClose} labelledById="create-conversation-title" elevated={false}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2
            id="create-conversation-title"
            className="m-0"
            style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
          >
            Tạo cuộc trò chuyện mới
          </h2>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center"
            style={{ color: "var(--text-secondary)", background: "none", border: "none" }}
          >
            <X size={20} weight="regular" />
          </button>
        </div>

        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Loại cuộc trò chuyện">
          {[
            { key: "DIRECT", label: "Tin nhắn riêng" },
            { key: "GROUP", label: "Nhóm" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={mode === opt.key}
              onClick={() => {
                if (mode !== opt.key) {
                  setMode(opt.key);
                  setSelected(new Set());
                }
              }}
              className="flex h-9 flex-1 items-center justify-center"
              style={{
                border: `1px solid ${mode === opt.key ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius-sm)",
                background: mode === opt.key ? "var(--bg-item-active)" : "transparent",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: mode === opt.key ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === "GROUP" && <p className="mt-3 mb-0" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Bạn là quản trị viên đầu tiên. Chọn ít nhất 2 bạn bè để tạo nhóm từ 3 người.</p>}
        {mode === "GROUP" && selectedUsernames.length > 0 && (
          <p className="mt-3 mb-0" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Nhóm của: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {selectedUsernames.join(", ")}
            </span>
          </p>
        )}

        {mode === 'GROUP' && <input className="m9-filter mt-3" aria-label="Tên nhóm (không bắt buộc)" placeholder="Tên nhóm (không bắt buộc, tối đa 20 ký tự)" maxLength={20} value={title} onChange={(e) => setTitle(e.target.value)} />}
        <div className="relative mt-3">
          <MagnifyingGlass
            size={14}
            color="var(--text-secondary)"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          />
          <input
            aria-label="Tìm bạn bè"
            placeholder="Tìm bạn bè"
            autoComplete="off"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-2"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--text-primary)",
              fontSize: "13px",
            }}
          />
        </div>

        <div
          className="mt-3 flex max-h-56 flex-col gap-0.5 overflow-y-auto"
          role="listbox"
          aria-multiselectable={mode === "GROUP"}
          aria-label="Danh sách bạn bè"
        >
          {friendsStatus === "loading" &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse"
                style={{ background: "var(--bg-item-hover)", borderRadius: "var(--radius-sm)" }}
              />
            ))}

          {friendsStatus === "error" && (
            <p role="alert" className="m-0" style={{ fontSize: "13px", color: "var(--destructive)" }}>
              Không tải được danh bạ. Thử lại sau.
            </p>
          )}

          {friendsStatus !== "error" && filtered.length === 0 && (
            <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {q
                ? "Không tìm thấy bạn bè phù hợp"
                : "Chưa có bạn bè — bấm Thêm bạn để kết bạn trước"}
            </p>
          )}

          {filtered.map((u) => {
            const isSelected = selected.has(u.userId);
            return (
              <button
                key={u.userId}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => toggle(u.userId)}
                className="flex items-center gap-3 px-2 py-2 text-left"
                style={{
                  background: isSelected ? "var(--bg-item-active)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                }}
              >
                <Avatar name={u.username} size={28} ringToken="--bubble-them-bg" />
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                  {u.username}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-3 mb-0" style={{ fontSize: "13px", color: "var(--destructive)" }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={!canSubmit}
          className="mt-6 flex h-[38px] w-full items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: "14px",
            fontWeight: 600,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {busy
            ? "Đang tạo…"
            : mode === "GROUP"
              ? `Tạo nhóm (${selected.size + 1} thành viên)`
              : "Bắt đầu trò chuyện"}
        </button>
      </div>
    </Dialog>
  );
}
