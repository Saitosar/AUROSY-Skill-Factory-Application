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
        className="group text-sm font-bold tracking-tight transition-all"
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
        <UserButton />
      </div>
    </header>
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
    <div className="absolute bottom-0 left-[calc(50%+100px)] -translate-x-1/2 w-[440px] h-[90px] z-[5] pointer-events-none overflow-hidden">

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
        className="relative z-10 max-h-[75vh] w-auto drop-shadow-2xl object-contain -translate-y-4"
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
      <div className="flex h-full items-center px-6 lg:px-12 xl:px-20 pb-20">
        <div className="max-w-[1100px] mx-auto w-full">

          {/* Headline */}
          <div className="text-center mb-6">
            <h2
              className="text-3xl font-bold mb-3"
              style={{
                backgroundImage: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Three steps to your first robot skill
            </h2>
            <p className="text-gray-400 text-base max-w-lg mx-auto">
              No PhD required. Pick a plan, sign up, and start building production-ready skills in minutes — not months.
            </p>
          </div>

          {/* 3 Steps */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[
              { num: "1", label: "Choose a plan", color: "#22d3ee" },
              { num: "2", label: "Create account", color: "#a78bfa" },
              { num: "3", label: "Build robot skills", color: "#4ade80" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <span
                  className="text-[32px] font-black font-mono leading-none"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${step.color}, ${step.color}88)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: `drop-shadow(0 0 12px ${step.color}50)`,
                  }}
                >
                  {step.num}
                </span>
                <span className="text-gray-300 text-sm font-medium leading-tight">{step.label}</span>
                {i < 2 && (
                  <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg, ${step.color}40, transparent)` }} />
                )}
              </div>
            ))}
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-5 w-full items-start">
            {PLANS.map((plan) => {
              const isPro = plan.highlight;
              const cardColors = isPro
                ? { border: "#a78bfa", glow: "rgba(167,139,250,0.15)", check: "#a78bfa" }
                : plan.name === "Free"
                ? { border: "#22d3ee33", glow: "none", check: "#22d3ee" }
                : { border: "#4ade8033", glow: "none", check: "#4ade80" };

              return (
                <div
                  key={plan.name}
                  className="relative rounded-2xl p-6 border transition-all group"
                  style={{
                    borderColor: cardColors.border,
                    boxShadow: isPro ? `0 0 40px ${cardColors.glow}, 0 0 80px ${cardColors.glow}` : "none",
                    background: isPro ? "rgba(167,139,250,0.06)" : "rgba(255,255,255,0.02)",
                    transform: isPro ? "scale(1.05)" : "scale(1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isPro) {
                      e.currentTarget.style.borderColor = cardColors.check;
                      e.currentTarget.style.boxShadow = `0 0 30px ${cardColors.check}20`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPro) {
                      e.currentTarget.style.borderColor = cardColors.border;
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {/* Popular badge */}
                  {isPro && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-wider"
                      style={{
                        backgroundImage: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)",
                        color: "#0d1117",
                        boxShadow: "0 0 16px rgba(167,139,250,0.4)",
                      }}
                    >
                      POPULAR
                    </div>
                  )}

                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{
                      backgroundImage: isPro
                        ? "linear-gradient(90deg, #a78bfa, #e879f9)"
                        : plan.name === "Free"
                        ? "linear-gradient(90deg, #22d3ee, #67e8f9)"
                        : "linear-gradient(90deg, #4ade80, #34d399)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {plan.name}
                  </h3>
                  <div className="mb-6">
                    <span
                      className="text-4xl font-black"
                      style={{
                        backgroundImage: "linear-gradient(180deg, #ffffff, #9ca3af)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.price !== "Custom" && <span className="text-sm text-gray-500 ml-1">/mo</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cardColors.check} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSelectPlan(plan.name)}
                    className="w-full py-3 rounded-full text-sm font-bold cursor-pointer transition-all"
                    style={{
                      background: isPro
                        ? "linear-gradient(90deg, #a78bfa, #e879f9)"
                        : "transparent",
                      border: isPro ? "none" : `1px solid ${cardColors.check}60`,
                      color: isPro ? "#0d1117" : cardColors.check,
                      boxShadow: isPro ? "0 0 20px rgba(167,139,250,0.3)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (isPro) {
                        e.currentTarget.style.boxShadow = "0 0 30px rgba(167,139,250,0.5)";
                        e.currentTarget.style.background = "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80, #fbbf24, #e879f9)";
                        e.currentTarget.style.backgroundSize = "200% 100%";
                        e.currentTarget.style.animation = "shimmer-text 2s linear infinite";
                      } else {
                        e.currentTarget.style.background = `${cardColors.check}15`;
                        e.currentTarget.style.borderColor = cardColors.check;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isPro) {
                        e.currentTarget.style.boxShadow = "0 0 20px rgba(167,139,250,0.3)";
                        e.currentTarget.style.background = "linear-gradient(90deg, #a78bfa, #e879f9)";
                        e.currentTarget.style.backgroundSize = "100% 100%";
                        e.currentTarget.style.animation = "none";
                      } else {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = `${cardColors.check}60`;
                      }
                    }}
                  >
                    {plan.name === "Enterprise" ? "Contact us" : user ? "Go to Studio" : "Get started"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Registration modal */}
      {selectedPlan && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlan(null)} />
          {/* Modal */}
          <div className="relative w-full max-w-xl mx-4 bg-[#161a22] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Top gradient bar */}
            <div className="h-1" style={{ background: "linear-gradient(90deg, #22d3ee, #a78bfa, #4ade80)" }} />

            <div className="p-8">
              <div className="flex items-center justify-between mb-2">
                <h3
                  className="text-xl font-bold"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #a78bfa, #e879f9)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Sign up — {selectedPlan}
                </h3>
                <button onClick={() => setSelectedPlan(null)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Trial badge */}
              <div className="mb-6 px-4 py-3 rounded-xl border" style={{ background: "rgba(167,139,250,0.06)", borderColor: "rgba(167,139,250,0.2)" }}>
                <p className="text-sm font-medium flex items-center gap-2" style={{ color: "#a78bfa" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                  20-day free trial included
                </p>
                <p className="text-gray-400 text-xs mt-1">Full Pro access. No credit card required.</p>
              </div>

              {/* Google button */}
              <button
                type="button"
                onClick={() => {
                  setRegError("Google sign-in coming soon. Please use email registration.");
                }}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-medium transition-all cursor-pointer mb-4"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-xs">or continue with email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-3">
                {regError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{regError}</div>
                )}
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 font-bold rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "linear-gradient(90deg, #a78bfa, #e879f9)",
                    color: "#0d1117",
                    boxShadow: "0 0 20px rgba(167,139,250,0.3)",
                  }}
                >
                  {regLoading ? "Creating account..." : "Create Account & Start Trial"}
                </button>
                <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
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
