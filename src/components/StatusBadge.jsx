import { statusBadgeClass, statusLabel } from "../lib/format.js";

export default function StatusBadge({ status }) {
  return <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>;
}
