import { useState, useRef, useEffect, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "../components/NotificationBell";
import AuthForm from "../components/AuthForm";

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

  if (!user || user.role === 'admin') {
    return null;
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
  const { user } = useAuth();
  const isRegularUser = user && user.role !== 'admin';
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  return (
    <>
    <header className="absolute top-0 left-0 right-0 z-40 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.svg" alt="AUROSY" className="h-10 w-auto" draggable={false} />
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activePath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-all duration-200"
                style={{
                  backgroundImage: isActive
                    ? "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)"
                    : "linear-gradient(90deg, #9ca3af, #9ca3af)",
                  backgroundSize: "100% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: isActive ? "drop-shadow(0 0 10px rgba(167,139,250,0.4))" : "none",
                  transition: "all 0.4s ease",
                }}
                onMouseEnter={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80, #fbbf24, #e879f9)";
                  e.currentTarget.style.backgroundSize = "200% 100%";
                  e.currentTarget.style.animation = "shimmer-text 2s linear infinite";
                  e.currentTarget.style.filter = "drop-shadow(0 0 10px rgba(167,139,250,0.4))";
                }}
                onMouseLeave={(e) => {
                  if (isActive) return;
                  e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #9ca3af, #9ca3af)";
                  e.currentTarget.style.backgroundSize = "100% 100%";
                  e.currentTarget.style.animation = "none";
                  e.currentTarget.style.filter = "none";
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notification bell (shared component) */}
          <NotificationBell variant="landing" />

          {isRegularUser ? (
            /* Authenticated: avatar + name + dropdown */
            <UserButton />
          ) : (
            <>
              {/* Guest: user icon opens auth modal */}
              <button
                onClick={() => { setAuthTab("login"); setShowAuthModal(true); setAuthError(""); }}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>

              <div className="w-px h-6 bg-white/10" />

              <Link
                to="/pricing"
                className="text-sm font-bold tracking-tight transition-all no-underline"
                style={{
                  backgroundImage: "linear-gradient(90deg, #a78bfa, #a78bfa)",
                  backgroundSize: "100% 100%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  transition: "all 0.4s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80, #fbbf24, #e879f9)";
                  e.currentTarget.style.backgroundSize = "200% 100%";
                  e.currentTarget.style.animation = "shimmer-text 2s linear infinite";
                  e.currentTarget.style.filter = "drop-shadow(0 0 12px rgba(167,139,250,0.5))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #a78bfa, #a78bfa)";
                  e.currentTarget.style.backgroundSize = "100% 100%";
                  e.currentTarget.style.animation = "none";
                  e.currentTarget.style.filter = "none";
                }}
              >
                Start Building
              </Link>
            </>
          )}
        </div>
      </div>
    </header>

    {/* Auth Modal */}
    {showAuthModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
        <div className="relative w-full max-w-xl mx-4">
          <AuthForm
            initialTab={authTab}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => setShowAuthModal(false)}
          />
        </div>
      </div>
    )}
    </>
  );
}

/* ── Code Stream Animation ── */
const CODE_LINES = [
  { text: "import mujoco, numpy as np, torch, onnxruntime as ort", color: "#c084fc" },
  { text: "from aurosy.skills import SkillFactory, PolicyRunner", color: "#22d3ee" },
  { text: "from unitree_sdk2.g1 import G1Robot, JointState", color: "#4ade80" },
  { text: "class BalanceSkill(SkillFactory.BaseSkill):", color: "#fbbf24" },
  { text: "    def __init__(self, model='g1_29dof', dt=0.002):", color: "#fb923c" },
  { text: "        self.kp, self.kd = 120.0, 10.0", color: "#a78bfa" },
  { text: "        self.target_height = 0.75", color: "#67e8f9" },
  { text: "    def compute_action(self, obs, dt=0.01):", color: "#fbbf24" },
  { text: "        pitch, roll = obs['imu'][1], obs['imu'][0]", color: "#38bdf8" },
  { text: "        torque = self.pd_control(pitch, roll)", color: "#e879f9" },
  { text: "        return np.clip(torque, -self.max_t)", color: "#4ade80" },
  { text: "robot = G1Robot('mujoco_sim', dof=29)", color: "#fb923c" },
  { text: "skill = BalanceSkill(model='g1_29dof')", color: "#22d3ee" },
  { text: "factory = SkillFactory(env='browser')", color: "#a78bfa" },
  { text: "factory.train(robot, skill, episodes=2M)", color: "#facc15" },
  { text: "factory.export_onnx('balance_v2.onnx')", color: "#c084fc" },
  { text: "factory.deploy(robot, target='production')", color: "#4ade80" },
  { text: "# deployed ✓ 29 joints, 1.2ms latency", color: "#22c55e" },
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
    <div className="absolute -bottom-8 left-[calc(50%+100px)] -translate-x-1/2 w-[440px] h-[90px] z-[5] pointer-events-none overflow-hidden">

      {/* Code container */}
      <div className="h-full flex items-start justify-start pt-1">
        <div className="w-full px-2 font-mono text-[10px] leading-[1.5]">
          {CODE_LINES.slice(0, visibleLines + 1).map((line, i) => {
            if (line.text === "") return <div key={i} className="h-[1.8em]" />;

            const isCurrentLine = i === visibleLines;
            const displayText = isCurrentLine ? line.text.slice(0, charIndex) : line.text;

            return (
              <div key={i} className="flex items-center whitespace-nowrap">
                <span style={{ color: line.color }}>
                  {displayText}
                  {isCurrentLine && charIndex < line.text.length && (
                    <span className="inline-block w-[6px] h-[14px] ml-[1px] animate-pulse align-middle" style={{ backgroundColor: line.color }} />
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
  const partners = ["NVIDIA", "Unitree", "MuJoCo", "PyTorch", "ROS 2", "Isaac Sim", "ONNX", "OpenAI Gym"];
  const repeated = [...partners, ...partners, ...partners, ...partners];

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.04] bg-white/[0.01] overflow-hidden h-10">
      <div
        className="flex items-center gap-10 h-full whitespace-nowrap"
        style={{
          animation: "marquee 25s linear infinite",
          width: "max-content",
        }}
      >
        {repeated.map((name, i) => (
          <span
            key={i}
            className="text-gray-600 text-[11px] font-semibold tracking-[0.15em] uppercase select-none"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Tech Badge with typing + connector line ── */
function TechBadge({ text, prefix, position, lineEnd, color, delay = 0 }: {
  text: string;
  prefix: string;
  position: string;
  lineEnd: { x: string; y: string };
  color: string;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!visible || typed >= text.length) return;
    const t = setTimeout(() => setTyped((v) => v + 1), 30 + Math.random() * 40);
    return () => clearTimeout(t);
  }, [visible, typed, text.length]);

  return (
    <div className={`absolute ${position} z-20`} style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease" }}>
      {/* Connector line */}
      <svg className="absolute w-full h-full pointer-events-none" style={{ overflow: "visible", top: 0, left: 0 }}>
        <line
          x1="0" y1="50%" x2={lineEnd.x} y2={lineEnd.y}
          stroke={color} strokeWidth="1" strokeDasharray="4 3"
          strokeOpacity="0.5"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 1s ease 0.5s" }}
        >
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.5s" repeatCount="indefinite" />
        </line>
        <circle cx={lineEnd.x} cy={lineEnd.y} r="3" fill={color} opacity={visible ? 0.9 : 0} style={{ transition: "opacity 1s ease 0.5s" }}>
          <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Text only — no background */}
      <div className="relative font-mono text-[13px] font-semibold leading-tight whitespace-nowrap">
        <span style={{ color, opacity: 0.5 }}>{prefix}</span>
        <span style={{ color, textShadow: `0 0 12px ${color}, 0 0 24px ${color}40` }}>
          {text.slice(0, typed)}
        </span>
        {typed < text.length && (
          <span className="inline-block w-[6px] h-[14px] ml-[1px] animate-pulse align-middle" style={{ backgroundColor: color, opacity: 0.8 }} />
        )}
      </div>
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
        className="relative z-10 max-h-[75vh] w-auto drop-shadow-2xl object-contain translate-y-2"
        draggable={false}
      />

      {/* Floating badges */}
      <TechBadge
        prefix="sim = "
        text='"Browser simulation"'
        position="top-[15%] right-[5%] animate-float-slow"
        lineEnd={{ x: "-200px", y: "120px" }}
        color="#22d3ee"
        delay={800}
      />
      <TechBadge
        prefix="dof = "
        text='"29-DoF control"'
        position="top-[50%] right-[0%] animate-float-medium"
        lineEnd={{ x: "-220px", y: "10px" }}
        color="#a78bfa"
        delay={1600}
      />
      <TechBadge
        prefix="physics = "
        text='"MuJoCo engine"'
        position="top-[5%] left-[15%] animate-float-fast"
        lineEnd={{ x: "180px", y: "140px" }}
        color="#4ade80"
        delay={2400}
      />
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
              className="group flex items-center gap-2 px-1 py-1 text-[22px] font-bold tracking-tight cursor-pointer transition-all bg-transparent border-none"
              style={{
                color: "#a78bfa",
                backgroundImage: "linear-gradient(90deg, #a78bfa, #a78bfa)",
                backgroundSize: "100% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                transition: "all 0.4s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80, #fbbf24, #e879f9)";
                e.currentTarget.style.backgroundSize = "200% 100%";
                e.currentTarget.style.animation = "shimmer-text 2s linear infinite";
                e.currentTarget.style.filter = "drop-shadow(0 0 12px rgba(167,139,250,0.5))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundImage = "linear-gradient(90deg, #a78bfa, #a78bfa)";
                e.currentTarget.style.backgroundSize = "100% 100%";
                e.currentTarget.style.animation = "none";
                e.currentTarget.style.filter = "none";
              }}
            >
              Start building
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform" style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,0.4))" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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

const PRODUCTS = [
  {
    title: "Motion Studio",
    desc: "Interactive 3D robot control with real-time MuJoCo physics simulation right in your browser. Adjust every joint, test movements, and see results instantly.",
    color: "#22d3ee",
    mockContent: (
      <div className="w-full h-full bg-[#0d1117] flex">
        {/* Sidebar */}
        <div className="w-[25%] bg-[#161b22] border-r border-white/5 p-3 flex flex-col gap-2">
          <div className="text-[8px] font-mono text-cyan-400 mb-1">JOINT CONTROL</div>
          {["Left Shoulder", "Right Shoulder", "Left Elbow", "Right Elbow", "Left Hip", "Right Hip", "Left Knee", "Right Knee"].map((j, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[6px] text-gray-500 w-[45%] truncate">{j}</span>
              <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${30 + Math.random() * 50}%`, background: "#22d3ee" }} />
              </div>
            </div>
          ))}
          <div className="mt-auto text-[6px] text-green-400 font-mono">● Connected</div>
        </div>
        {/* Main viewport */}
        <div className="flex-1 flex items-center justify-center relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #22d3ee 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <img src="/robot-hero.png" alt="" className="h-[80%] object-contain opacity-90 drop-shadow-lg" draggable={false} />
          <div className="absolute bottom-2 left-3 text-[6px] font-mono text-gray-500">MuJoCo v3.1 · 120 FPS · 29 DoF</div>
        </div>
      </div>
    ),
  },
  {
    title: "Skill Authoring",
    desc: "Design complex robot behaviors with a visual keyframe editor and AI-assisted motion planning. Define poses, transitions, and timing with intuitive tools.",
    color: "#a78bfa",
    mockContent: (
      <div className="w-full h-full bg-[#0d1117] flex flex-col">
        {/* Top toolbar */}
        <div className="h-[12%] bg-[#161b22] border-b border-white/5 flex items-center px-3 gap-2">
          <div className="text-[7px] font-mono text-purple-400">SKILL EDITOR</div>
          <div className="ml-auto flex gap-1">
            {["Save", "Preview", "Export"].map((b) => (
              <span key={b} className="text-[6px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">{b}</span>
            ))}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 flex">
          {/* Keyframe list */}
          <div className="w-[30%] border-r border-white/5 p-2">
            <div className="text-[6px] text-gray-500 mb-1 font-mono">KEYFRAMES</div>
            {["Stand", "Raise Arms", "Step Left", "Balance", "Wave", "Bow"].map((k, i) => (
              <div key={i} className={`text-[6px] px-2 py-1 rounded mb-0.5 cursor-default ${i === 2 ? "bg-purple-500/15 text-purple-300 border border-purple-500/20" : "text-gray-400"}`}>
                {String(i + 1).padStart(2, "0")} — {k}
              </div>
            ))}
          </div>
          {/* Timeline */}
          <div className="flex-1 p-2">
            <div className="text-[6px] text-gray-500 mb-1 font-mono">TIMELINE</div>
            <div className="h-[60%] relative">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full border-2" style={{ left: `${i * 18 + 5}%`, top: `${20 + Math.sin(i) * 30}%`, borderColor: "#a78bfa", background: i === 2 ? "#a78bfa" : "transparent" }} />
              ))}
              <svg className="absolute inset-0 w-full h-full">
                <path d="M 8% 35% Q 25% 10%, 42% 55% Q 58% 80%, 75% 25% Q 85% 10%, 95% 45%" fill="none" stroke="#a78bfa" strokeWidth="1" opacity="0.3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "RL Training",
    desc: "Train reinforcement learning policies with PPO, monitor reward curves in real-time, and deploy production-ready ONNX models to physical robots.",
    color: "#4ade80",
    mockContent: (
      <div className="w-full h-full bg-[#0d1117] flex flex-col p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[7px] font-mono text-green-400">RL TRAINING DASHBOARD</div>
          <div className="flex gap-1">
            <span className="text-[6px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-300">● Training</span>
            <span className="text-[6px] text-gray-500">Episode 1,847,293</span>
          </div>
        </div>
        {/* Metrics grid */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[
            { label: "Reward", value: "4,850.3", color: "#4ade80" },
            { label: "Loss", value: "0.0023", color: "#f97316" },
            { label: "LR", value: "3e-4", color: "#22d3ee" },
            { label: "FPS", value: "48,200", color: "#a78bfa" },
          ].map((m) => (
            <div key={m.label} className="bg-white/[0.02] rounded p-1.5 border border-white/5">
              <div className="text-[5px] text-gray-500">{m.label}</div>
              <div className="text-[8px] font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>
        {/* Chart area */}
        <div className="flex-1 bg-white/[0.02] rounded border border-white/5 p-2 relative">
          <div className="text-[5px] text-gray-500 mb-1">REWARD CURVE</div>
          <svg className="w-full h-[80%]" viewBox="0 0 200 60">
            <path d="M 0 55 Q 20 50, 40 45 Q 60 35, 80 30 Q 100 22, 120 18 Q 140 12, 160 8 Q 180 5, 200 3" fill="none" stroke="#4ade80" strokeWidth="1.5" />
            <path d="M 0 55 Q 20 50, 40 45 Q 60 35, 80 30 Q 100 22, 120 18 Q 140 12, 160 8 Q 180 5, 200 3 L 200 60 L 0 60 Z" fill="url(#rewardFill)" />
            <defs><linearGradient id="rewardFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" /><stop offset="100%" stopColor="#4ade80" stopOpacity="0" /></linearGradient></defs>
          </svg>
        </div>
      </div>
    ),
  },
];

export function LandingProduct() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((s) => (s + 1) % PRODUCTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const product = PRODUCTS[activeSlide];

  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center justify-center px-6 lg:px-12 xl:px-20 pb-20">
        <div className="max-w-[1100px] mx-auto w-full flex flex-col items-center">

          {/* MacBook mockup */}
          <div className="mbp-mockup-wrapper">
            <div className="mbp-container">
              <div className="mbp-display">
                <div className="display-edge">
                  <div className="bezel">
                    <div className="display-camera" />
                    <div className="display-frame">
                      {/* Slide content */}
                      <div className="w-full h-full relative">
                        {PRODUCTS.map((p, i) => (
                          <div
                            key={i}
                            className="absolute inset-0"
                            style={{
                              opacity: activeSlide === i ? 1 : 0,
                              transition: "opacity 0.6s ease",
                            }}
                          >
                            {p.mockContent}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="below-display">
                      <div className="macbookpro" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mbp-keyboard">
                <div className="front">
                  <div className="opener-left" />
                  <div className="opener-right" />
                </div>
                <div className="bottom-left" />
                <div className="bottom-right" />
              </div>
            </div>
          </div>

          {/* Slide selector + description */}
          <div className="flex items-center justify-center gap-8 mt-6">
            {PRODUCTS.map((p, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className="flex flex-col items-center gap-2 cursor-pointer transition-all group bg-transparent border-none"
                style={{ opacity: activeSlide === i ? 1 : 0.4 }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full transition-all"
                  style={{
                    backgroundColor: p.color,
                    boxShadow: activeSlide === i ? `0 0 12px ${p.color}` : "none",
                    transform: activeSlide === i ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <span
                  className="text-sm font-semibold font-mono transition-all"
                  style={{
                    color: activeSlide === i ? p.color : "#6b7280",
                    textShadow: activeSlide === i ? `0 0 10px ${p.color}40` : "none",
                  }}
                >
                  {p.title}
                </span>
              </button>
            ))}
          </div>

          {/* Active description */}
          <p
            className="text-center text-gray-400 text-sm max-w-lg mt-3 transition-all"
            style={{ opacity: 1 }}
            key={activeSlide}
          >
            {product.desc}
          </p>
        </div>
      </div>
    </PageTransition>
  );
}

const FREE_PLAN_FEATURES = [
  "5 skill creations / month",
  "RL training",
  "24/7 support",
  "Beta testing",
  "AI Text to Motion",
];

export function LandingPricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);

  const handleStart = () => {
    if (user) {
      navigate("/app/pose");
      return;
    }
    setShowAuth(true);
  };

  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center justify-center px-6 lg:px-12 xl:px-20 pb-20">
        <div className="max-w-[480px] w-full">

          {/* Headline */}
          <div className="text-center mb-10">
            <h2
              className="text-3xl font-bold mb-3"
              style={{
                backgroundImage: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Start building for free
            </h2>
            <p className="text-gray-400 text-base max-w-md mx-auto">
              No credit card required. Get full access to the platform for 6 months and create production-ready robot skills today.
            </p>
          </div>

          {/* Single plan card */}
          <div
            className="relative rounded-2xl p-8 border"
            style={{
              borderColor: "#a78bfa",
              boxShadow: "0 0 60px rgba(167,139,250,0.15), 0 0 120px rgba(167,139,250,0.08)",
              background: "rgba(167,139,250,0.04)",
            }}
          >
            {/* Badge */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full text-xs font-bold tracking-wider"
              style={{
                backgroundImage: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)",
                color: "#0d1117",
                boxShadow: "0 0 16px rgba(167,139,250,0.4)",
              }}
            >
              6 MONTHS FREE
            </div>

            {/* Plan name */}
            <h3
              className="text-xl font-semibold mb-1 mt-2"
              style={{
                backgroundImage: "linear-gradient(90deg, #a78bfa, #e879f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Free Plan
            </h3>

            {/* Price */}
            <div className="mb-6">
              <span
                className="text-5xl font-black"
                style={{
                  backgroundImage: "linear-gradient(180deg, #ffffff, #9ca3af)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                $0
              </span>
              <span className="text-sm text-gray-500 ml-2">for 6 months</span>
            </div>

            {/* Features */}
            <ul className="space-y-4 mb-8">
              {FREE_PLAN_FEATURES.map((f) => (
                <li key={f} className="text-gray-300 text-sm flex items-center gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <button
              onClick={handleStart}
              className="w-full py-3.5 rounded-full text-sm font-bold cursor-pointer transition-all"
              style={{
                background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                color: "#0d1117",
                boxShadow: "0 0 20px rgba(167,139,250,0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 30px rgba(167,139,250,0.5)";
                e.currentTarget.style.background = "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80, #fbbf24, #e879f9)";
                e.currentTarget.style.backgroundSize = "200% 100%";
                e.currentTarget.style.animation = "shimmer-text 2s linear infinite";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(167,139,250,0.3)";
                e.currentTarget.style.background = "linear-gradient(90deg, #a78bfa, #e879f9)";
                e.currentTarget.style.backgroundSize = "100% 100%";
                e.currentTarget.style.animation = "none";
              }}
            >
              {user ? "Go to Studio" : "Start free trial"}
            </button>
          </div>
        </div>
      </div>

      {/* Registration modal */}
      {showAuth && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuth(false)} />
          <div className="relative w-full max-w-xl mx-4">
            <AuthForm
              initialTab="register"
              showTabs={false}
              planName="Free Plan — 6 months"
              onClose={() => setShowAuth(false)}
              onSuccess={() => navigate("/app/pose")}
            />
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
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      label: "About",
      icon: "◆",
      color: "#22d3ee",
      content: (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">About AUROSY</h2>
            <p className="text-gray-400 leading-relaxed">
              AUROSY is a platform where anyone can create, simulate, and deploy robot behaviors
              using AI — without writing low-level code or owning physical hardware.
              We turn the complex world of robotics into a creative playground.
            </p>
          </div>
          <div className="border-l-2 border-cyan-500/30 pl-5">
            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-2">Our Mission</h3>
            <p className="text-gray-300 leading-relaxed">
              Democratize robot programming. We believe creating a robot skill should be as intuitive
              as editing a video — design the motion, train the policy, export to hardware.
              One platform, zero friction.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-cyan-400">23+</div>
              <div className="text-gray-500 text-xs mt-1">Degrees of Freedom</div>
            </div>
            <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-purple-400">1000×</div>
              <div className="text-gray-500 text-xs mt-1">Faster than Real-Time</div>
            </div>
            <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-green-400">ONNX</div>
              <div className="text-gray-500 text-xs mt-1">Universal Export</div>
            </div>
            <div className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-4">
              <div className="text-2xl font-bold text-yellow-400">0</div>
              <div className="text-gray-500 text-xs mt-1">Hardware Required</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Values",
      icon: "✦",
      color: "#a78bfa",
      content: (
        <div className="space-y-5">
          <h2 className="text-2xl font-bold text-white mb-1">What Drives Us</h2>
          <p className="text-gray-500 text-sm mb-4">The principles behind every decision we make.</p>
          {[
            { icon: "🎯", title: "Simulation First", desc: "Every skill is born in a physics simulator — safe, fast, repeatable. No broken hardware, no wasted time. Iterate thousands of times in minutes." },
            { icon: "🧠", title: "AI-Driven", desc: "Reinforcement learning and neural policies turn raw ideas into adaptive motions. Our agents learn from experience, not manual tuning." },
            { icon: "🌍", title: "Open Ecosystem", desc: "We build on open standards — MuJoCo, ONNX, ROS 2, Isaac Sim. Your skills aren't locked in, they run everywhere." },
            { icon: "⚡", title: "Creator Economy", desc: "Skill creators earn by publishing to a shared marketplace. The best moves win, regardless of who made them. Quality over credentials." },
          ].map((v, i) => (
            <div key={i} className="flex gap-4 items-start group">
              <span className="text-xl flex-shrink-0 mt-1 group-hover:scale-110 transition-transform">{v.icon}</span>
              <div>
                <h3 className="text-white font-semibold mb-1">{v.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: "How It Works",
      icon: "▸",
      color: "#4ade80",
      content: (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white mb-1">Three Steps to a Robot Skill</h2>
          <p className="text-gray-500 text-sm mb-2">From idea to hardware-ready policy in one workflow.</p>
          <div className="relative space-y-8">
            <div className="absolute left-[19px] top-10 bottom-10 w-px bg-gradient-to-b from-cyan-500/40 via-purple-500/40 to-green-500/40" />
            {[
              { step: "01", title: "Design", desc: "Use our browser-based visual editor to pose robot joints frame by frame. Set keyframes, define reference motions, and preview the movement in real-time 3D simulation. No coding required — it's like animating a character.", color: "#22d3ee" },
              { step: "02", title: "Train", desc: "Hit 'Train' and reinforcement learning takes over. Thousands of simulated episodes run in parallel, discovering the optimal neural policy that reproduces your motion while maintaining balance and adapting to perturbations.", color: "#a78bfa" },
              { step: "03", title: "Deploy", desc: "Export the trained policy as a lightweight ONNX model. Deploy it directly to Unitree G1 or other supported robots. Or publish it on the AUROSY marketplace and let other creators license your skill.", color: "#4ade80" },
            ].map((s, i) => (
              <div key={i} className="flex gap-5 items-start relative">
                <div className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center flex-shrink-0 z-10">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color, boxShadow: `0 0 12px ${s.color}50` }} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold tracking-wider uppercase mb-1.5" style={{ color: s.color }}>{s.step} — {s.title}</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      label: "Roadmap",
      icon: "◈",
      color: "#facc15",
      content: (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Roadmap</h2>
          {/* Horizontal timeline */}
          <div className="relative">
            {/* Horizontal line */}
            <div className="absolute top-[22px] left-0 right-0 h-px bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-green-500/40" />
            <div className="grid grid-cols-3 gap-4">
              {[
                { year: "2025", status: "Done", items: ["MuJoCo physics pipeline", "PPO/RL framework", "G1 humanoid integration", "ONNX export"], color: "#22d3ee", glow: "shadow-cyan-500/20" },
                { year: "2026", status: "Now", items: ["Browser Skill Factory", "Visual keyframe editor", "One-click RL training", "Marketplace beta"], color: "#a78bfa", glow: "shadow-purple-500/20" },
                { year: "2027", status: "Next", items: ["Multi-robot support", "Community marketplace", "Enterprise API", "Real-hardware deploy"], color: "#4ade80", glow: "shadow-green-500/20" },
              ].map((m, i) => (
                <div key={i} className="pt-0">
                  {/* Dot on timeline */}
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center bg-[#0B0F14] z-10 relative" style={{ borderColor: m.color }}>
                        <span className="text-xs font-bold" style={{ color: m.color }}>{m.year}</span>
                      </div>
                      <div className="absolute inset-0 rounded-full blur-md opacity-40" style={{ backgroundColor: m.color }} />
                    </div>
                  </div>
                  {/* Status badge */}
                  <div className="text-center mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border" style={{ color: m.color, borderColor: `${m.color}25`, backgroundColor: `${m.color}08` }}>{m.status}</span>
                  </div>
                  {/* Items */}
                  <div className="space-y-2">
                    {m.items.map((item, j) => (
                      <div key={j} className="flex items-center gap-2 text-gray-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color, opacity: 0.5 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      label: "Tech Stack",
      icon: "⬡",
      color: "#f472b6",
      content: (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Built With</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: "MuJoCo", icon: "🔬", color: "#22d3ee" },
              { name: "PyTorch", icon: "🔥", color: "#ee6b3b" },
              { name: "ONNX", icon: "⬡", color: "#a78bfa" },
              { name: "ROS 2", icon: "🤖", color: "#4ade80" },
              { name: "Isaac Sim", icon: "🎮", color: "#76b900" },
              { name: "Unitree SDK", icon: "🦿", color: "#facc15" },
              { name: "OpenAI Gym", icon: "🏋️", color: "#f472b6" },
              { name: "PPO", icon: "🧠", color: "#a78bfa" },
              { name: "React", icon: "⚛️", color: "#61dafb" },
              { name: "TypeScript", icon: "📘", color: "#3178c6" },
              { name: "FastAPI", icon: "⚡", color: "#009688" },
              { name: "PostgreSQL", icon: "🐘", color: "#336791" },
              { name: "Vite", icon: "⚡", color: "#646cff" },
              { name: "Tailwind", icon: "🎨", color: "#38bdf8" },
              { name: "URDF", icon: "📐", color: "#f59e0b" },
              { name: "MJCF", icon: "📄", color: "#22d3ee" },
            ].map((t, i) => (
              <div key={i} className="border border-white/[0.06] rounded-lg bg-white/[0.02] p-3 flex items-center gap-2.5 hover:bg-white/[0.05] transition-colors group cursor-default">
                <span className="text-lg group-hover:scale-110 transition-transform">{t.icon}</span>
                <span className="text-xs font-medium" style={{ color: t.color }}>{t.name}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.04] text-center">
            <p className="text-gray-600 text-xs">Contact us — <span className="text-gray-400">hello@aurosy.io</span></p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <PageTransition direction="right">
      <div className="h-full flex px-8 py-6 gap-6 overflow-hidden">

        {/* Left: Tab navigation */}
        <div className="flex flex-col gap-1 w-48 flex-shrink-0 pt-4">
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-300 ${
                activeTab === i
                  ? "bg-white/[0.06] border border-white/[0.1]"
                  : "hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <span
                className="text-sm transition-all duration-300"
                style={{
                  color: activeTab === i ? tabs[i].color : "#6b7280",
                  textShadow: activeTab === i ? `0 0 8px ${tabs[i].color}40` : "none",
                }}
              >
                {tab.icon}
              </span>
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  activeTab === i ? "text-white" : "text-gray-500"
                }`}
              >
                {tab.label}
              </span>
              {activeTab === i && (
                <div className="ml-auto w-1 h-4 rounded-full" style={{ backgroundColor: tabs[i].color, boxShadow: `0 0 8px ${tabs[i].color}40` }} />
              )}
            </button>
          ))}
        </div>

        {/* Right: Content area */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
          <div className="max-w-2xl">
            {tabs[activeTab].content}
          </div>
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
