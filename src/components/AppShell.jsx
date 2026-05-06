import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const studentLinks = [
  { to: "/catalog", label: "Catalog" },
  { to: "/my-requests", label: "My Requests" },
];

const managerLinks = [
  { to: "/manager", label: "Dashboard" },
  { to: "/manager/maintenance", label: "Maintenance" },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;
  const links = user.role === "manager" ? managerLinks : studentLinks;

  function handleSwitch() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 neo-border bg-white shadow-neo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-14 items-center gap-4">
          <Link
            to={user.role === "manager" ? "/manager" : "/catalog"}
            className="flex items-center gap-2"
          >
            <span className="grid h-9 w-9 place-items-center border-2 border-neo-line bg-neo-yellow font-display font-bold shadow-neo-sm">
              EP
            </span>
            <span className="hidden sm:block font-display font-bold tracking-tight">
              EquiPro
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm font-bold border-2 transition ${
                    isActive
                      ? "border-neo-line bg-neo-cyan/40 shadow-neo-sm text-neo-ink"
                      : "border-transparent hover:border-neo-line hover:bg-neo-bg"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l-2 border-neo-line">
              <span
                className="grid h-9 w-9 place-items-center border-2 border-neo-line text-xs font-bold text-white shadow-neo-sm"
                style={{ backgroundColor: user.avatar_color }}
                aria-hidden
              >
                {user.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold">{user.name}</div>
                <div className="text-xs font-medium text-neo-muted">
                  {user.role === "manager" ? user.lab : user.year || user.program}
                </div>
              </div>
            </div>
            <button
              onClick={handleSwitch}
              className="neo-btn-secondary text-xs py-1.5"
              aria-label="Switch user"
              type="button"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Switch</span>
            </button>
            <button
              className="md:hidden neo-btn-ghost p-2"
              aria-label="Toggle navigation"
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden border-t-2 border-neo-line bg-neo-bg">
            <div className="mx-auto max-w-7xl px-4 py-2 flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-2 py-2 text-sm font-bold border-2 ${
                      isActive
                        ? "border-neo-line bg-white shadow-neo-sm"
                        : "border-transparent"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
