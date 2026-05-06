import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";

import { api, ApiError } from "../lib/api.js";

const PALETTE = [
  "#0E7C3F",
  "#1E3A8A",
  "#9333EA",
  "#D97706",
  "#DC2626",
  "#0891B2",
  "#DB2777",
  "#65A30D",
];

const ROLE_OPTIONS = [
  { id: "student", label: "Student" },
  { id: "manager", label: "Lab Manager" },
];

const STUDENT_YEARS = ["1st Year", "2nd Year", "3rd Year", "Final Year (FYP)"];

const INITIAL_FORM = {
  name: "",
  reg_number: "",
  role: "student",
  program: "BS Computer Science",
  year: "1st Year",
  lab: "CS Lab",
  avatar_color: PALETTE[0],
};

export default function CreatePersonaModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const regNumber = form.reg_number.trim();
    if (!name || !regNumber) {
      setError("Name and registration number are required.");
      return;
    }

    const payload = {
      name,
      reg_number: regNumber,
      role: form.role,
      avatar_color: form.avatar_color,
      program: form.role === "student" ? form.program.trim() || null : null,
      year: form.role === "student" ? form.year.trim() || null : null,
      lab: form.role === "manager" ? form.lab.trim() || null : null,
    };

    try {
      setSubmitting(true);
      const created = await api.createUser(payload);
      onCreated?.(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neo-ink/50" onClick={onClose} aria-hidden />
      <div
        className="relative neo-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-persona-title"
      >
        <header className="flex items-start justify-between mb-3">
          <div>
            <h2 id="create-persona-title" className="font-display text-lg font-bold">
              Add test user
            </h2>
            <p className="text-xs font-medium text-neo-muted mt-0.5">
              Creates a profile in the prototype database (no password).
            </p>
          </div>
          <button onClick={onClose} className="neo-btn-ghost p-1.5" aria-label="Close" type="button">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="cp-name" className="neo-label">
              Full name <span className="text-neo-pink">*</span>
            </label>
            <input
              id="cp-name"
              className="neo-input"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Sara Khan"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="cp-reg" className="neo-label">
              Registration / staff number <span className="text-neo-pink">*</span>
            </label>
            <input
              id="cp-reg"
              className="neo-input"
              value={form.reg_number}
              onChange={(e) => update({ reg_number: e.target.value })}
              placeholder="e.g. 2024042 or STAFF-021"
              required
            />
          </div>

          <div>
            <span className="neo-label">Role</span>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => update({ role: option.id })}
                  className={`neo-btn border-2 py-2 text-xs ${
                    form.role === option.id
                      ? "bg-neo-cyan/50 border-neo-line shadow-neo-sm"
                      : "bg-white"
                  }`}
                  aria-pressed={form.role === option.id}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {form.role === "student" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cp-program" className="neo-label">
                  Program
                </label>
                <input
                  id="cp-program"
                  className="neo-input"
                  value={form.program}
                  onChange={(e) => update({ program: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="cp-year" className="neo-label">
                  Year
                </label>
                <select
                  id="cp-year"
                  className="neo-input"
                  value={form.year}
                  onChange={(e) => update({ year: e.target.value })}
                >
                  {STUDENT_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="cp-lab" className="neo-label">
                Lab
              </label>
              <input
                id="cp-lab"
                className="neo-input"
                value={form.lab}
                onChange={(e) => update({ lab: e.target.value })}
                placeholder="e.g. CS Lab — Block C"
              />
            </div>
          )}

          <div>
            <span className="neo-label">Avatar colour</span>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ avatar_color: color })}
                  className={`h-8 w-8 border-2 shadow-neo-sm ${
                    form.avatar_color === color ? "border-neo-line ring-2 ring-neo-pink" : "border-neo-line"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Pick colour`}
                  aria-pressed={form.avatar_color === color}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="neo-border bg-neo-pink/10 p-3 text-sm font-semibold text-neo-ink flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button type="button" onClick={onClose} className="neo-btn-secondary flex-1" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="neo-btn-primary flex-1" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
