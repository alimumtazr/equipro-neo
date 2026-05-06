import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Undo2,
  Wrench,
} from "lucide-react";

import { api, ApiError } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDate, formatDateTime } from "../../lib/format.js";

const TABS = [
  { id: "pending", label: "Pending", filter: "pending,waitlisted" },
  { id: "active", label: "Active", filter: "approved,active" },
  { id: "overdue", label: "Overdue", filter: "active" },
  { id: "history", label: "History", filter: "returned,cancelled,rejected" },
];

function computeTabCounts(all) {
  const now = Date.now();
  return {
    pending: all.filter((r) => r.status === "pending" || r.status === "waitlisted").length,
    active: all.filter((r) => r.status === "approved" || r.status === "active").length,
    overdue: all.filter(
      (r) => r.status === "active" && new Date(r.return_date).getTime() < now
    ).length,
    history: all.filter((r) => ["returned", "cancelled", "rejected"].includes(r.status)).length,
  };
}

function emptyStateForTab(tab) {
  switch (tab) {
    case "pending":
      return {
        icon: Filter,
        title: "No pending requests",
        description: "When students submit a request it will appear here for your approval.",
      };
    case "active":
      return {
        icon: Boxes,
        title: "No active checkouts",
        description:
          "When you approve and issue equipment, active loans show here with student and project details.",
      };
    case "overdue":
      return {
        icon: AlertTriangle,
        title: "Nothing overdue",
        description: "Items that are still issued but past their return deadline will surface in this tab.",
      };
    case "history":
      return {
        icon: Boxes,
        title: "No history yet",
        description:
          "Returned, cancelled, and rejected requests are logged here for your audit trail.",
      };
    default:
      return {
        icon: Boxes,
        title: "Nothing to show",
        description: "Try another tab or adjust your search.",
      };
  }
}

export default function Dashboard() {
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [tabCounts, setTabCounts] = useState({
    pending: 0,
    active: 0,
    overdue: 0,
    history: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [forTab, all] = await Promise.all([
        api.listRequests(activeTab.filter),
        api.listRequests(),
      ]);
      setRequests(forTab);
      setTabCounts(computeTabCounts(all));
      setSelected(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab.filter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    let list = requests;
    if (tab === "overdue") {
      const now = Date.now();
      list = list.filter((r) => new Date(r.return_date).getTime() < now && r.status === "active");
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.request_number.includes(q) ||
          r.student_name.toLowerCase().includes(q) ||
          r.project_title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, tab, search]);

  const pendingSelected = useMemo(
    () =>
      filtered.filter((r) => selected.has(r._id) && r.status === "pending").map((r) => r._id),
    [filtered, selected]
  );

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const allIds = filtered.filter((r) => r.status === "pending").map((r) => r._id);
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  }

  async function handleBulkApprove() {
    if (pendingSelected.length === 0) return;
    if (
      !confirm(
        `Approve ${pendingSelected.length} request${pendingSelected.length > 1 ? "s" : ""}? Stock will be reserved immediately.`
      )
    )
      return;
    try {
      setBulkBusy(true);
      const approved = await api.bulkApprove(pendingSelected);
      setToast({
        type: "success",
        message: `Approved ${approved.length} request${approved.length > 1 ? "s" : ""}.`,
      });
      setTimeout(() => setToast(null), 2400);
      await reload();
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof ApiError ? err.message : "Bulk approval failed",
      });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setBulkBusy(false);
    }
  }

  const empty = emptyStateForTab(tab);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Manager dashboard</h1>
          <p className="text-sm font-medium text-neo-muted">
            Pending queue first — then active loans, overdue risk, and full history.
          </p>
        </div>
        <Link to="/manager/maintenance" className="neo-btn-secondary">
          <Wrench className="h-4 w-4" /> Maintenance queue
        </Link>
      </div>

      <div className="neo-card overflow-hidden">
        <div className="flex flex-col xl:flex-row xl:items-stretch border-b-2 border-neo-line bg-white">
          <div className="flex items-center gap-0 overflow-x-auto px-1">
            {TABS.map((t) => {
              const count = tabCounts[t.id] ?? 0;
              const showRed = t.id === "pending" && count > 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative px-4 py-3 text-sm font-black whitespace-nowrap border-b-4 transition-colors ${
                    tab === t.id
                      ? "border-neo-pink text-neo-ink bg-neo-cyan/20"
                      : "border-transparent text-neo-muted hover:text-neo-ink hover:bg-neo-bg"
                  }`}
                  role="tab"
                  aria-selected={tab === t.id}
                >
                  <span className="inline-flex items-center gap-2">
                    {t.label}
                    {count > 0 && (
                      <span
                        className={
                          showRed
                            ? "neo-badge-alert min-w-[1.4rem]"
                            : "inline-flex min-w-[1.25rem] items-center justify-center rounded-sm border-2 border-neo-line bg-neo-bg px-1 text-[10px] font-black"
                        }
                      >
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 xl:justify-end xl:border-l-2 xl:border-neo-line">
            <div className="relative flex-1 sm:flex-initial sm:min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neo-muted" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search #, student, project"
                className="neo-input pl-8 py-2 text-xs w-full"
                aria-label="Search requests"
              />
            </div>
            <button
              type="button"
              className="neo-btn-primary disabled:opacity-50 shrink-0"
              disabled={pendingSelected.length === 0 || bulkBusy}
              onClick={handleBulkApprove}
            >
              <CheckCircle2 className="h-4 w-4" />
              {bulkBusy ? "Approving…" : `Approve selected (${pendingSelected.length})`}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 text-sm font-bold text-neo-ink bg-neo-pink/15 border-b-2 border-neo-pink">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm font-bold text-neo-muted">Loading requests…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-neo-yellow/40 text-neo-ink text-[10px] uppercase tracking-wider font-black border-b-2 border-neo-line">
                <tr>
                  <th className="p-3 text-left w-8">
                    {tab === "pending" && (
                      <input
                        type="checkbox"
                        aria-label="Select all pending"
                        checked={
                          filtered.filter((r) => r.status === "pending").length > 0 &&
                          filtered
                            .filter((r) => r.status === "pending")
                            .every((r) => selected.has(r._id))
                        }
                        onChange={toggleAll}
                        className="h-4 w-4 border-2 border-neo-line"
                      />
                    )}
                  </th>
                  <th className="p-3 text-left">Request</th>
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Items</th>
                  <th className="p-3 text-left">Return by</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-neo-line bg-white">
                {filtered.map((request) => {
                  const overdue =
                    request.status === "active" &&
                    new Date(request.return_date).getTime() < Date.now();
                  return (
                    <tr key={request._id} className="hover:bg-neo-cyan/10">
                      <td className="p-3 align-middle">
                        {request.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={selected.has(request._id)}
                            onChange={() => toggle(request._id)}
                            aria-label={`Select request ${request.request_number}`}
                            className="h-4 w-4 border-2 border-neo-line"
                          />
                        )}
                      </td>
                      <td className="p-3 align-middle">
                        <Link
                          to={`/manager/requests/${request._id}`}
                          className="font-mono text-xs font-black text-neo-pink hover:underline"
                        >
                          #{request.request_number}
                        </Link>
                        <div className="text-[11px] font-medium text-neo-muted">
                          {formatDateTime(request.created_at)}
                        </div>
                      </td>
                      <td className="p-3 font-semibold align-middle">{request.student_name}</td>
                      <td className="p-3 align-middle">
                        <div className="font-bold truncate max-w-[220px]">{request.project_title}</div>
                        {request.supervisor && (
                          <div className="text-[11px] font-medium text-neo-muted truncate max-w-[220px]">
                            {request.supervisor}
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-middle font-medium">
                        {request.items.reduce((sum, i) => sum + i.qty, 0)}
                        <span className="text-neo-muted">
                          {" "}
                          ({request.items.length} kind{request.items.length === 1 ? "" : "s"})
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex items-center gap-1 flex-wrap">
                          {formatDate(request.return_date)}
                          {request.same_day_flag && (
                            <span className="pill-limited text-[10px]" title="Same-day return">
                              <Clock className="h-3 w-3" /> SD
                            </span>
                          )}
                          {overdue && (
                            <span className="pill-out text-[10px]" title="Overdue">
                              <AlertTriangle className="h-3 w-3" /> Late
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="p-3 text-right align-middle">
                        {request.status === "active" ? (
                          <Link
                            to={`/manager/requests/${request._id}/return`}
                            className="neo-btn-primary py-1.5 text-xs inline-flex"
                          >
                            <Undo2 className="h-3.5 w-3.5" /> Process return
                          </Link>
                        ) : (
                          <Link
                            to={`/manager/requests/${request._id}`}
                            className="text-xs font-black underline decoration-2"
                          >
                            Open
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 neo-border font-bold text-sm flex items-center gap-2 shadow-neo max-w-[90vw] ${
            toast.type === "success" ? "bg-neo-ink text-white border-white" : "bg-neo-pink text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
