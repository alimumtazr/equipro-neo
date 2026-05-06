import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Inbox } from "lucide-react";

import { api } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatDateTime } from "../../lib/format.js";

export default function MyRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listRequests()
      .then((data) => {
        if (!cancelled) setRequests(data);
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
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-bold">My requests</h1>
        <p className="text-sm font-medium text-neo-muted">
          Track approval, pickup, and return for every request you file.
        </p>
      </div>

      {error && (
        <div className="neo-card p-4 text-sm font-semibold border-neo-pink bg-neo-pink/10">{error}</div>
      )}

      {loading ? (
        <div className="neo-card divide-y-2 divide-neo-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse bg-neo-bg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="When you submit a request from the catalog, it will appear in this list with live status updates."
          action={
            <Link to="/catalog" className="neo-btn-primary">
              <ClipboardList className="h-4 w-4" />
              Open catalog
            </Link>
          }
        />
      ) : (
        <ul className="neo-card divide-y-2 divide-neo-line overflow-hidden">
          {requests.map((request) => (
            <li key={request._id}>
              <Link
                to={`/requests/${request._id}`}
                className="flex items-center gap-4 p-4 hover:bg-neo-cyan/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-neo-muted">
                      #{request.request_number}
                    </span>
                    <StatusBadge status={request.status} />
                    {request.same_day_flag && (
                      <span className="pill-limited text-[10px]">Same-day</span>
                    )}
                  </div>
                  <h3 className="mt-1 font-bold truncate">{request.project_title}</h3>
                  <div className="text-xs font-medium text-neo-muted mt-0.5">
                    {request.items.length} item{request.items.length === 1 ? "" : "s"} · Return by{" "}
                    {formatDate(request.return_date)}
                  </div>
                </div>
                <div className="text-right text-xs font-medium text-neo-muted shrink-0">
                  Created
                  <div className="text-sm font-bold text-neo-ink">{formatDateTime(request.created_at)}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
