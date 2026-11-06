import { useState } from "react";
import { loginDemoUser, loginUser, registerUser } from "../api";
import type { User } from "../types";

interface Props {
  onSuccess: (user: User) => void;
}

export default function AuthModal({ onSuccess }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser(cleanUser, password);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password || !displayName.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password.length < 4) {
      setError("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser(cleanUser, password, displayName.trim());
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError("");
    setLoading(true);
    try {
      const res = await loginDemoUser();
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบด้วย Demo ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(10, 15, 30, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "430px",
          border: "1px solid var(--brand, #3b82f6)",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "0.5rem" }}>💳</div>
          <h2 style={{ fontSize: "1.45rem", marginBottom: "0.25rem" }}>FinOS</h2>
          <p style={{ color: "var(--muted, #94a3b8)", fontSize: "0.88rem" }}>
            ระบบบันทึกรายรับ-รายจ่ายส่วนบุคคล
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: "flex",
            background: "rgba(255, 255, 255, 0.05)",
            padding: "0.25rem",
            borderRadius: "8px",
          }}
        >
          <button
            type="button"
            className={tab === "login" ? "primary" : "ghost"}
            onClick={() => {
              setTab("login");
              setError("");
            }}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem" }}
          >
            🔑 เข้าสู่ระบบ
          </button>
          <button
            type="button"
            className={tab === "register" ? "primary" : "ghost"}
            onClick={() => {
              setTab("register");
              setError("");
            }}
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.9rem" }}
          >
            ✨ สมัครสมาชิกใหม่
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {tab === "login" ? (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label>
              ชื่อผู้ใช้ (Username)
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น student1, somchai"
                required
              />
            </label>
            <label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>รหัสผ่าน (Password)</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ fontSize: "0.78rem", padding: "0.1rem 0.4rem" }}
                >
                  {showPassword ? "🙈 ซ่อน" : "👁️ แสดง"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ width: "100%", padding: "0.7rem", marginTop: "0.25rem" }}
            >
              {loading ? "กำลังตรวจสอบ..." : "🚀 เข้าสู่ระบบ"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <label>
              ชื่อที่ต้องการให้แสดง (Display Name)
              <input
                type="text"
                name="name"
                autoCapitalize="words"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="เช่น น้องพลอย, สมชาย"
                required
              />
            </label>
            <label>
              ชื่อผู้ใช้ภาษาอังกฤษ (Username)
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น ploy_s, somchai68"
                required
              />
            </label>
            <label>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>กำหนดรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)</span>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowPassword((p) => !p)}
                  style={{ fontSize: "0.78rem", padding: "0.1rem 0.4rem" }}
                >
                  {showPassword ? "🙈 ซ่อน" : "👁️ แสดง"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="new-password"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{ width: "100%", padding: "0.7rem", marginTop: "0.25rem" }}
            >
              {loading ? "กำลังสร้างบัญชี..." : "✨ สร้างบัญชีและเข้าใช้งาน"}
            </button>
          </form>
        )}

        <div style={{ position: "relative", textAlign: "center", margin: "0.25rem 0" }}>
          <hr style={{ border: 0, borderTop: "1px solid rgba(255,255,255,0.1)" }} />
          <span
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--card-bg, #1e293b)",
              padding: "0 0.6rem",
              fontSize: "0.78rem",
              color: "var(--muted, #94a3b8)",
            }}
          >
            หรือ
          </span>
        </div>

        <button
          type="button"
          className="outline"
          onClick={handleDemo}
          disabled={loading}
          style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}
        >
          🧪 ทดลองใช้งานด่วน (Demo Account)
        </button>
      </div>
    </div>
  );
}
