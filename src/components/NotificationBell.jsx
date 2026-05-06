import { Bell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext.jsx";
import { useNotifications } from "../contexts/NotificationContext.jsx";
import { relativeFromNow } from "../lib/format.js";

export default function NotificationBell() {
  const { user } = useAuth();
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function onClick(event) {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function destinationFor(notification) {
    if (!notification.request_id) return null;
    return user?.role === "manager"
      ? `/manager/requests/${notification.request_id}`
      : `/requests/${notification.request_id}`;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="neo-btn-ghost relative"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 neo-badge-alert">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 neo-card z-40">
          <div className="flex items-center justify-between px-3 py-2 border-b-2 border-neo-line bg-neo-yellow/30">
            <h3 className="text-sm font-display font-bold">Notifications</h3>
            {items.some((n) => !n.read) && (
              <button
                onClick={markAllRead}
                type="button"
                className="text-xs font-bold underline decoration-2 underline-offset-2"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y-2 divide-neo-line">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-neo-muted font-medium">
                No notifications yet
              </li>
            ) : (
              items.map((notification) => {
                const link = destinationFor(notification);
                return (
                  <li key={notification._id} className={`p-3 ${notification.read ? "opacity-65" : ""}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        {link ? (
                          <Link
                            to={link}
                            onClick={() => {
                              if (!notification.read) markRead(notification._id);
                              setOpen(false);
                            }}
                            className="text-sm font-semibold text-neo-ink hover:underline"
                          >
                            {notification.message}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-neo-ink">{notification.message}</p>
                        )}
                        <p className="text-[11px] text-neo-muted mt-0.5 font-medium">
                          {relativeFromNow(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markRead(notification._id)}
                          className="neo-btn-ghost p-1.5"
                          aria-label="Mark as read"
                          type="button"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
