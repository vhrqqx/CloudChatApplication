import { useEffect, useState } from "react";
import { X, Check, XCircle, ChatCircle } from "@phosphor-icons/react";
import Dialog from "./Dialog.jsx";
import ProfileCard from "./ProfileCard.jsx";
import { useAuth } from "../store/auth.js";
import { useChat } from "../store/chat.js";
import { useFriends } from "../store/friends.js";
import Avatar from "./Avatar.jsx";
import { useUi } from "../store/ui.js";

export default function ContactsModal({ open, onClose }) {
  const load = useFriends((s) => s.load);
  const accept = useFriends((s) => s.accept);
  const decline = useFriends((s) => s.decline);
  const friends = useFriends((s) => s.friends);
  const incoming = useFriends((s) => s.incoming);
  const create = useChat((s) => s.create);
  const select = useChat((s) => s.select);
  const items = useChat((s) => s.items);
  const flashError = useUi((s) => s.flashError);

  const [busyId, setBusyId] = useState(null);
  const [profileFor, setProfileFor] = useState(null);
  const [directBusy, setDirectBusy] = useState(false);

  useEffect(() => {
    if (open) load().catch(() => {});
  }, [open]);

  if (!open) return null;

  async function openDirect(userId) {
    setDirectBusy(true);
    try {
      const existing = items.find(
        (it) =>
          it.type === "DIRECT" &&
          it.others?.length === 1 &&
          String(it.others[0]?.id) === String(userId),
      );
      if (existing?.id) select(existing.id);
      else {
        const conv = await create({ conversationType: "DIRECT", memberId: [userId] });
        if (conv?.id) select(conv.id);
      }
      onClose();
    } catch (e) {
      flashError(e.message || "Không mở được cuộc trò chuyện.");
    } finally {
      setDirectBusy(false);
    }
  }

  const listbox = {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bubble-them-bg)",
  };

  return (
    <>
      <Dialog onClose={onClose} labelledById="contacts-title" width={380} elevated={false}>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h2
              id="contacts-title"
              className="m-0"
              style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}
            >
              Danh bạ
            </h2>
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center"
              style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
            >
              <X size={20} weight="regular" />
            </button>
          </div>

          <section aria-label="Lời mời kết bạn" className="mt-4">
            <p
              className="m-0 px-1"
              style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}
            >
              LỜI MỜI KẾT BẠN
            </p>
            <div className="mt-2 flex flex-col gap-2" style={listbox}>
              {incoming.length === 0 && (
                <p className="m-0 px-3 py-3" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Không có lời mời kết bạn nào
                </p>
              )}
              {incoming.map((r) => (
                <div key={r.requestId} className="flex items-center gap-2 px-3 py-2">
                  <Avatar name={r.otherName} size={32} ringToken="--bubble-them-bg" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="m-0 truncate"
                      style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      <b>{r.otherName}</b> muốn kết bạn với bạn
                    </p>
                    {r.sourceName && (
                      <p className="m-0 truncate" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                        thông qua nhóm {r.sourceName}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Đồng ý lời mời từ ${r.otherName}`}
                    disabled={busyId === r.requestId}
                    className="flex h-8 w-8 items-center justify-center"
                    style={{
                      border: "1px solid var(--border)",
                      background: "transparent",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--accent)",
                    }}
                    title="Đồng ý"
                    onClick={async () => {
                      setBusyId(r.requestId);
                      try {
                        await accept(r.requestId);
                      } catch (e) {
                        flashError(e.message || "Không chấp nhận được lời mời.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <Check size={16} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Từ chối lời mời từ ${r.otherName}`}
                    disabled={busyId === r.requestId}
                    className="flex h-8 w-8 items-center justify-center"
                    style={{
                      border: "1px solid var(--border)",
                      background: "transparent",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--destructive)",
                    }}
                    title="Từ chối"
                    onClick={async () => {
                      setBusyId(r.requestId);
                      try {
                        await decline(r.requestId);
                      } catch (e) {
                        flashError(e.message || "Không từ chối được lời mời.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    <XCircle size={16} weight="regular" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Bạn bè" className="mt-4">
            <p
              className="m-0 px-1"
              style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}
            >
              BẠN BÈ ({friends.length})
            </p>
            <div className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto" style={listbox}>
              {friends.length === 0 && (
                <p className="m-0 px-3 py-3" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Chưa có bạn bè — mở profile mọi người trong nhóm để gửi lời mời
                </p>
              )}
              {friends.map((f) => (
                <div key={f.userId} className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2"
                    style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => setProfileFor({ userId: f.userId, username: f.username })}
                    aria-label={`Xem hồ sơ ${f.username}`}
                  >
                    <Avatar name={f.username} size={32} ringToken="--bubble-them-bg" />
                    <span
                      className="truncate"
                      style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}
                    >
                      {f.username}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Nhắn tin với ${f.username}`}
                    disabled={directBusy}
                    className="flex h-8 w-8 items-center justify-center"
                    style={{
                      border: "1px solid var(--border)",
                      background: "transparent",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-secondary)",
                    }}
                    title="Nhắn tin"
                    onClick={() => openDirect(f.userId)}
                  >
                    <ChatCircle size={16} weight="regular" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <p className="m-0 mt-3 px-1" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Mời kết bạn được gửi từ trong nhóm sẽ ghi nguồn nhóm cho người nhận.
          </p>
        </div>
      </Dialog>

      <ProfileCard
        open={Boolean(profileFor)}
        onClose={() => setProfileFor(null)}
        userId={profileFor?.userId}
        username={profileFor?.username}
        sourceConversationId={null}
      />
    </>
  );
}
