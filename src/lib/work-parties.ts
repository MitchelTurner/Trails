/** Calendar day for a content date stored as UTC midnight (`YYYY-MM-DD` in frontmatter). */
export function eventDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today in Southeast Alaska, as `YYYY-MM-DD`. */
export function todayKey(now = new Date(), timeZone = "America/Sitka"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isOnOrAfterToday(date: Date, now = new Date()): boolean {
  return eventDayKey(date) >= todayKey(now);
}
