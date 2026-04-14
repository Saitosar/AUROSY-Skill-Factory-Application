import { useState, useEffect, FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initialTab = location.pathname === "/register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync tab with URL changes
  useEffect(() => {
    setTab(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/app/pose", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "register") {
      if (form.password !== form.confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === "login") {
        await login(form.email, form.password);
      } else {
        await register({ email: form.email, password: form.password, name: form.name });
      }
      navigate("/app/pose");
    } catch (err: any) {
      setError(err.message || (tab === "login" ? "Login failed" : "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError("");
    navigate(t === "login" ? "/login" : "/register", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md">
        {/* Logo + back link */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1
              className="text-3xl font-bold tracking-wider"
              style={{
                backgroundImage: "linear-gradient(90deg, #a78bfa, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AUROSY
            </h1>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Skill Factory for Humanoid Robots</p>
        </div>

        {/* Card */}
        <div className="bg-[#161a22] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Gradient bar */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)" }} />

          <div className="p-8">
            {/* Title */}
            <h3
              className="text-xl font-bold mb-6"
              style={{
                backgroundImage: "linear-gradient(90deg, #a78bfa, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {tab === "login" ? "Welcome back" : "Create account"}
            </h3>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-white/[0.04] rounded-xl">
              <button
                onClick={() => switchTab("login")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${tab === "login" ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchTab("register")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${tab === "register" ? "bg-white/[0.08] text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                Sign Up
              </button>
            </div>

            {/* Trial banner (register only) */}
            {tab === "register" && (
              <div className="mb-4 px-4 py-3 rounded-xl border" style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: "#a78bfa" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  20-day free trial included
                </p>
                <p className="text-gray-400 text-xs mt-1">Full Pro access. No credit card required.</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
              )}
              {tab === "register" && (
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Name"
                />
              )}
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Email"
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Password"
              />
              {tab === "register" && (
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Confirm password"
                />
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                  color: "#0d1117",
                  boxShadow: "0 0 20px rgba(167,139,250,0.3)",
                }}
              >
                {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account & Start Trial"}
              </button>
            </form>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
