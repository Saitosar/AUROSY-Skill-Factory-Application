import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Authoring from "./pages/Authoring";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingLayout, { LandingHome, LandingProduct, LandingPricing, LandingCompany } from "./pages/Landing";
import Pipeline from "./pages/Pipeline";
import PoseStudio from "./pages/PoseStudio";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import Help from "./pages/Help";
import Jobs from "./pages/Jobs";
import Packages from "./pages/Packages";
import Billing from "./pages/Billing";
import Settings from "./pages/Settings";
import AdminPanel from "./pages/AdminPanel";

/* ── Protected Route Wrapper ── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/* ── User Avatar + Dropdown ── */
function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email || "User";

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-avatar-btn" onClick={() => setOpen((v) => !v)} title={displayName}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={displayName} className="user-avatar-img" />
        ) : (
          <span className="user-avatar-fallback">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={displayName} className="user-avatar-img" />
              ) : (
                <span className="user-avatar-fallback">{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="user-dropdown-info">
              <span className="user-dropdown-name">{displayName}</span>
            </div>
          </div>
          <div className="user-dropdown-divider" />
          <button className="user-dropdown-item" onClick={() => { setOpen(false); navigate("/settings"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t("userMenu.profile", "Profile")}
          </button>
          <button className="user-dropdown-item" onClick={() => { setOpen(false); navigate("/settings"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            {t("userMenu.settings", "Settings")}
          </button>
          <div className="user-dropdown-divider" />
          <button className="user-dropdown-item user-dropdown-logout" onClick={() => { setOpen(false); logout(); navigate("/login"); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {t("userMenu.logout", "Log out")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public: Landing pages ── */}
      <Route path="/" element={<LandingLayout><LandingHome /></LandingLayout>} />
      <Route path="/product" element={<LandingLayout><LandingProduct /></LandingLayout>} />
      <Route path="/pricing" element={<LandingLayout><LandingPricing /></LandingLayout>} />
      <Route path="/company" element={<LandingLayout><LandingCompany /></LandingLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/panel" element={
        <ProtectedRoute>
          <AdminPanel />
        </ProtectedRoute>
      } />

      {/* ── Protected: App pages (with topbar) ── */}
      <Route path="/app/*" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      } />

      {/* Legacy routes → redirect to /app/ */}
      <Route path="/pose" element={<Navigate to="/app/pose" replace />} />
      <Route path="/authoring" element={<Navigate to="/app/authoring" replace />} />
      <Route path="/scenarios" element={<Navigate to="/app/scenarios" replace />} />
      <Route path="/pipeline" element={<Navigate to="/app/pipeline" replace />} />
      <Route path="/jobs" element={<Navigate to="/app/jobs" replace />} />
      <Route path="/jobs/:jobId" element={<Navigate to="/app/jobs" replace />} />
      <Route path="/packages" element={<Navigate to="/app/packages" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="/help" element={<Navigate to="/app/help" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ── App Shell (topbar + content, for authenticated users) ── */
function AppShell() {
  const { t } = useTranslation();

  const navItems = [
    { to: "/app", label: t("nav.home"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, end: true },
    { to: "/app/authoring", label: t("nav.authoring"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
    { to: "/app/pose", label: t("nav.poseStudio"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="16" x2="8" y2="22"/><line x1="12" y1="16" x2="16" y2="22"/></svg> },
    { to: "/app/scenarios", label: t("nav.scenarios"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
    { to: "/app/pipeline", label: t("nav.pipeline"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { to: "/app/jobs", label: t("nav.jobs"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg> },
    { to: "/app/packages", label: t("nav.packages"), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
    { to: "/app/billing", label: "Billing", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
  ];

  return (
    <div className="layout">
      {/* ── Top Navigation Bar ── */}
      <header className="topbar">
        <NavLink to="/" className="topbar-logo">
          <img src="/logo.svg" alt="AUROSY" style={{ height: 32, width: "auto" }} />
        </NavLink>
        <nav className="topbar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              end={item.end}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-right">
          <UserMenu />
          <NavLink to="/app/settings" className={({ isActive }) => `topbar-icon-link${isActive ? " active" : ""}`} title={t("nav.settings")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </NavLink>
          <NavLink to="/app/help" className={({ isActive }) => `topbar-icon-link${isActive ? " active" : ""}`} title={t("nav.help")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>
          </NavLink>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="layout-content">
        <main>
          <Routes>
            <Route index element={<Home />} />
            <Route path="authoring" element={<Authoring />} />
            <Route path="telemetry" element={<Navigate to="/app/pose" replace />} />
            <Route path="scenarios" element={<ScenarioBuilder />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:jobId" element={<Jobs />} />
            <Route path="packages" element={<Packages />} />
            <Route path="billing" element={<Billing />} />
            <Route path="pose" element={<PoseStudio />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
