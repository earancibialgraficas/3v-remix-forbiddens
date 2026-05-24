const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type EventHighlightLike = {
  created_at?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  highlight_until?: string | null;
};

export function getEventStartTime(event: EventHighlightLike): number | null {
  if (!event.event_date) return null;

  const dateMatch = String(event.event_date).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!dateMatch) {
    const fallback = new Date(event.event_date).getTime();
    return Number.isFinite(fallback) ? fallback : null;
  }

  const [, y, m, d] = dateMatch;
  const timeMatch = String(event.event_time || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;
  const seconds = timeMatch?.[3] ? Number(timeMatch[3]) : 0;

  return new Date(Number(y), Number(m) - 1, Number(d), hours, minutes, seconds).getTime();
}

export function isEventPastHighlightWindow(event: EventHighlightLike, now = Date.now()) {
  const eventStart = getEventStartTime(event);
  return eventStart !== null && now > eventStart + ONE_DAY_MS;
}

export function isEventHighlighted(event: EventHighlightLike, now = Date.now(), recentSince?: number) {
  if (isEventPastHighlightWindow(event, now)) return false;

  const highlightUntil = event.highlight_until ? new Date(event.highlight_until).getTime() : 0;
  if (Number.isFinite(highlightUntil) && highlightUntil > now) return true;

  if (recentSince && event.created_at) {
    const createdAt = new Date(event.created_at).getTime();
    return Number.isFinite(createdAt) && createdAt > recentSince;
  }

  return false;
}
