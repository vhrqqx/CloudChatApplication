import { useEffect, useRef, useState } from "react";
import { DotsThreeVertical, Plus } from "@phosphor-icons/react";
import Avatar, { initialsOf } from "../Avatar.jsx";
import ConfirmDialog from "../ConfirmDialog.jsx";
import Dialog from "../Dialog.jsx";
import ProfileCard from "../ProfileCard.jsx";
import { useChat } from "../../store/chat.js";
import { useAuth } from "../../store/auth.js";
import { useFriends } from "../../store/friends.js";
import { useUi } from "../../store/ui.js";












export default function MemberPanel({ conv }) {
  const myId = useAuth((s) => s.user?.id);
  const members = useChat((s) => s.members[String(conv.id)]);
  const refreshMembers = useChat((s) => s.refreshMembers);
  const addMember = useChat((s) => s.addMember);
  const changeRole = useChat((s) => s.changeRole);
  const removeMember = useChat((s) => s.removeMember);
  const remove = useChat((s) => s.remove);
  const leave = useChat((s) => s.leave);
  const presence = useUi((s) => s.presence);
  const flashError = useUi((s) => s.flashError);

  const [adding, setAdding] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [profileFor, setProfileFor] = useState(null);
  const menuWrapRef = useRef(null);



  useEffect(() => {
    if (conv.type !== "GROUP") return;
    refreshMembers(conv.id).catch(() => {});
  }, [conv.id, conv.type]);


  useEffect(() => {
    if (!menuFor) return;
    const onDown = (e) => {
      if (!menuWrapRef.current?.contains(e.target)) setMenuFor(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuFor]);

  const isGroup = conv.type === "GROUP";
  const isAdmin = conv.role === "ADMIN";

  async function runAction(fn) {
    try {
      await fn();
    } catch (e) {
      flashError(e.message || "Thao tác thất bại — thử lại.");
    }
  }

  return (
    <aside
      aria-label="Thông tin hội thoại"
      className="flex h-full w-[280px] shrink-0 flex-col border-l"
      style={{ background: "var(--bg-list)", borderColor: "var(--border)" }}
    >
      <div
        className="flex h-14 shrink-0 items-center border-b px-4"
        style={{ borderColor: "var(--border)" }}
      >
        <p
          className="m-0"
          style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
        >
          {isGroup ? "Thành viên" : "Thông tin"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {                                                                       }
        {!isGroup && conv.others?.[0] && String(conv.others[0].id) !== String(myId) && (
          <div className="flex flex-col items-center gap-2 pt-6">
            <button
              type="button"
              aria-label={`Xem hồ sơ ${conv.displayName || ""}`}
              className="block rounded-full"
              onClick={() =>
                setProfileFor({
                  userId: conv.others[0].id,
                  username: conv.others[0].username ?? conv.displayName,
                  sourceConversationId: null,
                })
              }
            >
              <Avatar name={conv.displayName ?? ""} size={48} ringToken="--bg-list" />
            </button>
            <p className="m-0" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {conv.displayName || `Cuộc trò chuyện #${conv.id}`}
            </p>
            <p className="m-0" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Cuộc trò chuyện riêng tư 1–1
            </p>
          </div>
        )}
        {!isGroup && !conv.others?.[0] && (
          <div className="flex flex-col items-center gap-2 pt-6">
            <Avatar name={conv.displayName ?? ""} size={48} ringToken="--bg-list" />
            <p className="m-0" style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
              {conv.displayName || `Cuộc trò chuyện #${conv.id}`}
            </p>
            <p className="m-0" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Cuộc trò chuyện riêng tư 1–1
            </p>
          </div>
        )}

        {                                                               }
        {isGroup && (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {(members ?? []).map((m) => (
              <li
                key={m.id}
                className="group relative flex items-center gap-3 px-2 py-2"
                style={{ borderRadius: "var(--radius-sm)" }}
              >
                {

                                                                              }
                {String(m.id) !== String(myId) ? (
                  <button
                    type="button"
                    aria-label={`Xem hồ sơ ${m.username}`}
                    className="relative block shrink-0 rounded-full"
                    onClick={() =>
                      setProfileFor({
                        userId: m.id,
                        username: m.username,
                        sourceConversationId: conv.id,
                      })
                    }
                  >
                    <span className="relative inline-block" style={{ width: 32, height: 32 }}>
                      <span
                        className="flex h-full w-full items-center justify-center rounded-full"
                        style={{ background: "#27272A", color: "#FFFFFF" }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
                          {initialsOf(m.username)}
                        </span>
                      </span>
                      {presence[String(m.id)] === true && (
                        <span
                          aria-label="Đang hoạt động"
                          className="absolute rounded-full"
                          style={{
                            width: 8,
                            height: 8,
                            bottom: 0,
                            right: 0,
                            background: "var(--presence)",
                            boxShadow: "0 0 0 2px var(--bg-list)",
                          }}
                        />
                      )}
                    </span>
                  </button>
                ) : (
                  <span className="relative inline-block shrink-0" style={{ width: 32, height: 32 }}>
                    <span
                      className="flex h-full w-full items-center justify-center rounded-full"
                      style={{ background: "#27272A", color: "#FFFFFF" }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
                        {initialsOf(m.username)}
                      </span>
                    </span>
                    {presence[String(m.id)] === true && (
                      <span
                        aria-label="Đang hoạt động"
                        className="absolute rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          bottom: 0,
                          right: 0,
                          background: "var(--presence)",
                          boxShadow: "0 0 0 2px var(--bg-list)",
                        }}
                      />
                    )}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="truncate"
                      style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)" }}
                    >
                      {m.username}
                      {String(m.id) === String(myId) ? " (bạn)" : ""}
                    </span>
                    {m.role === "ADMIN" && (
                      <span
                        className="shrink-0"
                        style={{
                          fontSize: "11px",
                          padding: "1px 6px",
                          borderRadius: 999,
                          background: "var(--bg-rail)",
                          border: "1px solid var(--border)",
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Quản trị viên
                      </span>
                    )}
                  </span>
                </span>

                {                                                              }
                {isAdmin && String(m.id) !== String(myId) && (
                  <div ref={m.id === menuFor ? menuWrapRef : undefined} className="relative">
                    <button
                      type="button"
                      aria-label={`Tùy chọn cho ${m.username}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === m.id}
                      className="flex h-8 w-8 items-center justify-center"
                      style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
                      onClick={() => setMenuFor((v) => (v === m.id ? null : m.id))}
                    >
                      <DotsThreeVertical size={20} weight="regular" />
                    </button>
                    {menuFor === m.id && (
                      <div
                        role="menu"
                        className="absolute right-0 top-9 z-20 py-1"
                        style={{
                          minWidth: 190,
                          background: "var(--bubble-them-bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.16)",
                        }}
                      >
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setConfirm({ kind: "changeRole", member: m });
                          }}
                          className="block w-full px-4 py-2 text-left whitespace-nowrap"
                          style={{ fontSize: "13px", color: "var(--text-primary)", border: "none", background: "none" }}
                        >
                          {m.role === "ADMIN" ? "Gỡ quyền quản trị" : "Chuyển quyền quản trị"}
                        </button>
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMenuFor(null);
                            setConfirm({ kind: "removeMember", member: m });
                          }}
                          className="block w-full px-4 py-2 text-left whitespace-nowrap"
                          style={{ fontSize: "13px", color: "var(--destructive)", border: "none", background: "none" }}
                        >
                          Xóa khỏi nhóm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {                                                                    }
        {isGroup && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-2 flex w-full items-center gap-2 px-2 py-2 text-left"
            style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
          >
            <Plus size={20} weight="regular" />
            <span style={{ fontSize: "13px" }}>Thêm thành viên</span>
          </button>
        )}
      </div>

      {                                                 }
      {isGroup && (
        <div className="shrink-0 border-t p-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={() => setConfirm({ kind: isAdmin ? "deleteConv" : "leaveConv" })}
            className="h-[38px] w-full"
            style={{
              border: `1px solid var(--destructive)`,
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--destructive)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {isAdmin ? "Xóa cuộc trò chuyện" : "Rời khỏi cuộc trò chuyện"}
          </button>
        </div>
      )}

      <AddMemberDialog open={adding} conv={conv} onClose={() => setAdding(false)} onAdd={addMember} />

      <ProfileCard
        open={Boolean(profileFor)}
        onClose={() => setProfileFor(null)}
        userId={profileFor?.userId}
        username={profileFor?.username}
        sourceConversationId={profileFor?.sourceConversationId ?? null}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.kind === "changeRole"
            ? confirm.member.role === "ADMIN"
              ? "Gỡ quyền quản trị?"
              : "Chuyển quyền quản trị?"
            : confirm?.kind === "removeMember"
              ? "Xóa khỏi nhóm?"
              : confirm?.kind === "deleteConv"
                ? "Xóa cuộc trò chuyện?"
                : "Rời khỏi cuộc trò chuyện?"
        }
        description={
          confirm?.kind === "changeRole"
            ? confirm.member.role === "ADMIN"
              ? `${confirm.member.username} sẽ trở thành thành viên thường (nhóm cần ít nhất 1 quản trị viên).`
              : `${confirm.member.username} sẽ có thể quản trị nhóm: thêm người, đổi vai trò, xóa thành viên.`
            : confirm?.kind === "removeMember"
              ? `${confirm.member.username} sẽ bị xóa khỏi nhóm — có thể được thêm lại sau.`
              : confirm?.kind === "deleteConv"
                ? "Hội thoại cùng toàn bộ tin nhắn sẽ bị xóa vĩnh viễn — không thể hoàn tác."
                : "Bạn sẽ không còn nhìn thấy hội thoại này cho đến khi được thêm lại."
        }
        confirmLabel={
          confirm?.kind === "changeRole"
            ? confirm.member.role === "ADMIN" ? "Gỡ quyền" : "Chuyển quyền"
            : confirm?.kind === "removeMember"
              ? "Xóa khỏi nhóm"
              : confirm?.kind === "deleteConv"
                ? "Xóa"
                : "Rời khỏi"
        }
        action={async () => {
          if (confirm.kind === "changeRole") {
            await runAction(() => changeRole(conv.id, confirm.member.id, confirm.member.role === "ADMIN" ? "MEMBER" : "ADMIN"));
          } else if (confirm.kind === "removeMember") {
            await runAction(() => removeMember(conv.id, confirm.member.id));
          } else if (confirm.kind === "deleteConv") {
            await remove(conv.id);
          } else {
            await leave(conv.id);
          }
        }}
        onClose={() => setConfirm(null)}
      />
    </aside>
  );
}






function AddMemberDialog({ open, conv, onClose, onAdd }) {
  const myId = useAuth((s) => s.user?.id);
  const members = useChat((s) => s.members[String(conv.id)]);
  const friends = useFriends((s) => s.friends);
  const friendsStatus = useFriends((s) => s.status);
  const loadFriends = useFriends((s) => s.load);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setQuery("");
    setError(null);
    if (friendsStatus === "idle") loadFriends().catch(() => {});
  }, [open, friendsStatus, loadFriends]);

  if (!open) return null;


  const memberIds = new Set((members ?? []).map((m) => String(m.id)));
  const users = friends.filter(
    (f) => String(f.userId) !== String(myId) && !memberIds.has(String(f.userId)),
  );

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => (u.username || "").toLowerCase().includes(q)) : users;

  async function onAddSelected() {
    setBusy(true);
    setError(null);
    try {
      for (const uid of selected) {
        await onAdd(conv.id, uid);
      }
      onClose();
    } catch (e) {
      setError(e.message || "Không thêm được thành viên.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog onClose={busy ? () => {} : onClose} labelledById="add-member-title" width={320}>
      <div className="p-6">
        <h2
          id="add-member-title"
          className="m-0"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}
        >
          Thêm thành viên
        </h2>

        <input
          aria-label="Tìm người dùng"
          placeholder="Tìm người dùng"
          autoComplete="off"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mt-3 h-8 w-full"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            color: "var(--text-primary)",
            fontSize: "13px",
            padding: "0 10px",
          }}
        />

        <div className="mt-2 flex max-h-48 flex-col gap-0.5 overflow-y-auto" role="listbox" aria-label="Danh sách bạn bè">
          {friendsStatus === "loading" &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse" style={{ background: "var(--bg-item-hover)", borderRadius: "var(--radius-sm)" }} />
            ))}
          {friendsStatus === "ready" && users.length === 0 && (
            <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Chưa có bạn bè phù hợp — bạn chỉ có thể thêm bạn bè vào nhóm
            </p>
          )}
          {friendsStatus === "ready" && users.length > 0 && filtered.length === 0 && (
            <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Không còn bạn bè nào để thêm
            </p>
          )}
          {filtered.map((u) => {
            const sel = selected.has(u.id);
            return (
              <button
                key={u.id}
                role="option"
                aria-selected={sel}
                type="button"
                onClick={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.has(u.id) ? next.delete(u.id) : next.add(u.id);
                    return next;
                  })
                }
                className="flex items-center gap-3 px-2 py-2 text-left"
                style={{
                  border: "none",
                  background: sel ? "var(--bg-item-active)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <Avatar name={u.username} size={28} ringToken="--bubble-them-bg" />
                <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>{u.username}</span>
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
          onClick={onAddSelected}
          disabled={selected.size === 0 || busy}
          className="mt-5 flex h-[38px] w-full items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: "14px",
            fontWeight: 600,
            opacity: selected.size === 0 || busy ? 0.5 : 1,
          }}
        >
          {busy ? "Đang thêm…" : `Thêm (${selected.size})`}
        </button>
      </div>
    </Dialog>
  );
}
