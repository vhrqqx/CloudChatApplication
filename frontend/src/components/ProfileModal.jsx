import { useEffect, useRef, useState } from "react";
import {
  PencilSimple,
  Sun,
  Moon,
  CaretRight,
  CaretLeft,
  SignOut,
  Trash,
  Palette,
  Key,
  X,
} from "@phosphor-icons/react";
import Dialog from "./Dialog.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../store/auth.js";
import { useChat } from "../store/chat.js";
import { useFriends } from "../store/friends.js";
import { useTheme } from "../store/theme.js";
import Avatar from "./Avatar.jsx";
import { useUi } from "../store/ui.js";

export default function ProfileModal({ open, onClose }) {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const flashError = useUi((s) => s.flashError);
  const convCount = useChat((s) => s.items.length);
  const friendCount = useFriends((s) => s.friends.length);
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);

  const [page, setPage] = useState("main");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.username ?? "");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [deleteApprove, setDeleteApprove] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPage("main");
      setEditingName(false);
      setName(user?.username ?? "");
      setNameError(null);
    }
  }, [open, user?.username]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  if (!open) return null;

  const isDark = theme === "dark";

  async function saveName() {
    const username = name.trim();
    if (!username || username === user?.username) {
      setEditingName(false);
      return;
    }
    if (username.length > 50) {
      setNameError("Tên dài từ 1 đến 50 ký tự.");
      return;
    }
    setNameBusy(true);
    setNameError(null);
    try {
      const updated = await api("/user/me", { method: "PATCH", body: { username } });
      useChat.getState().renameMyself((updated?.username ?? username).trim());
      setEditingName(false);
    } catch (e) {
      setNameError(e.validationErrors?.username ?? e.message ?? "Đổi tên thất bại.");
    } finally {
      setNameBusy(false);
    }
  }

  async function deleteAccount() {
    setDeleteBusy(true);
    try {
      await api("/user/me", { method: "DELETE" });
      logout();
      useUi.getState().flashError("Tài khoản đã bị xóa.");
    } catch (e) {
      flashError(e.message || "Không xóa được tài khoản — thử lại.");
      setDeleteBusy(false);
    }
  }

  const rowStyle = (extra = {}) => ({
    display: "flex",
    width: "100%",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    ...extra,
  });
  const infoInput = {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: "13px",
    padding: "0 10px",
    height: 32,
  };

  return (
    <>
      <Dialog onClose={onClose} labelledById="profile-title" width={440} elevated={false}>
        <div className="p-5">

          <div className="flex items-center gap-2">
            {page === "password" ? (
              <button
                type="button"
                aria-label="Quay lại"
                onClick={() => setPage("main")}
                className="flex h-8 w-8 items-center justify-center"
                style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
              >
                <CaretLeft size={20} weight="regular" />
              </button>
            ) : null}
            <h2
              id="profile-title"
              className="m-0"
              style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}
            >
              {page === "password" ? "Đổi mật khẩu" : "Hồ sơ & Cài đặt"}
            </h2>
            <span className="flex-1" />
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center"
              style={{ border: "none", background: "none", color: "var(--text-secondary)" }}
            >
              <X size={16} weight="regular" />
            </button>
          </div>

          {page === "main" && (
            <>

              <section
                aria-label="Thẻ hồ sơ"
                className="relative mt-4 p-4"
                style={{
                  background: "var(--bg-rail)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                }}
              >

                <button
                  type="button"
                  aria-label={editingName ? "Hủy sửa tên" : "Sửa tên hiển thị"}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center"
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--bubble-them-bg)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => setEditingName((v) => !v)}
                >
                  <PencilSimple weight={editingName ? "fill" : "regular"} size={18} />
                </button>

                <div className="flex items-center gap-4">
                  <Avatar name={user?.username ?? ""} size={72} withPresence ringToken="--bg-rail" />
                  <div className="min-w-0 flex-1 pr-10">
                    <p
                      className="m-0 truncate"
                      style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {user?.username}
                    </p>
                    <p className="m-0 mt-0.5 truncate" style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {user?.userEmail}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>
                    Tên hiển thị
                    <span
                      className="flex items-center justify-between mt-0.5"
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                        height: 24,
                      }}
                    >
                      {editingName ? (
                        <input
                          ref={nameInputRef}
                          value={name}
                          maxLength={50}
                          onChange={(e) => setName(e.target.value.slice(0, 50))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveName();
                            else if (e.key === "Escape") setEditingName(false);
                          }}
                          aria-label="Tên hiển thị"
                          style={{
                            ...infoInput,
                            width: "100%",
                            marginTop: 2,
                            color: "var(--text-primary)",
                            fontSize: "12px",
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                          {user?.username}
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        style={{
                          fontSize: "10px",
                          whiteSpace: "nowrap",
                          cursor: editingName ? "pointer" : "default",
                        }}
                        role={editingName ? "button" : undefined}
                        tabIndex={editingName ? 0 : undefined}
                        onClick={(e) => {
                          if (editingName) {
                            saveName();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (editingName && e.key === "Enter") saveName();
                        }}
                      >
                        {editingName ? (nameBusy ? "Đang lưu…" : "Lưu") : ""}
                      </span>
                    </span>
                  </label>
                  <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>
                    Trạng thái
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        marginTop: 2,
                      }}
                    >
                      Đang hoạt động
                    </span>
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div
                    className="flex items-center justify-center p-2"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--bubble-them-bg)",
                      borderRadius: "var(--radius-sm)",
                    }}
                    aria-label="Số cuộc trò chuyện"
                  >
                    <p className="m-0" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      Cuộc trò chuyện:
                      <span className="tnum ml-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {convCount}
                      </span>
                    </p>
                  </div>
                  <div
                    className="flex items-center justify-center p-2"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--bubble-them-bg)",
                      borderRadius: "var(--radius-sm)",
                    }}
                    aria-label="Số bạn bè"
                  >
                    <p className="m-0" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      Bạn bè:
                      <span className="tnum ml-1" style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {friendCount}
                      </span>
                    </p>
                  </div>
                </div>
                {nameError && (
                  <p role="alert" className="mt-2 mb-0" style={{ fontSize: "12px", color: "var(--destructive)" }}>
                    {nameError}
                  </p>
                )}
              </section>

              <section aria-label="Cài đặt" className="mt-4 flex flex-col gap-2">

                <button
                  type="button"
                  style={rowStyle()}
                  onClick={() => toggleTheme()}
                  aria-label="Giao diện sáng tối"
                >
                  <Palette size={18} weight="regular" color="var(--text-secondary)" />
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                    Giao diện
                  </span>
                  <span className="flex-1" />
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    Sáng / Tối
                  </span>
                  <span
                    className="flex items-center gap-1"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 999,
                      background: "var(--bubble-them-bg)",
                      padding: "2px 10px",
                      fontSize: "12px",
                      color: "var(--text-primary)",
                    }}
                  >
                    {isDark ? <Moon size={12} /> : <Sun size={12} />}
                    {isDark ? "Tối" : "Sáng"}
                  </span>
                </button>

                <button
                  type="button"
                  style={rowStyle()}
                  onClick={() => setPage("password")}
                  aria-label="Đổi mật khẩu"
                >
                  <Key size={18} weight="regular" color="var(--text-secondary)" />
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                    Đổi mật khẩu
                  </span>
                  <span className="flex-1" />
                  <CaretRight size={14} weight="regular" color="var(--text-secondary)" />
                </button>

                <button
                  type="button"
                  style={rowStyle()}
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  aria-label="Đăng xuất"
                >
                  <SignOut size={18} weight="regular" color="var(--text-secondary)" />
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500 }}>
                    Đăng xuất
                  </span>
                  <span className="flex-1" />
                  <CaretRight size={14} weight="regular" color="var(--text-secondary)" />
                </button>

                <button
                  type="button"
                  style={rowStyle()}
                  onClick={() => setDeleteApprove(true)}
                  aria-label="Xóa tài khoản"
                >
                  <Trash size={18} weight="regular" color="var(--destructive)" />
                  <span style={{ fontSize: "13px", color: "var(--destructive)", fontWeight: 500 }}>
                    Xóa tài khoản
                  </span>
                  <span className="flex-1" />
                  <CaretRight size={14} weight="regular" color="var(--destructive)" />
                </button>
              </section>
            </>
          )}

          {page === "password" && (
            <PasswordPage onDone={() => setPage("main")} />
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteApprove}
        title="Xóa tài khoản vĩnh viễn?"
        description="Tài khoản sẽ bị xóa — không thể đăng nhập hay khôi phục. Các cuộc trò chuyện bạn tham gia vẫn giữ nguyên nhưng không nhắn tin được nữa."
        confirmLabel="Xóa tài khoản"
        action={deleteAccount}
        onClose={() => setDeleteApprove(false)}
      />
    </>
  );
}

function PasswordPage({ onDone }) {
  const logout = useAuth((s) => s.logout);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (next.length < 8 || next.length > 72) {
      setError("Mật khẩu mới phải từ 8 đến 72 ký tự.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/user/me/password", {
        method: "PUT",
        body: { currentPassword: cur, newPassword: next },
      });
      logout();
      useUi.getState().flashError("Đổi mật khẩu thành công — hãy đăng nhập lại bằng mật khẩu mới.");
    } catch (e) {
      setError(e.message || "Đổi mật khẩu thất bại.");
    } finally {
      setBusy(false);
    }
  }

  const input = {
    height: 36,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: "13px",
    padding: "0 10px",
  };
  void onDone;

  return (
    <div className="mt-4 flex flex-col gap-3" aria-label="Đổi mật khẩu">
      <input
        type="password"
        placeholder="Mật khẩu hiện tại"
        aria-label="Mật khẩu hiện tại"
        value={cur}
        onChange={(e) => setCur(e.target.value)}
        style={input}
        className="outline-none"
        autoComplete="current-password"
      />
      <input
        type="password"
        placeholder="Mật khẩu mới (8–72 ký tự)"
        aria-label="Mật khẩu mới"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        style={input}
        className="outline-none"
        autoComplete="new-password"
      />
      <button
        type="button"
        disabled={busy || !cur || next.length < 8}
        onClick={submit}
        style={{
          height: 36,
          border: "none",
          borderRadius: "var(--radius-sm)",
          background: "var(--accent)",
          color: "var(--on-accent)",
          fontSize: "13px",
          fontWeight: 600,
          opacity: busy || !cur || next.length < 8 ? 0.5 : 1,
        }}
      >
        {busy ? "Đang đổi…" : "Đổi mật khẩu"}
      </button>
      {error && (
        <p role="alert" className="m-0" style={{ fontSize: "12px", color: "var(--destructive)" }}>
          {error}
        </p>
      )}
      <p className="m-0" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
        Đổi xong hệ thống sẽ đăng xuất để bạn đăng nhập lại bằng mật khẩu mới.
      </p>
    </div>
  );
}
