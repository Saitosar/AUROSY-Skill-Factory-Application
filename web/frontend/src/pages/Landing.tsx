import { useState, useRef, useEffect, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/* ── Animated page wrapper ── */
function PageTransition({ children, direction }: { children: ReactNode; direction: "left" | "right" | "none" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const transform = !visible
    ? direction === "left" ? "translateX(-60px)" : direction === "right" ? "translateX(60px)" : "translateX(0)"
    : "translateX(0)";

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform,
        transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
}

/* ── User icon button (top-right) ── */
function UserButton() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) {
    return (
      <Link
        to="/pricing"
        className="text-sm px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium hover:from-purple-500 hover:to-purple-400 transition-all"
      >
        Start Building
      </Link>
    );
  }

  const displayName = user.name || user.email || "User";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 hover:bg-purple-600/50 transition-all cursor-pointer"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="text-sm font-semibold">{displayName.charAt(0).toUpperCase()}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-48 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-gray-400 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={() => { setOpen(false); navigate("/pose"); }}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
            Motion Studio
          </button>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Navigation bar ── */
const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Product", path: "/product" },
  { label: "Pricing", path: "/pricing" },
  { label: "Company", path: "/company" },
];

function LandingNav({ activePath }: { activePath: string }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.svg" alt="AUROSY" className="h-10 w-auto" draggable={false} />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all duration-200 ${
                activePath === item.path
                  ? "text-purple-400 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
                  : "text-gray-400 hover:text-purple-300 hover:bg-white/[0.06] hover:scale-105"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <UserButton />
      </div>
    </header>
  );
}

/* ── Code Stream Animation ── */
const CODE_LINES = [
  { text: "import mujoco", color: "text-purple-400" },
  { text: "from aurosy import SkillFactory", color: "text-purple-400" },
  { text: "from unitree_sdk2 import G1Robot", color: "text-purple-400" },
  { text: "", color: "" },
  { text: "class BalanceSkill(Skill):", color: "text-cyan-400" },
  { text: "    def __init__(self):", color: "text-yellow-300" },
  { text: "        self.kp = 120.0", color: "text-green-300" },
  { text: "        self.kd = 10.0", color: "text-green-300" },
  { text: "        self.target_height = 0.75", color: "text-green-300" },
  { text: "", color: "" },
  { text: "    def compute_action(self, obs):", color: "text-yellow-300" },
  { text: "        pitch = obs['imu_euler'][1]", color: "text-gray-300" },
  { text: "        roll = obs['imu_euler'][0]", color: "text-gray-300" },
  { text: "        torque = self.pd_control(pitch, roll)", color: "text-gray-300" },
  { text: "        return torque", color: "text-cyan-300" },
  { text: "", color: "" },
  { text: "robot = G1Robot()", color: "text-orange-300" },
  { text: "skill = BalanceSkill()", color: "text-orange-300" },
  { text: "factory = SkillFactory(env='mujoco')", color: "text-orange-300" },
  { text: "factory.simulate(robot, skill)", color: "text-purple-300" },
  { text: "factory.deploy(robot, skill)", color: "text-green-400" },
  { text: "# Training complete ✓", color: "text-green-500" },
];

function CodeStream() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) {
      // Reset after a pause
      const timeout = setTimeout(() => {
        setVisibleLines(0);
        setCharIndex(0);
      }, 4000);
      return () => clearTimeout(timeout);
    }

    const currentLine = CODE_LINES[visibleLines];
    if (!currentLine) return;

    if (currentLine.text === "") {
      // Empty line — skip quickly
      const timeout = setTimeout(() => {
        setVisibleLines((v) => v + 1);
        setCharIndex(0);
      }, 150);
      return () => clearTimeout(timeout);
    }

    if (charIndex < currentLine.text.length) {
      const timeout = setTimeout(() => {
        setCharIndex((c) => c + 1);
      }, 20 + Math.random() * 30);
      return () => clearTimeout(timeout);
    }

    // Line complete — move to next
    const timeout = setTimeout(() => {
      setVisibleLines((v) => v + 1);
      setCharIndex(0);
    }, 200 + Math.random() * 200);
    return () => clearTimeout(timeout);
  }, [visibleLines, charIndex]);

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[180px] h-[100px] z-[5] pointer-events-none overflow-hidden">
      {/* Fade top edge */}
      <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#0B0F14] to-transparent z-10" />
      {/* Fade bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[#0B0F14] to-transparent z-10" />
      {/* Fade left/right edges */}
      <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-[#0B0F14] to-transparent z-10" />
      <div className="absolute top-0 bottom-0 right-0 w-6 bg-gradient-to-l from-[#0B0F14] to-transparent z-10" />

      {/* Code container */}
      <div className="h-full flex items-start justify-center pt-2">
        <div className="w-full px-3 font-mono text-[7px] leading-[1.6] opacity-35">
          {CODE_LINES.slice(0, visibleLines + 1).map((line, i) => {
            if (line.text === "") return <div key={i} className="h-[1.8em]" />;

            const isCurrentLine = i === visibleLines;
            const displayText = isCurrentLine ? line.text.slice(0, charIndex) : line.text;

            return (
              <div key={i} className="flex items-center whitespace-nowrap">
                <span className={line.color}>
                  {displayText}
                  {isCurrentLine && charIndex < line.text.length && (
                    <span className="inline-block w-[6px] h-[14px] bg-purple-400 ml-[1px] animate-pulse align-middle" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Partner logos ── */
function PartnerLogos() {
  const partners = ["NVIDIA", "Unitree", "MuJoCo", "PyTorch", "ROS 2", "Isaac Sim"];

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-12 lg:gap-16 h-16 px-6 overflow-hidden">
        {partners.map((name) => (
          <span
            key={name}
            className="text-gray-500 text-sm font-semibold tracking-wider uppercase whitespace-nowrap select-none"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Floating badges (like in reference) ── */
function FloatingBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`absolute px-4 py-2 bg-[#1a1f2e]/80 backdrop-blur-md border border-white/10 rounded-xl text-sm text-gray-200 shadow-xl ${className || ""}`}>
      {children}
    </div>
  );
}

/* ── Robot visual (right side) ── */
function RobotVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-cyan-500/10 rounded-full blur-[80px]" />

      {/* Robot image */}
      <img
        src="/robot-hero.png"
        alt="AUROSY Robot"
        className="relative z-10 max-h-[75vh] w-auto drop-shadow-2xl object-contain"
        draggable={false}
      />

      {/* Floating badges */}
      <FloatingBadge className="top-[15%] right-[5%] animate-float-slow">
        Browser-based simulation
      </FloatingBadge>
      <FloatingBadge className="top-[50%] right-[0%] animate-float-medium">
        29-DoF full body control
      </FloatingBadge>
      <FloatingBadge className="bottom-[25%] left-[5%] animate-float-fast">
        Real-time MuJoCo physics
      </FloatingBadge>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGES
   ═══════════════════════════════════════════ */

export function LandingHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <PageTransition direction="none">
      <div className="flex h-full">
        {/* Left — Content */}
        <div className="flex-1 flex flex-col justify-center px-6 lg:px-12 xl:px-20 max-w-[700px]">
          {/* Heading */}
          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6">
            Your AI-
            <br />
            Powered{" "}
            <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Robot
            </span>
            <br />
            Skill Factory
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-lg lg:text-xl max-w-[480px] mb-10 leading-relaxed">
            Create, simulate, and deploy robot skills effortlessly.
            No hardware required.
          </p>

          {/* CTA button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(user ? "/app/pose" : "/pricing")}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:from-purple-500 hover:to-purple-400 transition-all cursor-pointer"
            >
              Start building
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        {/* Right — Robot visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative">
          <RobotVisual />
          <CodeStream />
        </div>
      </div>
    </PageTransition>
  );
}

export function LandingProduct() {
  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center px-6 lg:px-12 xl:px-20">
        <div className="max-w-[1400px] mx-auto w-full grid md:grid-cols-3 gap-6">
          {[
            { title: "Motion Studio", desc: "Interactive 3D robot control with real-time MuJoCo physics simulation in your browser.", icon: "🤖" },
            { title: "Skill Authoring", desc: "Design complex robot behaviors with visual keyframe editor and AI-assisted motion planning.", icon: "✨" },
            { title: "RL Training", desc: "Train reinforcement learning policies with PPO and deploy ONNX models to real hardware.", icon: "🧠" },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 hover:bg-white/[0.05] hover:border-purple-500/20 transition-all group"
            >
              <div className="text-4xl mb-5">{item.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-purple-300 transition-colors">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}

const PLANS = [
  { name: "Free", price: "$0", features: ["1 project", "Browser simulation", "Community support"] },
  { name: "Pro", price: "$49", features: ["Unlimited projects", "RL training", "Priority support", "Team collaboration"], highlight: true },
  { name: "Enterprise", price: "Custom", features: ["Dedicated instance", "On-premise deploy", "Custom integrations", "24/7 support"] },
];

export function LandingPricing() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleSelectPlan = (planName: string) => {
    if (planName === "Enterprise") return;
    if (user) {
      navigate("/app/pose");
      return;
    }
    setSelectedPlan(planName);
    setRegError("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (regForm.password !== regForm.confirmPassword) {
      setRegError("Passwords don't match");
      return;
    }
    if (regForm.password.length < 6) {
      setRegError("Password must be at least 6 characters");
      return;
    }
    setRegLoading(true);
    try {
      await register({ email: regForm.email, password: regForm.password, name: regForm.name });
      navigate("/app/pose");
    } catch (err: any) {
      setRegError(err.message || "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center px-6 lg:px-12 xl:px-20">
        <div className="max-w-[1000px] mx-auto w-full">
          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6 w-full">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border transition-all ${
                  plan.highlight
                    ? "bg-purple-500/10 border-purple-500/30 shadow-xl shadow-purple-500/10"
                    : "bg-white/[0.03] border-white/[0.06] hover:border-white/10"
                }`}
              >
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold text-white mb-6">
                  {plan.price}<span className="text-sm font-normal text-gray-400">{plan.price !== "Custom" ? "/mo" : ""}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.highlight ? "#a855f7" : "#6b7280"} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    plan.highlight
                      ? "bg-purple-600 text-white hover:bg-purple-500"
                      : "bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {plan.name === "Enterprise" ? "Contact us" : user ? "Go to Studio" : "Get started"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration modal */}
      {selectedPlan && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlan(null)} />
          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-[#161a22] rounded-2xl p-8 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-lg font-semibold">Sign up — {selectedPlan}</h3>
              <button onClick={() => setSelectedPlan(null)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="mb-5 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-purple-300 text-sm font-medium flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                20-day free trial included
              </p>
              <p className="text-gray-400 text-xs mt-1">Full Pro access. No credit card required. After trial you'll stay on the Free plan.</p>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              {regError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{regError}</div>
              )}
              <input
                type="text"
                value={regForm.name}
                onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Name"
              />
              <input
                type="email"
                value={regForm.email}
                onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Email"
              />
              <input
                type="password"
                value={regForm.password}
                onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Password"
              />
              <input
                type="password"
                value={regForm.confirmPassword}
                onChange={(e) => setRegForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                required
                className="w-full px-4 py-3 bg-[#0B0F14] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Confirm password"
              />
              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {regLoading ? "Creating account..." : "Create Account & Start Trial"}
              </button>
              <div className="flex items-center justify-center gap-2 mt-1 text-gray-500 text-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                No credit card required — instant access
              </div>
            </form>
            <p className="text-center mt-4 text-sm text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-purple-400 hover:text-purple-300">Sign in</Link>
            </p>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

export function LandingDocs() {
  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6">📚</div>
          <h2 className="text-3xl font-bold text-white mb-4">Documentation</h2>
          <p className="text-gray-400 text-lg mb-8">Comprehensive guides, API reference, and tutorials coming soon.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to home
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}

export function LandingCompany() {
  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">About AUROSY</h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            We're building the future of robot programming.
            Our platform enables anyone to create, simulate, and deploy robot skills
            using AI-powered tools — no hardware or coding expertise required.
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

/* ── Landing Layout (wraps all landing pages) ── */
export default function LandingLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0B0F14] relative flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-900/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-purple-800/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <LandingNav activePath={location.pathname} />

      {/* Content area */}
      <div className="flex-1 pt-20 pb-16 relative z-10">
        {children}
      </div>

      {/* Partner logos */}
      <PartnerLogos />
    </div>
  );
}
