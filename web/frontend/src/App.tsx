import { useTranslation } from "react-i18next";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Authoring from "./pages/Authoring";
import Home from "./pages/Home";
import Pipeline from "./pages/Pipeline";
import PoseStudio from "./pages/PoseStudio";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import Help from "./pages/Help";
import Jobs from "./pages/Jobs";
import Packages from "./pages/Packages";
import Settings from "./pages/Settings";

export default function App() {
  const { t } = useTranslation();

  return (
    <div className="layout">
      {/* ── Top Navigation Bar ── */}
      <header className="topbar">
        <NavLink to="/" className="topbar-logo">
          AUROSY
        </NavLink>
        <nav className="topbar-nav">
          <NavLink end to="/" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.home")}
          </NavLink>
          <NavLink to="/authoring" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.authoring")}
          </NavLink>
          <NavLink to="/pose" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.poseStudio")}
          </NavLink>
          <NavLink to="/scenarios" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.scenarios")}
          </NavLink>
          <NavLink to="/pipeline" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.pipeline")}
          </NavLink>
          <NavLink to="/jobs" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.jobs")}
          </NavLink>
          <NavLink to="/packages" className={({ isActive }) => (isActive ? "active" : "")}>
            {t("nav.packages")}
          </NavLink>
        </nav>
        <div className="topbar-right">
          <NavLink to="/help" className={({ isActive }) => `topbar-icon-link${isActive ? " active" : ""}`} title={t("nav.help")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `topbar-icon-link${isActive ? " active" : ""}`} title={t("nav.settings")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </NavLink>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="layout-content">
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/authoring" element={<Authoring />} />
            <Route path="/telemetry" element={<Navigate to="/pose" replace />} />
            <Route path="/scenarios" element={<ScenarioBuilder />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:jobId" element={<Jobs />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/pose" element={<PoseStudio />} />
            <Route path="/help" element={<Help />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
