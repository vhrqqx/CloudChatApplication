import { useEffect, useRef, useState } from "react";
import { ArrowClockwise, MagnifyingGlass, Plus, UserPlus } from "@phosphor-icons/react";
import { useNebula, roomName } from "../store/nebula.js";
import { useAccountPolicies } from "../store/accountPolicies.js";
import { useAuth } from "../store/auth.js";
import { useChat } from "../store/chat.js";
import ConversationItem from "./ConversationItem.jsx";
import CreateConversationModal from "./CreateConversationModal.jsx";
import FindFriendsModal from "./FindFriendsModal.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";

export default function ConversationList() {
  const pins = useNebula(s=>s.pins);
  useNebula(s=>s.records);
  const allItems = useChat((s) => s.items);
  const policies = useAccountPolicies((s) => s.items);
  const items = allItems.filter((c) => c.type !== "DIRECT" || !policies.some((p) => (p.hidden || p.blocked) && c.others?.some((o) => String(o.id) === String(p.targetId))));
  const status = useChat((s) => s.status);
  const error = useChat((s) => s.error);
  const load = useChat((s) => s.load);
  const selectedId = useChat((s) => s.selectedId);
  const select = useChat((s) => s.select);
  const remove = useChat((s) => s.remove);
  const leave = useChat((s) => s.leave);

  const [query, setQuery] = useState("");
  const [finding, setFinding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    load();

  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = (q ? items.filter((it) => (roomName(it) || "").toLowerCase().includes(q)) : [...items]).sort((a,b)=>Number(!!pins[b.id])-Number(!!pins[a.id]));

  function onAction(kind) {
    setConfirm({ kind });
  }

  return (
    <section
      aria-label="Danh sách cuộc trò chuyện"
      className="flex h-full w-72 shrink-0 flex-col border-r"
      style={{ background: "var(--bg-list)", borderColor: "var(--border)" }}
    >
      <header className="flex items-center justify-between pl-4 pr-2 pt-3 pb-2">
        <h1
          className="m-0"
          style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}
        >
          Cuộc trò chuyện
        </h1>
        <div className="flex"><button className="m9-icon" aria-label="Thêm bạn" title="Thêm bạn" onClick={() => setFinding(true)}><UserPlus size={20} /></button><button
          type="button"
          aria-label="Tạo cuộc trò chuyện mới"
          title="Tạo cuộc trò chuyện mới"
          className="flex h-9 w-9 items-center justify-center hover:bg-[var(--bg-item-hover)]"
          style={{ borderRadius: "var(--radius-md)", color: "var(--text-secondary)" }}
          onClick={() => setCreating(true)}
        >
          <Plus size={20} weight="regular" />
        </button></div>
      </header>
      {finding && <FindFriendsModal onClose={() => setFinding(false)} />}

      <div
        className="px-3 pb-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="relative">
          <MagnifyingGlass
            size={14}
            color="var(--text-secondary)"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            aria-label="Tìm kiếm cuộc trò chuyện"
            placeholder="Tìm kiếm cuộc trò chuyện"
            autoComplete="off"
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
      </div>

      <div className="flex-1 overflow-y-auto">
        {status === "loading" && items.length === 0 && (
          <div aria-busy="true" aria-label="Đang tải cuộc trò chuyện">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex h-16 animate-pulse items-center gap-3 px-3"
                style={{ background: "var(--bg-item-hover)", opacity: 1 - i * 0.1 }}
              />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center" role="alert">
            <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {error || "Không tải được danh sách."}
            </p>
            <button
              type="button"
              onClick={load}
              className="flex items-center gap-2 px-4"
              style={{
                height: "38px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                fontSize: "13px",
                background: "transparent",
              }}
            >
              <ArrowClockwise size={20} weight="regular" />
              Thử lại
            </button>
          </div>
        )}

        {status === "ready" && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-6 pt-10 text-center" role="status">
            <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {q
                ? "Không tìm thấy kết quả phù hợp"
                : "Chưa có cuộc trò chuyện nào"}
            </p>
            {!q && (
              <p className="m-0" style={{ fontSize: "13px", color: "var(--text-secondary)", opacity: 0.8 }}>
                Bấm dấu cộng phía trên để bắt đầu
              </p>
            )}
          </div>
        )}

        {filtered.map((item) => (
          <ConversationItem
            key={item.id}
            item={item}
            active={item.id === selectedId}
            onOpen={() => select(item.id)}
            onAction={(kind) => setConfirm({ kind, item })}
          />
        ))}
      </div>

      <CreateConversationModal open={creating} onClose={() => setCreating(false)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.kind === "delete" ? "Xóa cuộc trò chuyện?" : "Rời khỏi cuộc trò chuyện?"}
        description={
          confirm?.kind === "delete"
            ? "Hội thoại cùng toàn bộ tin nhắn sẽ bị xóa vĩnh viễn — không thể hoàn tác."
            : "Bạn sẽ không nhìn thấy hội thoại này nữa cho đến khi được thêm lại."
        }
        confirmLabel={confirm?.kind === "delete" ? "Xóa" : "Rời khỏi"}
        action={async () => {
          if (confirm?.kind === "delete") await remove(confirm.item.id);
          else await leave(confirm.item.id);
        }}
        onClose={() => setConfirm(null)}
      />
    </section>
  );
}
