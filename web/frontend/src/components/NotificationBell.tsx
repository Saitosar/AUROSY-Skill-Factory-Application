import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

interface UserNotification {
  id: string;
  title: string;
  desc: string;
  icon: string;
  time: string;
  read: boolean;
}

const STORAGE_KEY = "aurosy_notifications_dismissed";

function getDefaultNotifications(): UserNotification[] {
  return [
    { id: "welcome", title: "Welcome to AUROSY!", desc: "Start by exploring the Motion Studio to create your first robot skill.", icon: "🎉", time: "now", read: false },
    { id: "trial", title: "20-day trial active", desc: "You have full Pro access. Build, train, and export skills freely.", icon: "⏱️", time: "now", read: false },
    { id: "keyframe-editor", title: "New: Visual Keyframe Editor", desc: "Design robot motions frame-by-frame in your browser.", icon: "🆕", time: "1d ago", read: false },
  ];
}

/**
 * Shared notification bell for both Landing and AppShell.
 * variant="landing" — thin icon style for dark landing page
 * variant="app" — matches AppShell topbar style
 */
export default function NotificationBell({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const { user } = useAuth();
  const isRegularUser = user && user.role !== "admin";

  const [notifications, setNotifications] = useState<UserNotification[]>(() => {
    if (typeof window === "undefined") return [];
    const dismissed = localStorage.getItem(STORAGE_KEY);
    const dismissedSet = dismissed ? new Set(JSON.parse(dismissed)) : new Set();
    return getDefaultNotifications().filter((n) => !dismissedSet.has(n.id));
  });

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = isRegularUser ? notifications.filter((n) => !n.read).length : 0;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    const allIds = getDefaultNotifications().map((n) => n.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    setNotifications([]);
    setOpen(false);
  };

  const isLanding = variant === "landing";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) markAllRead();
        }}
        className={
          isLanding
            ? "text-gray-500 hover:text-white transition-colors relative cursor-pointer"
            : "relative p-2 rounded-xl text-gray-400 hover:text-purple-300 hover:bg-white/[0.04] transition-all cursor-pointer"
        }
      >
        <svg
          width={isLanding ? "18" : "20"}
          height={isLanding ? "18" : "20"}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={isLanding ? "1.5" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className={
              isLanding
                ? "absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                : "absolute -top-0.5 -right-0.5 w-5 h-5 bg-purple-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse"
            }
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 transition-colors cursor-pointer">
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {!isRegularUser ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">Sign in to see notifications</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${!n.read ? "bg-purple-500/[0.05]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0 mt-0.5">{n.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.desc}</p>
                      <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
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
