import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const PLANS = [
  { name: "Free", price: "$0", period: "/mo", features: ["1 project", "Browser simulation", "Community support"], current: true },
  { name: "Pro", price: "$49", period: "/mo", features: ["Unlimited projects", "RL training", "Priority support", "Team collaboration"], highlight: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["Dedicated instance", "On-premise deploy", "Custom integrations", "24/7 support"] },
];

export default function Billing() {
  const { user } = useAuth();
  const [currentPlan] = useState("Free");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">Billing</h1>
        <p className="text-gray-400">Manage your subscription and billing details.</p>
      </div>

      {/* Current plan info */}
      <div className="bg-[#161a22] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-1">Current Plan</p>
            <p className="text-white text-xl font-semibold">{currentPlan}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm mb-1">Account</p>
            <p className="text-white text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <h2 className="text-lg font-semibold text-white mb-4">Available Plans</h2>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 border transition-all ${
              plan.highlight
                ? "bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/10"
                : "bg-white/[0.03] border-white/[0.06]"
            }`}
          >
            <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
            <div className="text-3xl font-bold text-white mb-5">
              {plan.price}
              <span className="text-sm font-normal text-gray-400">{plan.period}</span>
            </div>
            <ul className="space-y-2.5 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="text-gray-400 text-sm flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.highlight ? "#a855f7" : "#6b7280"} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                currentPlan === plan.name
                  ? "bg-white/[0.06] text-gray-500 cursor-default"
                  : plan.highlight
                    ? "bg-purple-600 text-white hover:bg-purple-500"
                    : "bg-white/[0.06] text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
              disabled={currentPlan === plan.name}
            >
              {currentPlan === plan.name ? "Current plan" : plan.name === "Enterprise" ? "Contact us" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      {/* Billing history placeholder */}
      <div className="bg-[#161a22] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Billing History</h2>
        <div className="text-gray-500 text-sm py-8 text-center">
          No billing history yet.
        </div>
      </div>
    </div>
  );
}
