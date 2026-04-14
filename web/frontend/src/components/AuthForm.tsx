import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const PROFESSIONS = [
  "Software Engineer",
  "Robotics Engineer",
  "ML / AI Engineer",
  "Data Scientist",
  "Mechanical Engineer",
  "Electrical Engineer",
  "Embedded Systems Engineer",
  "Control Systems Engineer",
  "Computer Vision Engineer",
  "Hardware Engineer",
  "Product Manager",
  "Project Manager",
  "UX / UI Designer",
  "3D Artist / Animator",
  "DevOps / SRE",
  "QA Engineer",
  "CTO / Tech Lead",
  "CEO / Founder",
  "Research Scientist",
  "Professor / Academic",
  "PhD Student",
  "Student",
  "Entrepreneur",
  "Consultant",
  "Sales / Business Dev",
  "Marketing Specialist",
  "Technical Writer",
  "Simulation Engineer",
  "Systems Architect",
  "Automation Engineer",
  "Other",
];

interface AuthFormProps {
  initialTab?: "login" | "register";
  showTabs?: boolean;
  planName?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function AuthForm({
  initialTab = "login",
  showTabs = true,
  planName,
  onClose,
  onSuccess,
}: AuthFormProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    industry: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        await register({
          email: form.email,
          password: form.password,
          name: form.name,
          industry: form.industry,
        });
      }
      onSuccess?.();
    } catch (err: any) {
      setError(
        err.message || (tab === "login" ? "Login failed" : "Registration failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "login" | "register") => {
    setTab(t);
    setError("");
  };

  const title = planName
    ? `Sign up — ${planName}`
    : tab === "login"
      ? "Welcome back"
      : "Create account";

  return (
    <div className="bg-[#161a22] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Gradient bar */}
      <div
        className="h-1"
        style={{
          background: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)",
        }}
      />

      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-xl font-bold"
            style={{
              backgroundImage: "linear-gradient(90deg, #a78bfa, #e879f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="flex gap-1 mb-6 p-1 bg-white/[0.04] rounded-xl">
            <button
              onClick={() => switchTab("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                tab === "login"
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchTab("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                tab === "register"
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Trial banner */}
        {tab === "register" && (
          <div
            className="mb-4 px-4 py-3 rounded-xl border"
            style={{
              background: "rgba(167,139,250,0.06)",
              borderColor: "rgba(167,139,250,0.2)",
            }}
          >
            <p
              className="text-sm font-medium flex items-center gap-2"
              style={{ color: "#a78bfa" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 8v4l3 3" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              20-day free trial included
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Full Pro access. No credit card required.
            </p>
          </div>
        )}

        {/* Google placeholder */}
        {tab === "register" && (
          <>
            <button
              type="button"
              onClick={() =>
                setError(
                  "Google sign-in coming soon. Please use email registration."
                )
              }
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-medium transition-all cursor-pointer mb-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs">
                or continue with email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {tab === "register" && (
            <>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Name"
              />
              <select
                value={form.industry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, industry: e.target.value }))
                }
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer appearance-none"
                style={{ colorScheme: "dark" }}
              >
                <option value="" disabled>
                  Select your profession
                </option>
                {PROFESSIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({ ...f, email: e.target.value }))
            }
            required
            className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Email"
          />
          <input
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            required
            className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="Password"
          />
          {tab === "register" && (
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
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
            {loading
              ? "Please wait..."
              : tab === "login"
                ? "Sign In"
                : "Create Account & Start Trial"}
          </button>

          {tab === "register" && (
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              No credit card required — instant access
            </div>
          )}
        </form>

        {/* Toggle link */}
        {showTabs && (
          <p className="text-center mt-4 text-sm text-gray-500">
            {tab === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => switchTab("register")}
                  className="text-purple-400 hover:text-purple-300 bg-transparent border-none cursor-pointer"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => switchTab("login")}
                  className="text-purple-400 hover:text-purple-300 bg-transparent border-none cursor-pointer"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        )}

        {!showTabs && tab === "register" && (
          <p className="text-center mt-4 text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-400 hover:text-purple-300"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
