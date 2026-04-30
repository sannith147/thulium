import React, { useEffect, useState, useRef } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Latex } from "./Latex";

export function NotificationBell() {
  const { auth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get(`/student/dashboard/notifications/${auth.id}`);
      setNotifications(data?.notifications || []);
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.put(`/student/dashboard/notifications/${auth.id}/read`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      markAsRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-700 bg-slate-800 shadow-xl shadow-slate-950/50">
          <div className="flex items-center justify-between border-b border-slate-700 p-4">
            <h3 className="font-semibold text-slate-100">Broadcasts</h3>
            {unreadCount === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm italic text-slate-500">
                No new broadcasts.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`mb-2 rounded-lg p-3 text-sm transition-colors ${!notification.is_read ? "bg-indigo-500/10" : "hover:bg-slate-700/50"
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-indigo-400">Announcement</span>
                    <span>
                      {new Date(notification.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                      {new Date(notification.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-slate-200">
                    <Latex displayMode={true}>{notification.message}</Latex>
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
