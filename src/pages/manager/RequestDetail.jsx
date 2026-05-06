import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Tag,
  User2,
  XCircle,
  Undo2,
} from "lucide-react";

import { api, ApiError } from "../../lib/api.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDateTime } from "../../lib/format.js";

export default function ManagerRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [components, setComponents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState({});
  const [studentAccepted, setStudentAccepted] = useState(false);

  async function reload() {
    try {
      const data = await api.getRequest(id);
      setRequest(data);
      setStudentAccepted(data.accepted_responsibility_at != null);
      const ids = data.items.map((i) => i.component_id);
      const fetched = await Promise.all(ids.map((cid) => api.getComponent(cid)));
      const map = {};
      fetched.forEach((c) => {
        map[c._id] = c;
      });
      setComponents(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await api.getRequest(id);
        if (cancelled) return;
        setRequest(data);
        setStudentAccepted(data.accepted_responsibility_at != null);
        const ids = data.items.map((i) => i.component_id);
        const fetched = await Promise.all(ids.map((cid) => api.getComponent(cid)));
        if (cancelled) return;
        const map = {};
        fetched.forEach((c) => {
          map[c._id] = c;
        });
        setComponents(map);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="neo-card h-64 animate-pulse bg-neo-bg" />;
  if (error) return <div className="neo-card p-4 font-semibold border-neo-pink bg-neo-pink/10">{error}</div>;
  if (!request) return null;

  async function handleApprove() {
    if (!confirm("Approve and reserve units for this request?")) return;
    try {
      setBusy(true);
      await api.approveRequest(request._id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  }

  function autoScan(item) {
    const comp = components[item.component_id];
    if (!comp) return;
    const free = comp.units
      .filter((u) => u.condition === "good" && u.holder_request_id == null)
      .slice(0, item.qty)
      .map((u) => u.unit_id);
    setScanned((prev) => ({ ...prev, [item.component_id]: free }));
  }

  function setScanForItem(componentId, value) {
    const ids = value
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setScanned((prev) => ({ ...prev, [componentId]: ids }));
  }

  async function handleIssue() {
    const items = request.items.map((item) => ({
      component_id: item.component_id,
      unit_ids: scanned[item.component_id] || [],
    }));
    for (const entry of items) {
      const expected = request.items.find((i) => i.component_id === entry.component_id).qty;
      if (entry.unit_ids.length !== expected) {
        setError(`Scan exactly ${expected} unit(s) for each component before issuing.`);
        return;
      }
    }
    try {
      setBusy(true);
      await api.issueRequest(request._id, { items, student_accepted: studentAccepted });
      await reload();
      setScanned({});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Issue failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-black inline-flex items-center gap-1 neo-btn-ghost px-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="neo-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-mono font-bold text-neo-muted">#{request.request_number}</span>
              <StatusBadge status={request.status} />
              {request.same_day_flag && <span className="pill-limited text-[10px]">Same-day</span>}
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold">{request.project_title}</h1>
            <div className="text-sm font-medium text-neo-muted mt-1">
              {request.student_name} · {request.supervisor || "No supervisor listed"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {request.status === "pending" && (
              <button type="button" onClick={handleApprove} className="neo-btn-primary" disabled={busy}>
                <CheckCircle2 className="h-4 w-4" /> Approve & reserve
              </button>
            )}
            {request.status === "active" && (
              <Link to={`/manager/requests/${request._id}/return`} className="neo-btn-primary">
                <Undo2 className="h-4 w-4" /> Process return
              </Link>
            )}
            {(request.status === "pending" || request.status === "approved") && (
              <button
                type="button"
                className="neo-btn-danger"
                onClick={async () => {
                  if (!confirm("Cancel this request?")) return;
                  try {
                    setBusy(true);
                    await api.cancelRequest(request._id);
                    await reload();
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : "Failed");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              >
                <XCircle className="h-4 w-4" /> Cancel
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
          <Field icon={Calendar} label="Return by" value={formatDateTime(request.return_date)} />
          <Field icon={User2} label="Student" value={`${request.student_name}`} />
          <Field
            icon={ShieldCheck}
            label="Responsibility"
            value={
              request.accepted_responsibility_at
                ? `Accepted ${formatDateTime(request.accepted_responsibility_at)}`
                : "Not yet accepted"
            }
          />
        </div>
      </header>

      {error && (
        <div className="neo-card p-3 border-neo-pink bg-neo-pink/10 text-sm font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <section className="neo-card p-5">
        <h2 className="font-display font-bold mb-3">Items</h2>
        <ul className="divide-y-2 divide-neo-line">
          {request.items.map((item) => {
            const comp = components[item.component_id];
            const isApproved = request.status === "approved";
            const ids = scanned[item.component_id] || [];
            const issued = item.issued_unit_ids || [];
            return (
              <li key={item.component_id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-neo-muted" aria-hidden />
                  <div>
                    <div className="font-bold">{item.component_name}</div>
                    <div className="text-xs font-mono text-neo-muted">
                      {item.component_code} · Qty {item.qty}
                      {comp && ` · ${comp.available_qty}/${comp.total_qty} free`}
                    </div>
                  </div>
                </div>

                {isApproved && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      className="neo-input py-1 text-xs min-w-[140px]"
                      placeholder={`Scan ${item.qty} unit ID${item.qty > 1 ? "s" : ""}`}
                      value={ids.join(", ")}
                      onChange={(e) => setScanForItem(item.component_id, e.target.value)}
                      aria-label={`Unit IDs for ${item.component_name}`}
                    />
                    <button
                      type="button"
                      onClick={() => autoScan(item)}
                      className="neo-btn-secondary py-1 text-xs"
                    >
                      <ScanLine className="h-3.5 w-3.5" /> Scan
                    </button>
                    <span className={`pill ${ids.length === item.qty ? "pill-available" : "pill-neutral"}`}>
                      {ids.length}/{item.qty}
                    </span>
                  </div>
                )}

                {(request.status === "active" || request.status === "returned") && issued.length > 0 && (
                  <span className="pill-neutral font-mono text-[10px]">{issued.join(", ")}</span>
                )}
              </li>
            );
          })}
        </ul>

        {request.status === "approved" && (
          <div className="mt-4 border-t-2 border-neo-line pt-4 space-y-3">
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={studentAccepted}
                onChange={(e) => setStudentAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 border-2 border-neo-line"
              />
              <span>
                Student confirmed <strong>I accept responsibility</strong>
                {request.accepted_responsibility_at && (
                  <span className="ml-1 text-xs font-medium text-neo-muted">
                    (logged {formatDateTime(request.accepted_responsibility_at)})
                  </span>
                )}
              </span>
            </label>
            <button type="button" onClick={handleIssue} className="neo-btn-primary" disabled={busy || !studentAccepted}>
              <PackageCheck className="h-4 w-4" /> Confirm issue
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-neo-muted mt-0.5" aria-hidden />
      <div>
        <div className="neo-label mb-0">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}
