export function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role}</span>;
}
