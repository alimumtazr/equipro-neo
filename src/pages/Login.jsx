import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, AlertCircle, UserPlus } from "lucide-react";

import { api } from "../lib/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import CreatePersonaModal from "../components/CreatePersonaModal.jsx";

export default function Login() {
  const { user, loginAs } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(user.role === "manager" ? "/manager" : "/catalog", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listUsers();
        if (!cancelled) setUsers(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(targetUser) {
    const uid = targetUser._id ?? targetUser.id;
    try {
      setSigningIn(uid);
      await loginAs(uid);
      navigate(targetUser.role === "manager" ? "/manager" : "/catalog", { replace: true });
    } catch (err) {
      setError(err.message);
      setSigningIn(null);
    }
  }

  async function handleCreated(created) {
    setCreateOpen(false);
    setUsers((prev) => [...prev, created]);
    await handleLogin(created);
  }

  const managers = users.filter((u) => u.role === "manager");
  const students = users.filter((u) => u.role === "student");

  return (
    <div className="min-h-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-10 neo-border bg-neo-yellow shadow-neo m-4 lg:m-6 rounded-sm border-neo-line">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center border-2 border-neo-line bg-white font-display font-bold shadow-neo-sm">
              EP
            </span>
            <span className="font-display text-xl font-bold">EquiPro</span>
          </div>
          <h1 className="mt-12 font-display text-4xl font-bold leading-tight">
            Lab equipment checkout — without the paper trail.
          </h1>
          <p className="mt-4 max-w-md text-sm font-medium text-neo-ink/80">
            Browse stock from your room, submit one request for many parts, and let managers track
            returns and damage. GIKI CS324 — Human Computer Interaction.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Sign in</h2>
              <p className="mt-1 text-sm font-medium text-neo-muted">
                Pick your role below — no password in this prototype. Switch anytime from the header.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="neo-btn-secondary shrink-0 text-xs"
            >
              <UserPlus className="h-4 w-4" />
              New user
            </button>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 neo-border border-neo-pink bg-neo-pink/10 p-3 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 space-y-8">
            <PersonaList
              title="Lab manager"
              users={managers}
              loading={loading}
              onSelect={handleLogin}
              signingIn={signingIn}
            />
            <PersonaList
              title="Students"
              users={students}
              loading={loading}
              onSelect={handleLogin}
              signingIn={signingIn}
            />
          </div>
        </div>
      </div>

      <CreatePersonaModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

function PersonaList({ title, users, loading, onSelect, signingIn }) {
  return (
    <section>
      <h3 className="neo-label text-neo-ink mb-3 border-b-2 border-neo-line pb-1 inline-block">
        {title}
      </h3>
      <ul className="space-y-2">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => (
              <li key={i} className="neo-card h-16 animate-pulse bg-neo-bg" />
            ))
          : users.map((u) => {
              const uid = u._id ?? u.id;
              return (
              <li key={uid}>
                <button
                  type="button"
                  onClick={() => onSelect(u)}
                  disabled={signingIn !== null}
                  className="w-full neo-card p-3 flex items-center gap-3 text-left hover:bg-neo-cyan/20 transition-colors disabled:opacity-60"
                >
                  <span
                    className="grid h-11 w-11 place-items-center border-2 border-neo-line text-sm font-bold text-white shadow-neo-sm"
                    style={{ backgroundColor: u.avatar_color }}
                    aria-hidden
                  >
                    {u.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-neo-ink truncate">{u.name}</div>
                    <div className="text-xs font-medium text-neo-muted">
                      {u.role === "manager"
                        ? `${u.lab} · ${u.reg_number}`
                        : `${u.year} · ${u.reg_number}`}
                    </div>
                  </div>
                  {signingIn === uid ? (
                    <span className="text-xs font-bold text-neo-muted">Signing in…</span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-neo-ink" />
                  )}
                </button>
              </li>
            );
            })}
      </ul>
    </section>
  );
}
