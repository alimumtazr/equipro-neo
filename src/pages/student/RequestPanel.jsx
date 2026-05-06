import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Minus, Plus, Trash2, X } from "lucide-react";

import { api, ApiError } from "../../lib/api.js";

function formatLocalForInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function RequestPanel({ open, onClose, cart, onUpdateQty, onRemove, onSubmitted }) {
  const tomorrowAt5 = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(17, 0, 0, 0);
    return formatLocalForInput(date);
  }, []);

  const [projectTitle, setProjectTitle] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [returnDate, setReturnDate] = useState(tomorrowAt5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setError(null);
    }
  }, [open]);

  const hasUnavailable = cart.some((entry) => entry.qty > entry.available_qty);

  async function handleSubmit(event) {
    event?.preventDefault?.();
    setError(null);
    if (!projectTitle.trim()) {
      setError("Project title is required");
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one component");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        items: cart.map((entry) => ({ component_id: entry.component_id, qty: entry.qty })),
        project_title: projectTitle.trim(),
        supervisor: supervisor.trim() || null,
        return_date: new Date(returnDate).toISOString(),
      };
      await api.createRequest(payload);
      onSubmitted?.();
      setProjectTitle("");
      setSupervisor("");
      setReturnDate(tomorrowAt5);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-neo-ink/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`absolute top-0 right-0 h-full w-full sm:w-[480px] bg-neo-bg border-l-2 border-neo-line shadow-neo-lg flex flex-col transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-panel-title"
      >
        <header className="flex items-center justify-between p-4 border-b-2 border-neo-line bg-white">
          <h2 id="request-panel-title" className="font-display font-bold text-lg">
            Review request
          </h2>
          <button onClick={onClose} className="neo-btn-ghost p-1.5" aria-label="Close panel" type="button">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <section>
              <h3 className="neo-label mb-2">Items ({cart.length})</h3>
              {cart.length === 0 ? (
                <p className="text-sm font-medium text-neo-muted">
                  No items yet. Add components from the catalog.
                </p>
              ) : (
                <ul className="divide-y-2 divide-neo-line border-2 border-neo-line bg-white shadow-neo-sm">
                  {cart.map((entry) => (
                    <li key={entry.component_id} className="p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{entry.component_name}</div>
                        <div className="text-xs font-mono text-neo-muted">{entry.component_code}</div>
                        {entry.qty > entry.available_qty && (
                          <div className="text-xs font-bold text-neo-ink mt-1 bg-neo-yellow/50 inline-block px-1 border border-neo-line">
                            Waitlist path — only {entry.available_qty} of {entry.total_qty} available now
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="neo-btn-ghost p-1.5"
                          onClick={() => onUpdateQty(entry.component_id, entry.qty - 1)}
                          disabled={entry.qty <= 1}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-black">{entry.qty}</span>
                        <button
                          type="button"
                          className="neo-btn-ghost p-1.5"
                          onClick={() => onUpdateQty(entry.component_id, entry.qty + 1)}
                          disabled={entry.qty >= entry.total_qty}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="neo-btn-ghost p-1.5 text-neo-pink"
                        onClick={() => onRemove(entry.component_id)}
                        aria-label="Remove from request"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <label htmlFor="project_title" className="neo-label">
                  Project title <span className="text-neo-pink">*</span>
                </label>
                <input
                  id="project_title"
                  className="neo-input"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. DLD Lab — Traffic light controller"
                  required
                />
              </div>
              <div>
                <label htmlFor="supervisor" className="neo-label">
                  Supervisor / lab section (optional)
                </label>
                <input
                  id="supervisor"
                  className="neo-input"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="e.g. Mr. Khan — DLD Section A"
                />
              </div>
              <div>
                <label htmlFor="return_date" className="neo-label">
                  Return by <span className="text-neo-pink">*</span>
                </label>
                <input
                  id="return_date"
                  type="datetime-local"
                  className="neo-input"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={formatLocalForInput(new Date())}
                  required
                />
              </div>
            </section>

            {hasUnavailable && (
              <div className="neo-border bg-neo-yellow/40 p-3 text-xs font-bold text-neo-ink">
                Some items aren&rsquo;t fully in stock. Those lines may be{" "}
                <strong>waitlisted</strong>; you&rsquo;ll get an in-app notification when stock frees up.
              </div>
            )}

            {error && (
              <div className="neo-border bg-neo-pink/15 p-3 text-sm font-semibold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        <footer className="border-t-2 border-neo-line p-4 flex items-center gap-2 bg-white">
          <button onClick={onClose} className="neo-btn-secondary flex-1" type="button">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="neo-btn-primary flex-1"
            disabled={submitting || cart.length === 0}
            type="button"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
