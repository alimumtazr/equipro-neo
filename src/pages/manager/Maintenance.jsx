import { useEffect, useState } from "react";
import { CheckCircle2, Wrench } from "lucide-react";

import { api, ApiError } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";

export default function Maintenance() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);

  async function reload() {
    try {
      setLoading(true);
      const data = await api.listMaintenance();
      setUnits(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleRestore(unit) {
    const note = prompt(`Restore ${unit.unit_id} to good condition? Add a note (optional):`);
    if (note === null) return;
    try {
      setBusy(unit.unit_id);
      await api.restoreUnit(unit.component_id, unit.unit_id, note || null);
      setToast({ type: "success", message: `${unit.unit_id} restored to good condition.` });
      setTimeout(() => setToast(null), 2200);
      await reload();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof ApiError ? err.message : "Restore failed",
      });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Maintenance queue</h1>
        <p className="text-sm font-medium text-neo-muted">
          Damaged or lost units land here after a return is processed. Restore when repairs are done.
        </p>
      </div>

      {error && (
        <div className="neo-card p-3 border-neo-pink bg-neo-pink/10 text-sm font-bold">{error}</div>
      )}

      {loading ? (
        <div className="neo-card h-32 animate-pulse bg-neo-bg" />
      ) : units.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="All clear"
          description="There are no damaged or lost units waiting for repair. Flag issues during the return flow to populate this queue."
        />
      ) : (
        <div className="neo-card overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-neo-yellow/40 text-[10px] uppercase font-black border-b-2 border-neo-line">
              <tr>
                <th className="p-3 text-left">Unit</th>
                <th className="p-3 text-left">Component</th>
                <th className="p-3 text-left">Condition</th>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-left">Photo</th>
                <th className="p-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-neo-line bg-white">
              {units.map((unit) => (
                <tr key={`${unit.component_id}-${unit.unit_id}`} className="align-top">
                  <td className="p-3 font-mono text-xs font-bold">{unit.unit_id}</td>
                  <td className="p-3">
                    <div className="font-bold">{unit.component_name}</div>
                    <div className="text-xs font-mono text-neo-muted">{unit.component_code}</div>
                  </td>
                  <td className="p-3">
                    <span className={`pill ${unit.condition === "damaged" ? "pill-out" : "pill-neutral"}`}>
                      {unit.condition}
                    </span>
                  </td>
                  <td className="p-3 text-xs font-semibold text-neo-ink max-w-sm">
                    {unit.note || <span className="text-neo-muted">—</span>}
                  </td>
                  <td className="p-3">
                    {unit.photo ? (
                      <img
                        src={unit.photo}
                        alt={`Damage on ${unit.unit_id}`}
                        className="h-12 w-12 object-cover border-2 border-neo-line shadow-neo-sm"
                      />
                    ) : (
                      <span className="text-neo-muted text-xs font-medium">No photo</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRestore(unit)}
                      disabled={busy === unit.unit_id}
                      className="neo-btn-secondary"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {busy === unit.unit_id ? "Restoring…" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 neo-border font-bold text-sm shadow-neo max-w-[90vw] ${
            toast.type === "success" ? "bg-neo-ink text-white border-white" : "bg-neo-pink text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
