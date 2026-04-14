import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: ["1 project", "Browser simulation", "Community support"],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mo",
    features: ["Unlimited projects", "RL training", "Priority support", "Team collaboration"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Dedicated instance", "On-premise deploy", "Custom integrations", "24/7 support"],
  },
];

const TRIAL_DAYS = 20;

export default function Billing() {
  const { user } = useAuth();

  const plan = user?.plan || "free";
  const isTrial = plan === "trial";

  const trialInfo = useMemo(() => {
    if (!isTrial || !user?.trial_ends_at) return null;
    const end = new Date(user.trial_ends_at);
    const now = new Date();
    const totalMs = TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const remainMs = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(remainMs / (24 * 60 * 60 * 1000)));
    const progress = Math.min(100, Math.max(0, ((totalMs - remainMs) / totalMs) * 100));
    const endDate = end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return { daysLeft, progress, endDate, expired: daysLeft <= 0 };
  }, [isTrial, user?.trial_ends_at]);

  const currentPlanLabel = isTrial ? "Pro Trial" : plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Billing</h1>
        <p className="text-gray-400">Manage your subscription and billing details.</p>
      </div>

      {/* Trial banner */}
      {isTrial && trialInfo && (
        <div className={`rounded-2xl p-6 mb-6 border ${trialInfo.expired ? "bg-red-500/10 border-red-500/30" : "bg-purple-500/10 border-purple-500/30"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={trialInfo.expired ? "#ef4444" : "#a855f7"} strokeWidth="2">
                <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
              </svg>
              <span className={`font-semibold ${trialInfo.expired ? "text-red-400" : "text-purple-300"}`}>
                {trialInfo.expired ? "Trial Expired" : `${trialInfo.daysLeft} days left in your trial`}
              </span>
            </div>
            <span className="text-gray-400 text-sm">Ends {trialInfo.endDate}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all ${trialInfo.expired ? "bg-red-500" : "bg-gradient-to-r from-purple-500 to-purple-400"}`}
              style={{ width: `${trialInfo.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {trialInfo.expired
                ? "Your trial has ended. You've been moved to the Free plan."
                : "You have full Pro access during your trial. No credit card required."}
            </p>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-full transition-colors cursor-pointer shrink-0 ml-4">
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Current plan info */}
      <div className="bg-[#161a22] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <p className="text-white text-xl font-semibold">{currentPlanLabel}</p>
              {isTrial && !trialInfo?.expired && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  Trial
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Account</p>
            <p className="text-white text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* After trial section */}
      {isTrial && (
        <div className="bg-[#161a22] border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">What happens after the trial?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <p className="text-gray-300 font-medium text-sm">Free Plan (automatic)</p>
              </div>
              <ul className="space-y-1.5">
                <li className="text-gray-500 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  1 project
                </li>
                <li className="text-gray-500 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Browser simulation
                </li>
                <li className="text-gray-500 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Community support
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <p className="text-purple-300 font-medium text-sm">Pro Plan — $49/mo</p>
              </div>
              <ul className="space-y-1.5 mb-3">
                <li className="text-gray-400 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Unlimited projects
                </li>
                <li className="text-gray-400 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  RL training
                </li>
                <li className="text-gray-400 text-xs flex items-center gap-1.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Priority support & team collaboration
                </li>
              </ul>
              <button className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer">
                Upgrade now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans grid — for non-trial users or when trial expired */}
      {(!isTrial || trialInfo?.expired) && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-6 border transition-all ${
                  p.highlight
                    ? "bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
                    : "bg-white/[0.03] border-white/[0.06]"
                }`}
              >
                <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                <div className="text-3xl font-bold text-white mb-5">
                  {p.price}
                  <span className="text-sm font-normal text-gray-400">{p.period}</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.highlight ? "#a855f7" : "#6b7280"} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                    plan === p.name.toLowerCase()
                      ? "bg-white/[0.06] text-gray-500 cursor-default"
                      : p.highlight
                        ? "bg-purple-600 text-white hover:bg-purple-500"
                        : "bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                  disabled={plan === p.name.toLowerCase()}
                >
                  {plan === p.name.toLowerCase() ? "Current plan" : p.name === "Enterprise" ? "Contact us" : "Upgrade"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Billing history */}
      <div className="bg-[#161a22] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Billing History</h2>
        <div className="text-gray-500 text-sm py-8 text-center">
          No billing history yet.
        </div>
      </div>
    </div>
  );
}
