import { useState } from "react";
import { useAuth } from "../store/auth.js";

export default function AuthScreen() {
  return (
    <div
      className="flex h-full items-center justify-center p-4"
      style={{ background: "var(--bg-chat)" }}
    >
      <AuthCard />
    </div>
  );
}

const inputStyle = {
  height: "38px",
  width: "100%",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: "14px",
  padding: "0 12px",
};

function Field({ id, label, type = "text", value, onChange, autoFocus, error, rest }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        style={{ ...inputStyle, marginTop: 6, borderColor: error ? "var(--destructive)" : "var(--border)" }}
        {...rest}
      />
      {error && (
        <p role="alert" className="mt-1 mb-0" style={{ fontSize: "13px", color: "var(--destructive)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function AuthCard() {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [formError, setFormError] = useState(null);

  function switchMode(next) {
    setMode(next);
    setErrors({});
    setFormError(null);
    setNotice(null);
  }

  function validate() {
    const next = {};
    if (mode === "register") {
      if (!username.trim()) next.username = "Hãy cho biết tên của bạn.";
      else if (username.trim().length > 50) next.username = "Tên tối đa 50 ký tự.";
      if (!password) next.password = "Cần mật khẩu.";
      else if (password.length < 8) next.password = "Mật khẩu cần ít nhất 8 ký tự.";
      else if (password.length > 72) next.password = "Mật khẩu tối đa 72 ký tự.";
      else if (password !== confirmPassword) next.confirmPassword = "Mật khẩu nhập lại chưa khớp.";
    } else if (!password) {
      next.password = "Cần mật khẩu.";
    }
    if (!email.trim()) next.email = "Cần email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Email chưa đúng.";
    return next;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      if (mode === "register") {
        await register({ username: username.trim(), userEmail: email.trim(), password });
        setNotice("Tài khoản đã được tạo. Đăng nhập để tiếp tục.");
        setPassword("");
        setConfirmPassword("");
        setErrors({});
        setMode("login");
      } else {
        await login(email.trim(), password);

      }
    } catch (err) {
      if (err.status === 401) setFormError("Email hoặc mật khẩu chưa đúng.");
      else if (err.status === 400) setFormError("Thông tin chưa hợp lệ — xem lại các thông tin vừa nhập.");
      else if (err.status === 0) setFormError(err.message);
      else setFormError(err.message || "Có lỗi, thử lại sau.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { fontSize: 13 };

  return (
    <div
      className="w-[360px] border"
      style={{
        background: "var(--bubble-them-bg)",
        borderColor: "var(--border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <form className="p-6" onSubmit={onSubmit} noValidate>
        <h1 className="mt-0" style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </h1>

        {mode === "login" && (
          <div className="mt-4">
            <Field
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoFocus
              error={errors.email}
              rest={{ autoComplete: "email" }}
            />
          </div>
        )}

        {mode === "register" && (
          <>
            <Field
              id="username"
              label="Tên của bạn"
              value={username}
              onChange={setUsername}
              autoFocus
              error={errors.username}
              rest={{ maxLength: 50 }}
            />
            <div className="mt-4">
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                error={errors.email}
                rest={{ autoComplete: "email" }}
              />
            </div>
          </>
        )}

        <div className="mt-4">
          <Field
            id="password"
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            rest={{
              autoComplete: mode === "login" ? "current-password" : "new-password",
              maxLength: mode === "register" ? 72 : undefined,
            }}
          />
        </div>

        {mode === "register" && (
          <div className="mt-4">
            <Field
              id="confirmPassword"
              label="Nhập lại mật khẩu"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={errors.confirmPassword}
            />
          </div>
        )}

        {formError && (
          <p role="alert" className="mt-4 mb-0" style={{ ...fieldStyle, color: "var(--destructive)" }}>
            {formError}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-4 mb-0 border px-3 py-2"
            style={{
              ...fieldStyle,
              color: "var(--text-primary)",
              background: "var(--bg-item-hover)",
              borderColor: "var(--border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-[38px] w-full items-center justify-center"
          style={{
            border: "none",
            borderRadius: "var(--radius-sm)",
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: "14px",
            fontWeight: 600,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy
            ? "Đang gửi…"
            : mode === "login"
              ? "Đăng nhập"
              : "Tạo tài khoản"}
        </button>

        <p className="mt-4 mb-0 text-center" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {mode === "login" ? (
            <>
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Tạo tài khoản
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
