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
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          Sign In
        </Link>
        <Link
          to="/register"
          className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-500 hover:to-purple-400 transition-all"
        >
          Get Started
        </Link>
      </div>
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
  { label: "Docs", path: "/docs" },
  { label: "Company", path: "/company" },
];

function LandingNav({ activePath }: { activePath: string }) {
  return (
    <header className="absolute top-0 left-0 right-0 z-40 px-6 lg:px-12">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-20">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="text-white font-bold text-xl tracking-wide">
            AUROSY
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
            Beta
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-full px-2 py-1.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                activePath === item.path
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
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

      {/* Robot SVG illustration */}
      <div className="relative z-10">
        <svg width="420" height="480" viewBox="0 0 420 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
          {/* Head */}
          <ellipse cx="210" cy="120" rx="85" ry="95" fill="url(#headGrad)" stroke="url(#strokeGrad)" strokeWidth="1.5" />
          <ellipse cx="210" cy="115" rx="70" ry="78" fill="url(#headInner)" opacity="0.6" />

          {/* Eyes */}
          <circle cx="180" cy="105" r="14" fill="#0B0F14" />
          <circle cx="240" cy="105" r="14" fill="#0B0F14" />
          <circle cx="180" cy="105" r="8" fill="url(#eyeGrad)">
            <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx="240" cy="105" r="8" fill="url(#eyeGrad)">
            <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" begin="0.5s" />
          </circle>
          <circle cx="180" cy="103" r="3" fill="white" opacity="0.8" />
          <circle cx="240" cy="103" r="3" fill="white" opacity="0.8" />

          {/* Visor line */}
          <path d="M155 105 Q210 85 265 105" stroke="url(#strokeGrad)" strokeWidth="1" fill="none" opacity="0.3" />

          {/* Neck */}
          <rect x="195" y="210" width="30" height="25" rx="4" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />

          {/* Torso */}
          <path d="M140 235 L280 235 L270 380 L150 380 Z" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="1" rx="10" />
          {/* Chest plate */}
          <path d="M170 260 L250 260 L245 340 L175 340 Z" fill="url(#chestGrad)" stroke="url(#strokeGrad)" strokeWidth="0.5" opacity="0.5" />
          {/* Arc reactor */}
          <circle cx="210" cy="295" r="18" fill="url(#reactorGrad)" opacity="0.8">
            <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="210" cy="295" r="10" fill="url(#reactorInner)" />
          <circle cx="210" cy="295" r="5" fill="#a855f7" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
          </circle>

          {/* Left arm */}
          <rect x="100" y="240" width="35" height="80" rx="12" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <rect x="105" y="325" width="25" height="60" rx="8" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <circle cx="117" cy="280" r="6" fill="url(#jointGrad)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Right arm */}
          <rect x="285" y="240" width="35" height="80" rx="12" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <rect x="290" y="325" width="25" height="60" rx="8" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <circle cx="303" cy="280" r="6" fill="url(#jointGrad)">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" begin="0.7s" />
          </circle>

          {/* Left leg */}
          <rect x="160" y="380" width="35" height="70" rx="10" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <rect x="155" y="450" width="45" height="18" rx="8" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />

          {/* Right leg */}
          <rect x="225" y="380" width="35" height="70" rx="10" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />
          <rect x="220" y="450" width="45" height="18" rx="8" fill="url(#bodyGrad)" stroke="url(#strokeGrad)" strokeWidth="0.8" />

          {/* Joint dots */}
          <circle cx="177" cy="385" r="5" fill="url(#jointGrad)" opacity="0.7" />
          <circle cx="243" cy="385" r="5" fill="url(#jointGrad)" opacity="0.7" />

          {/* Gradients */}
          <defs>
            <linearGradient id="headGrad" x1="125" y1="25" x2="295" y2="215">
              <stop offset="0%" stopColor="#2a2a3e" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </linearGradient>
            <linearGradient id="headInner" x1="140" y1="37" x2="280" y2="193">
              <stop offset="0%" stopColor="#3a3a50" />
              <stop offset="100%" stopColor="#1a1a2e" />
            </linearGradient>
            <radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7c3aed" />
            </radialGradient>
            <linearGradient id="strokeGrad" x1="0" y1="0" x2="420" y2="480">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="bodyGrad" x1="100" y1="235" x2="320" y2="470">
              <stop offset="0%" stopColor="#252540" />
              <stop offset="100%" stopColor="#18182e" />
            </linearGradient>
            <linearGradient id="chestGrad" x1="170" y1="260" x2="250" y2="340">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.05" />
            </linearGradient>
            <radialGradient id="reactorGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
            </radialGradient>
            <radialGradient id="reactorInner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
            </radialGradient>
            <radialGradient id="jointGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.5" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Floating badges */}
      <FloatingBadge className="top-[15%] right-[5%] animate-float-slow">
        Browser-based simulation
      </FloatingBadge>
      <FloatingBadge className="top-[50%] right-[0%] animate-float-medium">
        29-DoF full body control
      </FloatingBadge>
      <FloatingBadge className="bottom-[25%] right-[8%] animate-float-fast">
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
          {/* Tagline pill */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              AI-powered robotics platform
            </span>
          </div>

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

          {/* CTA buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(user ? "/pose" : "/register")}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:from-purple-500 hover:to-purple-400 transition-all cursor-pointer"
            >
              Start building
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <Link
              to="/docs"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-gray-300 hover:text-white transition-colors group"
            >
              Documentation
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>

        {/* Right — Robot visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center relative">
          <RobotVisual />
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

export function LandingPricing() {
  return (
    <PageTransition direction="right">
      <div className="flex h-full items-center px-6 lg:px-12 xl:px-20">
        <div className="max-w-[1000px] mx-auto w-full grid md:grid-cols-3 gap-6">
          {[
            { name: "Free", price: "$0", features: ["1 project", "Browser simulation", "Community support"] },
            { name: "Pro", price: "$49", features: ["Unlimited projects", "RL training", "Priority support", "Team collaboration"], highlight: true },
            { name: "Enterprise", price: "Custom", features: ["Dedicated instance", "On-premise deploy", "Custom integrations", "24/7 support"] },
          ].map((plan) => (
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
              <button className={`w-full py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                plan.highlight
                  ? "bg-purple-600 text-white hover:bg-purple-500"
                  : "bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white"
              }`}>
                {plan.name === "Enterprise" ? "Contact us" : "Get started"}
              </button>
            </div>
          ))}
        </div>
      </div>
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
