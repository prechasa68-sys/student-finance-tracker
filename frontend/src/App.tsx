import { NavLink, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStoredUser, logoutUser } from "./api";
import type { User } from "./types";
import AuthModal from "./components/AuthModal";
import DashboardPage from "./pages/DashboardPage";
import TransactionsPage from "./pages/TransactionsPage";
import CategoriesPage from "./pages/CategoriesPage";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    function handleAuthChange() {
      setCurrentUser(getStoredUser());
    }
    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div className="app-shell">
      {!currentUser && <AuthModal onSuccess={(user) => setCurrentUser(user)} />}

      <header className="topbar-container">
        <div className="topbar">
          <div className="brand-section">
            <div className="brand-logo">💳</div>
            <div className="brand-text">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1>FinOS</h1>
                <span className="brand-badge">บันทึกรายรับ-รายจ่าย</span>
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            {currentUser && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  👤 <b>{currentUser.display_name}</b> <small>({currentUser.username})</small>
                </span>
                <button
                  type="button"
                  className="ghost"
                  style={{ fontSize: "0.8rem", padding: "0.25rem 0.55rem" }}
                  onClick={() => logoutUser()}
                  title="ออกจากระบบ"
                >
                  🚪 ออกจากระบบ
                </button>
              </div>
            )}
            <button className="theme-toggle-btn" onClick={toggleTheme} title="เปลี่ยนธีม">
              {theme === "light" ? "🌙 โหมดมืด" : "☀️ โหมดสว่าง"}
            </button>
            <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)}>
              ☰ เมนู
            </button>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className={menuOpen ? "sidebar open" : "sidebar"}>
          <nav onClick={() => setMenuOpen(false)}>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <div className="link-content">
                <span className="nav-icon">📊</span>
                <span>Dashboard ภาพรวม</span>
              </div>
            </NavLink>
            <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <div className="link-content">
                <span className="nav-icon">📑</span>
                <span>รายการธุรกรรม</span>
              </div>
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              <div className="link-content">
                <span className="nav-icon">🏷️</span>
                <span>หมวดหมู่</span>
              </div>
            </NavLink>
          </nav>
        </aside>

        <main className="content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
