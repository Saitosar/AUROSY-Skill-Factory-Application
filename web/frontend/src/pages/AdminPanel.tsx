import { useState, useEffect, useCallback, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return API_BASE ? `${API_BASE.replace(/\/$/, "")}${p}` : p;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  user_type: string;
  industry: string;
  plan: string;
  trial_ends_at: string | null;
  created_at: string;
}

function planBadge(plan: string | null) {
  const p = plan || "free";
  const colors: Record<string, string> = {
    trial: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    pro: "bg-green-500/20 text-green-300 border-green-500/30",
    enterprise: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    free: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colors[p] || colors.free}`}>
      {p.charAt(0).toUpperCase() + p.slice(1)}
    </span>
  );
}

function trialStatus(trial_ends_at: string | null) {
  if (!trial_ends_at) return <span className="text-gray-500 text-xs">—</span>;
  const end = new Date(trial_ends_at);
  const now = new Date();
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return <span className="text-red-400 text-xs font-medium">Expired</span>;
  return <span className="text-purple-300 text-xs font-medium">{days}d left</span>;
}

function AdminLogin() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span className="text-xl font-bold text-purple-400">Admin Panel</span>
          </div>
          <p className="text-gray-500 text-sm">Sign in with admin credentials</p>
        </div>
        <div className="bg-[#161a22] rounded-2xl p-8 border border-white/[0.08]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Admin email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/admin/users"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Access denied");
      const data = await res.json();
      setUsers(data);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (!user) {
    return <AdminLogin />;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">Admin privileges required.</p>
          <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm">Back to home</Link>
        </div>
      </div>
    );
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateUser = async (userId: number, data: Record<string, any>) => {
    setActionLoading(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed");
      }
      showToast("User updated");
      await fetchUsers();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed");
      }
      showToast("User deleted");
      await fetchUsers();
    } catch (e: any) {
      showToast(`Error: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    trial: users.filter((u) => u.plan === "trial").length,
    pro: users.filter((u) => u.plan === "pro").length,
    free: users.filter((u) => !u.plan || u.plan === "free").length,
  };

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-purple-600/90 backdrop-blur-sm text-white rounded-xl shadow-2xl text-sm font-medium animate-pulse">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F14]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.svg" alt="AUROSY" style={{ height: 28 }} />
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span className="text-sm font-bold text-purple-400 tracking-wide">Admin Panel</span>
            </div>
          </div>
          <Link
            to="/app"
            className="text-sm px-4 py-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-white/[0.06] transition-all"
          >
            Back to App
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats.total, icon: "👥", color: "purple" },
            { label: "Active Trials", value: stats.trial, icon: "⏱", color: "purple" },
            { label: "Pro Users", value: stats.pro, icon: "⭐", color: "green" },
            { label: "Free Users", value: stats.free, icon: "🆓", color: "gray" },
          ].map((s) => (
            <div key={s.label} className="bg-[#161a22] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{s.label}</span>
                <span className="text-lg">{s.icon}</span>
              </div>
              <span className="text-2xl font-bold text-white">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <span className="text-gray-500 text-sm">{filtered.length} users</span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading users...</div>
        ) : (
          /* Users Table */
          <div className="bg-[#161a22] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trial</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered</th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-sm font-semibold flex-shrink-0">
                            {(u.name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white text-sm font-medium truncate">{u.name || "—"}</div>
                            <div className="text-gray-500 text-xs truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">{planBadge(u.plan)}</td>
                      <td className="px-5 py-4">{trialStatus(u.trial_ends_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium ${u.role === "admin" ? "text-amber-400" : "text-gray-400"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Extend trial +20 days */}
                          <button
                            onClick={() => updateUser(u.id, { plan: "trial", trial_days: 20 })}
                            disabled={actionLoading === u.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all cursor-pointer disabled:opacity-50"
                            title="Give 20-day trial"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          </button>
                          {/* Set Pro */}
                          <button
                            onClick={() => updateUser(u.id, { plan: "pro" })}
                            disabled={actionLoading === u.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-green-300 hover:bg-green-500/10 transition-all cursor-pointer disabled:opacity-50"
                            title="Set Pro plan"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          </button>
                          {/* Revoke to Free */}
                          <button
                            onClick={() => updateUser(u.id, { plan: "free" })}
                            disabled={actionLoading === u.id}
                            className="p-2 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer disabled:opacity-50"
                            title="Set Free plan"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                          </button>
                          {/* Delete */}
                          {u.role !== "admin" && (
                            <button
                              onClick={() => deleteUser(u.id, u.email)}
                              disabled={actionLoading === u.id}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50"
                              title="Delete user"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
