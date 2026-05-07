/**
 * Same API as equipro; distinct localStorage key so both UIs can be open at once.
 */
const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

const USER_KEY = "lab_checkout_user_id_nb";

export function getStoredUserId() {
  return localStorage.getItem(USER_KEY);
}

export function setStoredUserId(userId) {
  if (userId) {
    localStorage.setItem(USER_KEY, userId);
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export { ApiError };

export async function apiFetch(path, options = {}) {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
  };
  if (auth) {
    const userId = getStoredUserId();
    if (userId) finalHeaders["X-User-Id"] = userId;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...rest, headers: finalHeaders });
  } catch (err) {
    throw new ApiError("Network error: cannot reach API", 0, null);
  }

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    const detail =
      (payload && (payload.detail || payload.message)) || response.statusText || "Request failed";
    throw new ApiError(detail, response.status, payload);
  }

  return payload;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  listUsers: () => apiFetch("/users", { auth: false }),
  me: () => apiFetch("/users/me"),
  createUser: (payload) =>
    apiFetch("/users", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    }),

  listComponents: (params = {}) => {
    const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") search.set(k, v);
    });
    const qs = search.toString();
    return apiFetch(`/components${qs ? `?${qs}` : ""}`);
  },
  createComponent: (payload) =>
    apiFetch("/components", { method: "POST", body: JSON.stringify(payload) }),
  deleteComponent: (id) => apiFetch(`/components/${id}`, { method: "DELETE" }),
  adjustComponentStock: (id, body) =>
    apiFetch(`/components/${id}/stock`, { method: "POST", body: JSON.stringify(body) }),
  getComponent: (id) => apiFetch(`/components/${id}`),
  toggleWaitlist: (id) => apiFetch(`/components/${id}/waitlist`, { method: "POST" }),

  createRequest: (payload) =>
    apiFetch("/requests", { method: "POST", body: JSON.stringify(payload) }),
  listRequests: (statusFilter) =>
    apiFetch(`/requests${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ""}`),
  getRequest: (id) => apiFetch(`/requests/${id}`),
  cancelRequest: (id) => apiFetch(`/requests/${id}/cancel`, { method: "POST" }),
  acceptResponsibility: (id) =>
    apiFetch(`/requests/${id}/accept-responsibility`, { method: "POST" }),
  approveRequest: (id) => apiFetch(`/requests/${id}/approve`, { method: "POST" }),
  bulkApprove: (ids) =>
    apiFetch("/requests/approve-bulk", {
      method: "POST",
      body: JSON.stringify({ request_ids: ids }),
    }),
  issueRequest: (id, payload) =>
    apiFetch(`/requests/${id}/issue`, { method: "POST", body: JSON.stringify(payload) }),
  returnRequest: (id, payload) =>
    apiFetch(`/requests/${id}/return`, { method: "POST", body: JSON.stringify(payload) }),

  listNotifications: () => apiFetch("/notifications"),
  markRead: (id) => apiFetch(`/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => apiFetch("/notifications/read-all", { method: "POST" }),

  listMaintenance: () => apiFetch("/maintenance"),
  restoreUnit: (componentId, unitId, note) =>
    apiFetch(`/maintenance/${componentId}/restore`, {
      method: "POST",
      body: JSON.stringify({ unit_id: unitId, note: note || null }),
    }),
};
