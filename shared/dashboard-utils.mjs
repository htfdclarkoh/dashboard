export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

export function getPostStatus(post, now = new Date()) {
  const starts = new Date(post.postDate);
  const ends = post.removeDate
    ? new Date(String(post.removeDate).length === 10 ? `${post.removeDate}T23:59:59.999` : post.removeDate)
    : null;
  if (!Number.isNaN(starts.valueOf()) && starts > now) return 'upcoming';
  if (ends && !Number.isNaN(ends.valueOf()) && ends < now) return 'expired';
  return 'active';
}

export function isContentExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return false;
  const expiry = new Date(String(expiresAt).length === 10 ? `${expiresAt}T23:59:59` : expiresAt);
  return !Number.isNaN(expiry.valueOf()) && expiry < now;
}

export function buildEventKey(data, fallback = 'event') {
  return String(data?.eventId || data?.incidentId || data?.timestamp || fallback);
}
