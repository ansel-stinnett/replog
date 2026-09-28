export function formatDate(iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  // Parse as a local date so '2026-09-28' doesn't render as the 27th west of UTC.
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const formatWeight = (w) => (Number.isInteger(w) ? String(w) : w.toFixed(1));
