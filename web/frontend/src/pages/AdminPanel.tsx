import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { Link } from "react-router-dom";

const ADMIN_TOKEN_KEY = "aurosy_admin_token";

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

interface AdminProject {
  id: number;
  name: string;
  description: string;
  robot_model: string;
  created_at: string;
  updated_at: string | null;
}

interface ClientDetail extends AdminUser {
  avatar_url: string;
  projects_count: number;
  projects: AdminProject[];
}

const ROLES = ["user", "admin", "moderator"] as const;
const PLANS = ["free", "trial", "pro", "enterprise"] as const;

/* ── Helpers ── */
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

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    admin: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    moderator: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    user: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colors[role] || colors.user}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
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

/* ── Icons ── */
const Icons = {
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  clock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  star: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  key: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  edit: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  chevDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>,
};

/* ── Admin Login ── */
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Login failed");
      }
      const { access_token } = await res.json();
      // Verify admin role before storing
      const meRes = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!meRes.ok) throw new Error("Failed to verify user");
      const user = await meRes.json();
      if (user.role !== "admin") throw new Error("Admin privileges required");
      localStorage.setItem(ADMIN_TOKEN_KEY, access_token);
      onLogin(access_token);
    } catch (err: any) { setError(err.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span className="text-xl font-bold text-purple-400">Admin Panel</span>
          </div>
          <p className="text-gray-500 text-sm">Sign in with admin credentials</p>
        </div>
        <div className="bg-[#161a22] rounded-2xl p-8 border border-white/[0.08]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" placeholder="Admin email" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" placeholder="Password" />
            <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Clients Section ── */
function UsersSection({ token, showToast, onOpenClient }: { token: string; showToast: (m: string) => void; onOpenClient: (id: number) => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/users"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Access denied");
      setUsers(await res.json());
      setError("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateUser = async (userId: number, data: Record<string, any>) => {
    setActionLoading(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("User updated");
      await fetchUsers();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    setActionLoading(userId);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("User deleted");
      await fetchUsers();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const changePassword = async (userId: number) => {
    if (newPw.length < 6) { showToast("Password must be at least 6 characters"); return; }
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/password`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPw }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Password changed");
      setPwUser(null); setNewPw("");
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  // Only show regular users (not admins/moderators)
  const customers = users.filter((u) => u.role === "user");
  const filtered = customers.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) || u.name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: customers.length,
    trial: customers.filter((u) => u.plan === "trial").length,
    pro: customers.filter((u) => u.plan === "pro").length,
    free: customers.filter((u) => !u.plan || u.plan === "free").length,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Clients", value: stats.total, color: "from-purple-600/20 to-purple-800/10", border: "border-purple-500/20" },
          { label: "Active Trials", value: stats.trial, color: "from-purple-600/20 to-purple-800/10", border: "border-purple-500/20" },
          { label: "Pro Clients", value: stats.pro, color: "from-green-600/20 to-green-800/10", border: "border-green-500/20" },
          { label: "Free Clients", value: stats.free, color: "from-gray-600/10 to-gray-800/5", border: "border-gray-500/15" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.color} border ${s.border} rounded-xl p-5`}>
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">{s.label}</span>
            <div className="text-3xl font-bold text-white mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{Icons.search}</span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#161a22] border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors" />
        </div>
        <span className="text-gray-500 text-sm">{filtered.length} clients</span>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-red-400 text-sm">{error}</div>}

      {loading ? <div className="text-center py-20 text-gray-500">Loading clients...</div> : (
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
                  <tr key={u.id} onClick={() => onOpenClient(u.id)} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer">
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
                    <td className="px-5 py-4">{roleBadge(u.role)}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setEditUser(u)} disabled={actionLoading === u.id} className="p-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all cursor-pointer disabled:opacity-50" title="Edit user">{Icons.edit}</button>
                        <button onClick={() => setPwUser(u)} className="p-2 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer" title="Change password">{Icons.key}</button>
                        <button onClick={() => updateUser(u.id, { plan: "trial", trial_days: 20 })} disabled={actionLoading === u.id} className="p-2 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all cursor-pointer disabled:opacity-50" title="Give 20-day trial">{Icons.clock}</button>
                        <button onClick={() => updateUser(u.id, { plan: "pro" })} disabled={actionLoading === u.id} className="p-2 rounded-lg text-gray-400 hover:text-green-300 hover:bg-green-500/10 transition-all cursor-pointer disabled:opacity-50" title="Set Pro">{Icons.star}</button>
                        <button onClick={() => deleteUser(u.id, u.email)} disabled={actionLoading === u.id} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50" title="Delete user">{Icons.trash}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500 text-sm">No clients found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.email}`} onClose={() => setEditUser(null)}>
          <EditUserForm user={editUser} onSave={async (data) => { await updateUser(editUser.id, data); setEditUser(null); }} />
        </Modal>
      )}

      {/* Change Password Modal */}
      {pwUser && (
        <Modal title={`Change password — ${pwUser.email}`} onClose={() => { setPwUser(null); setNewPw(""); }}>
          <div className="space-y-4">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
            <button onClick={() => changePassword(pwUser.id)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer">Change Password</button>
          </div>
        </Modal>
      )}

    </>
  );
}

/* ── Settings Section ── */
function SettingsSection({ token, showToast }: { token: string; showToast: (m: string) => void }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const saveName = async () => {
    setSaving(true);
    try { await updateUser({ name }); showToast("Name updated"); }
    catch (e: any) { showToast(`Error: ${e.message}`); }
    finally { setSaving(false); }
  };

  const changeMyPassword = async () => {
    if (newPw.length < 6) { showToast("Password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { showToast("Passwords don't match"); return; }
    setChangingPw(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${user!.id}/password`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPw }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Password changed");
      setNewPw(""); setConfirmPw("");
    } catch (e: any) { showToast(`Error: ${e.message}`); }
    finally { setChangingPw(false); }
  };

  // Fetch team members (admins/moderators)
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [pwTeamUser, setPwTeamUser] = useState<AdminUser | null>(null);
  const [teamNewPw, setTeamNewPw] = useState("");

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/users"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const all: AdminUser[] = await res.json();
      setTeam(all.filter((u) => u.role === "admin" || u.role === "moderator"));
    } catch { /* ignore */ }
    finally { setTeamLoading(false); }
  }, [token]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const changeTeamPassword = async (userId: number) => {
    if (teamNewPw.length < 6) { showToast("Password must be at least 6 characters"); return; }
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/password`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: teamNewPw }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Password changed");
      setPwTeamUser(null); setTeamNewPw("");
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  const deleteTeamUser = async (userId: number, email: string) => {
    if (!confirm(`Remove team member ${email}?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Team member removed");
      await fetchTeam();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Profile */}
      <div className="bg-[#161a22] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-1">Profile</h3>
        <p className="text-gray-500 text-sm mb-5">Manage your admin account</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" value={user?.email || ""} disabled className="w-full px-4 py-3 bg-[#0B0F14] border border-white/[0.06] rounded-xl text-gray-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" placeholder="Your name" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Role:</span>
            {roleBadge(user?.role || "admin")}
          </div>
          <button onClick={saveName} disabled={saving} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-[#161a22] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-1">Change Password</h3>
        <p className="text-gray-500 text-sm mb-5">Update your admin password</p>
        <div className="space-y-4">
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
          <button onClick={changeMyPassword} disabled={changingPw || !newPw} className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
            {changingPw ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-[#161a22] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold mb-1">Team Members</h3>
            <p className="text-gray-500 text-sm">Manage admins and moderators</p>
          </div>
          <button onClick={() => setShowCreateTeam(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer">
            {Icons.plus} Add Member
          </button>
        </div>

        {teamLoading ? <div className="text-gray-500 text-sm py-4">Loading...</div> : (
          <div className="space-y-3">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-sm font-semibold">
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white text-sm font-medium">{m.name || "—"}</div>
                    <div className="text-gray-500 text-xs">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {roleBadge(m.role)}
                  <button onClick={() => setPwTeamUser(m)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all cursor-pointer" title="Change password">{Icons.key}</button>
                  {m.id !== user!.id && (
                    <button onClick={() => deleteTeamUser(m.id, m.email)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Remove">{Icons.trash}</button>
                  )}
                </div>
              </div>
            ))}
            {team.length === 0 && <div className="text-gray-500 text-sm py-4 text-center">No team members yet</div>}
          </div>
        )}
      </div>

      {/* Create Team Member Modal */}
      {showCreateTeam && (
        <Modal title="Add Team Member" onClose={() => setShowCreateTeam(false)}>
          <CreateUserForm token={token} onCreated={() => { setShowCreateTeam(false); fetchTeam(); showToast("Team member added"); }} onError={(m) => showToast(`Error: ${m}`)} />
        </Modal>
      )}

      {/* Change Team Member Password Modal */}
      {pwTeamUser && (
        <Modal title={`Change password — ${pwTeamUser.email}`} onClose={() => { setPwTeamUser(null); setTeamNewPw(""); }}>
          <div className="space-y-4">
            <input type="password" value={teamNewPw} onChange={(e) => setTeamNewPw(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
            <button onClick={() => changeTeamPassword(pwTeamUser.id)} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer">Change Password</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Edit User Form ── */
function EditUserForm({ user, onSave }: { user: AdminUser; onSave: (data: Record<string, any>) => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [plan, setPlan] = useState(user.plan || "free");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => { setSaving(true); await onSave({ name, role, plan }); setSaving(false); };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
          {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}

/* ── Create User Form ── */
function CreateUserForm({ token, onCreated, onError }: { token: string; onCreated: () => void; onError: (m: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/users"), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, password, name, role, plan }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      onCreated();
    } catch (e: any) { onError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password (min 6 chars)" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
            {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <button type="submit" disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}

/* ── Client Profile ── */
function ClientProfile({ clientId, token, showToast, onBack }: { clientId: number; token: string; showToast: (m: string) => void; onBack: () => void }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [extendDays, setExtendDays] = useState(20);
  const [extendPlan, setExtendPlan] = useState("trial");
  const [extending, setExtending] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [pwUser, setPwUser] = useState<AdminUser | null>(null);
  const [newPw, setNewPw] = useState("");

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${clientId}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load client");
      setClient(await res.json());
    } catch { showToast("Failed to load client"); onBack(); }
    finally { setLoading(false); }
  }, [clientId, token]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const extendSubscription = async () => {
    setExtending(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${clientId}/extend`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: extendPlan, days: extendDays }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast(`Subscription extended by ${extendDays} days`);
      await fetchClient();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
    finally { setExtending(false); }
  };

  const updateClient = async (data: Record<string, any>) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${clientId}`), {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Client updated");
      setEditUser(null);
      await fetchClient();
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  const changePassword = async () => {
    if (newPw.length < 6) { showToast("Password must be at least 6 characters"); return; }
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${clientId}/password`), {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPw }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Failed"); }
      showToast("Password changed");
      setPwUser(null); setNewPw("");
    } catch (e: any) { showToast(`Error: ${e.message}`); }
  };

  if (loading || !client) return <div className="text-center py-20 text-gray-500">Loading client...</div>;

  const trialEnd = client.trial_ends_at ? new Date(client.trial_ends_at) : null;
  const now = new Date();
  const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const accountAge = Math.floor((now.getTime() - new Date(client.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      {/* Back button + header */}
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors cursor-pointer group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Clients
      </button>

      {/* Profile Header */}
      <div className="bg-[#161a22] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-purple-800/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-2xl font-bold">
              {(client.name || client.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{client.name || "—"}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{client.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {planBadge(client.plan)}
                {client.user_type && client.user_type !== "individual" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border bg-blue-500/15 text-blue-300 border-blue-500/25">{client.user_type}</span>
                )}
                {client.industry && (
                  <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border bg-gray-500/15 text-gray-300 border-gray-500/25">{client.industry}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditUser(client)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer">{Icons.edit} Edit</button>
            <button onClick={() => setPwUser(client)} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer">{Icons.key} Password</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Subscription */}
        <div className="lg:col-span-2 bg-[#161a22] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">{Icons.star} Subscription</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#0B0F14]/60 rounded-xl p-4 border border-white/[0.04]">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Plan</span>
              <div className="mt-1">{planBadge(client.plan)}</div>
            </div>
            <div className="bg-[#0B0F14]/60 rounded-xl p-4 border border-white/[0.04]">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Status</span>
              <div className="mt-1">
                {daysLeft === null ? (
                  <span className="text-gray-400 text-sm">No subscription</span>
                ) : daysLeft <= 0 ? (
                  <span className="text-red-400 text-sm font-medium">Expired</span>
                ) : daysLeft <= 3 ? (
                  <span className="text-amber-400 text-sm font-medium">{daysLeft}d left</span>
                ) : (
                  <span className="text-green-400 text-sm font-medium">{daysLeft}d left</span>
                )}
              </div>
            </div>
            <div className="bg-[#0B0F14]/60 rounded-xl p-4 border border-white/[0.04]">
              <span className="text-gray-500 text-xs uppercase tracking-wider">Expires</span>
              <div className="text-white text-sm mt-1">
                {trialEnd ? trialEnd.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </div>
            </div>
          </div>

          {/* Trial progress bar */}
          {client.plan === "trial" && trialEnd && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500">Trial Progress</span>
                <span className={daysLeft! <= 3 ? "text-amber-400" : "text-purple-300"}>{Math.max(0, daysLeft!)} / 20 days</span>
              </div>
              <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${daysLeft! <= 3 ? "bg-amber-500" : daysLeft! <= 0 ? "bg-red-500" : "bg-purple-500"}`}
                  style={{ width: `${Math.min(100, Math.max(0, ((20 - Math.max(0, daysLeft!)) / 20) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Extend subscription */}
          <div className="border-t border-white/[0.06] pt-5">
            <h4 className="text-gray-300 text-sm font-medium mb-3">Extend Subscription</h4>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Plan</label>
                <select value={extendPlan} onChange={(e) => setExtendPlan(e.target.value)}
                  className="px-3 py-2 bg-[#0B0F14] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-colors cursor-pointer">
                  <option value="trial">Trial</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Days</label>
                <input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} min={1} max={365}
                  className="w-20 px-3 py-2 bg-[#0B0F14] border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div className="flex gap-2">
                {[7, 14, 30, 90].map((d) => (
                  <button key={d} onClick={() => setExtendDays(d)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${extendDays === d ? "bg-purple-600/20 text-purple-300 border-purple-500/30" : "bg-white/[0.02] text-gray-400 border-white/[0.06] hover:text-white"}`}>
                    {d}d
                  </button>
                ))}
              </div>
              <button onClick={extendSubscription} disabled={extending}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed">
                {extending ? "Extending..." : "Extend"}
              </button>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-[#161a22] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">{Icons.clock} Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
              <span className="text-gray-400 text-sm">Account Age</span>
              <span className="text-white text-sm font-medium">{accountAge}d</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
              <span className="text-gray-400 text-sm">Registered</span>
              <span className="text-white text-sm font-medium">{new Date(client.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
              <span className="text-gray-400 text-sm">Projects</span>
              <span className="text-white text-sm font-medium">{client.projects_count}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
              <span className="text-gray-400 text-sm">Skills Created</span>
              <span className="text-purple-300 text-sm font-medium">{client.projects_count}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
              <span className="text-gray-400 text-sm">User Type</span>
              <span className="text-white text-sm font-medium capitalize">{client.user_type || "individual"}</span>
            </div>
            {client.industry && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F14]/60 border border-white/[0.04]">
                <span className="text-gray-400 text-sm">Industry</span>
                <span className="text-white text-sm font-medium">{client.industry}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Projects / Skills */}
      <div className="bg-[#161a22] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            Projects & Skills
          </h3>
          <span className="text-gray-500 text-sm">{client.projects.length} total</span>
        </div>

        {client.projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl mb-3 opacity-30">📁</div>
            <p className="text-gray-500 text-sm">No projects created yet</p>
            <p className="text-gray-600 text-xs mt-1">Projects will appear here when the client starts creating skills</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {client.projects.map((p) => (
              <div key={p.id} className="bg-[#0B0F14]/60 rounded-xl p-4 border border-white/[0.04] hover:border-purple-500/20 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white text-sm font-medium truncate flex-1">{p.name}</h4>
                  {p.robot_model && (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 ml-2 flex-shrink-0">
                      {p.robot_model}
                    </span>
                  )}
                </div>
                {p.description && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex items-center justify-between text-[10px] text-gray-600">
                  <span>Created {new Date(p.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                  {p.updated_at && <span>Updated {new Date(p.updated_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editUser && (
        <Modal title={`Edit — ${editUser.email}`} onClose={() => setEditUser(null)}>
          <EditUserForm user={editUser} onSave={async (data) => { await updateClient(data); }} />
        </Modal>
      )}

      {/* Password Modal */}
      {pwUser && (
        <Modal title={`Change password — ${pwUser.email}`} onClose={() => { setPwUser(null); setNewPw(""); }}>
          <div className="space-y-4">
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors" />
            <button onClick={changePassword} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-colors cursor-pointer">Change Password</button>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Modal ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-[#161a22] rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Notification Sound ── */
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    // Two-tone chime
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* ignore if audio not available */ }
}

interface Notification {
  id: number;
  email: string;
  name: string;
  plan: string;
  created_at: string;
  read: boolean;
}

/* ── Notification Bell ── */
function NotificationBell({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const bellRef = useRef<HTMLDivElement>(null);
  const initialLoad = useRef(true);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Poll for new users
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/users"), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const users: AdminUser[] = await res.json();
        const trialUsers = users.filter((u) => u.plan === "trial");

        if (initialLoad.current) {
          // First load — just record known IDs, no sound
          setKnownIds(new Set(trialUsers.map((u) => u.id)));
          initialLoad.current = false;
          return;
        }

        const currentIds = new Set(trialUsers.map((u) => u.id));
        const newUsers = trialUsers.filter((u) => !knownIds.has(u.id));

        if (newUsers.length > 0) {
          playNotificationSound();
          setNotifications((prev) => [
            ...newUsers.map((u) => ({
              id: u.id, email: u.email, name: u.name, plan: u.plan,
              created_at: u.created_at, read: false,
            })),
            ...prev,
          ].slice(0, 50));
          setKnownIds(currentIds);
        }
      } catch { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 15000); // every 15 seconds
    return () => clearInterval(interval);
  }, [token, knownIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
        className="relative p-2 rounded-xl text-gray-400 hover:text-purple-300 hover:bg-white/[0.04] transition-all cursor-pointer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-purple-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">Clear all</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications yet</div>
            ) : (
              notifications.map((n, i) => (
                <div key={`${n.id}-${i}`} className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${!n.read ? "bg-purple-500/[0.05]" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-semibold flex-shrink-0 mt-0.5">
                      {(n.name || n.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        <span className="font-medium">{n.name || n.email}</span>
                        <span className="text-gray-400"> registered with </span>
                        <span className="text-purple-300 font-medium">trial</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.email} · {timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Admin Panel ── */
type AdminPage = "users" | "settings" | "client-profile";

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [adminUser, setAdminUser] = useState<{ id: number; email: string; name: string; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<AdminPage>("users");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Verify stored admin token on mount
  useEffect(() => {
    if (!adminToken) { setAuthLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.role !== "admin") throw new Error();
        setAdminUser(data);
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken(null);
        setAdminUser(null);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, [adminToken]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F14]">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!adminToken || !adminUser) {
    return <AdminLogin onLogin={(t) => { setAdminToken(t); }} />;
  }

  const token = adminToken;
  const adminLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setAdminUser(null);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const displayName = adminUser.name || adminUser.email || "Admin";

  const sidebarItems: { id: AdminPage; label: string; icon: JSX.Element }[] = [
    { id: "users", label: "Clients", icon: Icons.users },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];

  return (
    <div className="h-screen flex bg-[#0B0F14] text-white overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-purple-600/90 backdrop-blur-sm text-white rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#0d1117] border-r border-white/[0.06] flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
            {Icons.shield}
          </div>
          <div>
            <div className="text-sm font-bold text-white">AUROSY</div>
            <div className="text-[10px] text-purple-400 font-medium uppercase tracking-wider">Admin Panel</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {sidebarItems.map((item) => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                page === item.id || (page === "client-profile" && item.id === "users") ? "bg-purple-600/15 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.1)]" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
              }`}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/[0.06]">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-all">
            {Icons.home} Back to Site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-white/[0.06] bg-[#0B0F14]/60 backdrop-blur-xl">
          <h1 className="text-lg font-semibold text-white capitalize">{page === "client-profile" ? "Client Profile" : page === "users" ? "Clients" : page}</h1>
          <div className="flex items-center gap-2">
          <NotificationBell token={token!} />
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen((v) => !v)} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-purple-600/25 border border-purple-500/30 flex items-center justify-center text-purple-300 text-sm font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm text-white font-medium">{displayName}</div>
                <div className="text-xs text-gray-500">{adminUser.email}</div>
              </div>
              {Icons.chevDown}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-14 w-52 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
                <button onClick={() => { setDropdownOpen(false); setPage("settings"); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
                  {Icons.settings} Settings
                </button>
                <div className="my-1 border-t border-white/[0.06]" />
                <button onClick={() => { setDropdownOpen(false); adminLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                  {Icons.logout} Log Out
                </button>
              </div>
            )}
          </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {page === "users" && <UsersSection token={token!} showToast={showToast} onOpenClient={(id) => { setSelectedClientId(id); setPage("client-profile"); }} />}
          {page === "client-profile" && selectedClientId && <ClientProfile clientId={selectedClientId} token={token!} showToast={showToast} onBack={() => setPage("users")} />}
          {page === "settings" && <SettingsSection token={token!} showToast={showToast} />}
        </main>
      </div>
    </div>
  );
}
