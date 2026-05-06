export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeFromNow(value) {
  if (!value) return "";
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return "";
  const diffMs = target - Date.now();
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  let unit, value2;
  if (abs < hour) {
    unit = "minute";
    value2 = Math.round(diffMs / minute);
  } else if (abs < day) {
    unit = "hour";
    value2 = Math.round(diffMs / hour);
  } else {
    unit = "day";
    value2 = Math.round(diffMs / day);
  }
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return rtf.format(value2, unit);
}

export function availabilityLabel(component) {
  if (!component) return { label: "—", className: "pill-neutral" };
  if (component.available_qty === 0) return { label: "Out of stock", className: "pill-out" };
  const ratio = component.available_qty / component.total_qty;
  if (ratio <= 0.5) {
    return {
      label: `Limited · ${component.available_qty}/${component.total_qty}`,
      className: "pill-limited",
    };
  }
  return {
    label: `Available · ${component.available_qty}/${component.total_qty}`,
    className: "pill-available",
  };
}

export function statusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "pill-limited";
    case "waitlisted":
      return "pill-neutral";
    case "approved":
      return "pill-available";
    case "active":
      return "pill-available";
    case "returned":
      return "pill-neutral";
    case "cancelled":
    case "rejected":
      return "pill-out";
    default:
      return "pill-neutral";
  }
}

export function statusLabel(status) {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}
