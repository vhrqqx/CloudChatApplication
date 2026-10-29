import { useState } from "react";
import Dialog from "./Dialog.jsx";
import { ChatCircle, UserPlus } from "@phosphor-icons/react";
import { useChat } from "../store/chat.js";
import { useFriends } from "../store/friends.js";
import { useUi } from "../store/ui.js";
import Avatar from "./Avatar.jsx";












export default function ProfileCard({ open, onClose, userId, username, sourceConversationId }) {
  const create = useChat((s) => s.create);
  const select = useChat((s) => s.select);
  const items = useChat((s) => s.items);
  const presence = useUi((s) => s.presence);
  const sendRequest = useFriends((s) => s.send);
  const accept = useFriends((s) => s.accept);
  const cancel = useFriends((s) => s.cancel);
  const loadedOnce = useFriends((s) => s.loadedOnce);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const outgoingRequest = useFriends((s) => s.outgoing.find((r) => String(r.otherId) === String(userId)));
  const incomingRequest = useFriends((s) => s.incoming.find((r) => String(r.otherId) === String(userId)));
  const otherOnline = presence[String(userId)] === true;

  if (!open || userId == null) return null;

  async function startDirect() {
    setBusy(true);
    setError(null);
    try {
      const existing = items.find(
        (it) =>
          it.type === "DIRECT" &&
          it.others?.length === 1 &&
          String(it.others[0]?.id) === String(userId),
      );
      if (existing?.id) {
        select(existing.id);
      } else {
        const conv = await create({ conversationType: "DIRECT", memberId: [userId] });
        if (conv?.id) select(conv.id);
      }
      onClose();
    } catch (e) {
      setError(e.message || "Không mở được cuộc trò chuyện.");
    } finally {
      setBusy(false);
    }
  }

  async function sendFriendRequest() {
    setBusy(true);
    setError(null);
    try {
      await sendRequest(userId, sourceConversationId ?? null);
    } catch (e) {
      setError(e.message || "Không gửi được lời mời kết bạn.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptIncoming() {
    setBusy(true);
    setError(null);
    try {
      await accept(incomingRequest.requestId);
    } catch (e) {
      setError(e.message || "Không chấp nhận được lời mời.");
    } finally {
      setBusy(false);
    }
  }

  const relationNow = useFriends.getState().relation(userId);

  return (
    <Dialog onClose={onClose} labelledById="profile-card-title" width={360} elevated={false}>
      <div className="p-5">
        <div className="flex flex-col items-center gap-3 pt-2 pb-4">
          <Avatar
            name={username ?? ""}
            size={72}
            withPresence={otherOnline}
            ringToken="--bubble-them-bg"
          />
          <p
            id="profile-card-title"
            className="m-0 truncate max-w-full"
            style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}
          >
            {username ?? `Người dùng #${userId}`}
          </p>
          {                                                                         }
          <p className="m-0" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            {otherOnline ? "Đang hoạt động" : `Mã tài khoản #${userId}`}
          </p>
        </div>

        {                                             }
        <button
          type="button"
          disabled={busy || relationNow === "outgoing"}
          onClick={
            relationNow === "friends"
              ? startDirect
              : relationNow === "incoming"
                ? acceptIncoming
                : sendFriendRequest
          }
          className="flex h-[38px] w-full items-center justify-center gap-2"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: relationNow === "outgoing" ? "var(--bg-item-hover)" : "var(--accent)",
            color: relationNow === "outgoing" ? "var(--text-secondary)" : "var(--on-accent)",
            fontSize: "14px",
            fontWeight: 600,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {relationNow === "friends" ? (
            <>
              <ChatCircle size={16} weight="bold" />
              {busy ? "Đang mở…" : "Nhắn tin"}
            </>
          ) : relationNow === "incoming" ? (
            <>Đồng ý kết bạn</>
          ) : relationNow === "outgoing" ? (
            <>Đã gửi lời mời</>
          ) : (
            <>
              <UserPlus size={16} weight="bold" />
              {busy ? "Đang gửi…" : "Kết bạn"}
            </>
          )}
        </button>

        {relationNow === "outgoing" && outgoingRequest?.requestId != null && (
          <button
            type="button"
            onClick={() => cancel(outgoingRequest.requestId).catch(() => {})}
            className="mt-2 flex h-8 w-full items-center justify-center"
            style={{
              border: "none",
              background: "none",
              color: "var(--text-secondary)",
              fontSize: "12px",
            }}
          >
            Hủy lời mời
          </button>
        )}

        {(sourceConversationId != null && relationNow !== "friends") && (
          <p className="mt-3 mb-0 text-center" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Lời mời sẽ đi qua cuộc trò chuyện bạn đang xem
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 mb-0 text-center" style={{ fontSize: "12px", color: "var(--destructive)" }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
