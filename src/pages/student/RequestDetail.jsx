import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, XCircle, Calendar, User2, Tag } from "lucide-react";

import { api, ApiError } from "../../lib/api.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDateTime } from "../../lib/format.js";

const STATUS_TIMELINE = [
  { key: "pending", label: "Submitted" },
  { key: "approved", label: "Approved" },
  { key: "active", label: "Issued" },
  { key: "returned", label: "Returned" },
];

export default function StudentRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const data = await api.getRequest(id);
      setRequest(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getRequest(id)
      .then((data) => {
        if (!cancelled) setRequest(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="neo-card h-48 animate-pulse bg-neo-bg" />;
  }

  if (error) {
    return <div className="neo-card p-4 font-semibold border-neo-pink bg-neo-pink/10">{error}</div>;
  }

  if (!request) return null;

  const canCancel = ["pending", "waitlisted", "approved"].includes(request.status);

  async function handleCancel() {
    if (!confirm("Cancel this request? This cannot be undone.")) return;
    try {
      setBusy(true);
      await api.cancelRequest(request._id);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-bold text-neo-ink inline-flex items-center gap-1 neo-btn-ghost px-2"
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
            {request.supervisor && (
              <p className="text-sm font-medium text-neo-muted mt-1">Supervisor: {request.supervisor}</p>
            )}
          </div>
          {canCancel && (
            <button type="button" onClick={handleCancel} className="neo-btn-danger" disabled={busy}>
              <XCircle className="h-4 w-4" /> Cancel request
            </button>
          )}
        </div>

        <Timeline status={request.status} request={request} />
      </header>

      {request.status === "approved" && (
        <div className="neo-card p-5 border-neo-line bg-neo-cyan/25">
          <h2 className="font-display font-bold text-neo-ink flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Pickup ready
          </h2>
          <p className="text-sm font-medium text-neo-ink/90 mt-2">
            Your components are reserved at the lab. Before handover, confirm responsibility so the
            manager can issue tracked units.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="neo-btn-primary"
              disabled={busy || request.accepted_responsibility_at != null}
              onClick={async () => {
                try {
                  setBusy(true);
                  await api.acceptResponsibility(request._id);
                  await reload();
                } catch (err) {
                  setError(err instanceof ApiError ? err.message : "Failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              {request.accepted_responsibility_at ? "Responsibility accepted" : "I accept responsibility"}
            </button>
            {request.accepted_responsibility_at && (
              <span className="text-xs font-bold text-neo-muted">
                {formatDateTime(request.accepted_responsibility_at)}
              </span>
            )}
          </div>
        </div>
      )}

      <section className="neo-card p-5">
        <h2 className="font-display font-bold mb-3">Items</h2>
        <ul className="divide-y-2 divide-neo-line">
          {request.items.map((item) => (
            <li key={item.component_id} className="py-3 flex items-center gap-3">
              <Tag className="h-4 w-4 text-neo-muted" aria-hidden />
              <div className="flex-1 min-w-0">
                <div className="font-bold">{item.component_name}</div>
                <div className="text-xs font-mono text-neo-muted">
                  {item.component_code} · Qty {item.qty}
                </div>
              </div>
              {item.issued_unit_ids.length > 0 && (
                <span className="pill-neutral font-mono text-[10px]">{item.issued_unit_ids.join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="neo-card p-5 grid sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-neo-muted mt-0.5" aria-hidden />
          <div>
            <div className="neo-label mb-0">Return by</div>
            <div className="font-bold">{formatDateTime(request.return_date)}</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <User2 className="h-4 w-4 text-neo-muted mt-0.5" aria-hidden />
          <div>
            <div className="neo-label mb-0">Submitted by</div>
            <div className="font-bold">{request.student_name}</div>
          </div>
        </div>
      </section>

      <div>
        <Link to="/my-requests" className="text-sm font-bold underline decoration-2">
          ← All my requests
        </Link>
      </div>
    </div>
  );
}

function Timeline({ status, request }) {
  function reachedIndex(currentStatus) {
    const order = ["pending", "approved", "active", "returned"];
    if (currentStatus === "waitlisted") return 0;
    if (currentStatus === "cancelled" || currentStatus === "rejected") return -1;
    return order.indexOf(currentStatus);
  }
  const reached = reachedIndex(status);

  return (
    <ol className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {STATUS_TIMELINE.map((step, idx) => {
        const done = reached >= idx;
        const current = reached === idx;
        const ts =
          step.key === "pending"
            ? request.created_at
            : step.key === "approved"
              ? request.approved_at
              : step.key === "active"
                ? request.issued_at
                : request.returned_at;
        return (
          <li key={step.key} className="text-center">
            <div
              className={`mx-auto h-2 w-full border border-neo-line ${
                done ? "bg-neo-green" : "bg-neo-bg"
              }`}
              aria-hidden
            />
            <div
              className={`mt-2 text-xs font-black ${
                current ? "text-neo-pink" : done ? "text-neo-ink" : "text-neo-muted"
              }`}
            >
              {step.label}
            </div>
            <div className="text-[10px] font-medium text-neo-muted">{ts ? formatDateTime(ts) : "—"}</div>
          </li>
        );
      })}
    </ol>
  );
}
