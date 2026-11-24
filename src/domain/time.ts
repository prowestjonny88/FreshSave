export const DAY = 86_400_000;
export const HOUR = 3_600_000;
export const STORE_ZONE = "Asia/Kuala_Lumpur";
export const POLICY = { respondH: 2, holdH: 24, leadMin: 30, useByBufferDays: 1, soonDays: 3 };

export type DateType = "best-before" | "use-by";
export interface PickupWindow {
  from: string;
  to: string;
  until: string;
}

export function formatDeadline(value: number) {
  return new Date(value).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_ZONE,
  });
}

export function storeDay(now: number): string {
  // Malaysia observes UTC+08:00 year-round.
  return new Date(now + 8 * HOUR).toISOString().slice(0, 10);
}

export function shiftDay(date: string, count: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + count * DAY).toISOString().slice(0, 10);
}

export function storeTime(date: string, clock: string): number {
  return Date.parse(date + "T" + clock + ":00+08:00");
}

export function daysUntil(date: string, now: number): number {
  return (Date.parse(date) - Date.parse(storeDay(now))) / DAY;
}

export function lastCollectionDay(expiry: string, type: DateType): string {
  return type === "use-by" ? shiftDay(expiry, -POLICY.useByBufferDays) : expiry;
}

export function pastCollectionDate(expiry: string, type: DateType, now: number): boolean {
  return storeDay(now) > lastCollectionDay(expiry, type);
}

export function collectionDeadline(window: PickupWindow, acceptedAt: number): number | null {
  const cap = Math.min(acceptedAt + POLICY.holdH * HOUR, storeTime(window.until, window.to));
  if (!Number.isFinite(cap) || cap <= acceptedAt) return null;
  const finalDay = storeDay(cap);
  for (const day of [finalDay, shiftDay(finalDay, -1)]) {
    const from = Math.max(acceptedAt, storeTime(day, window.from));
    const until = Math.min(cap, storeTime(day, window.to));
    if (until > from) return until;
  }
  return null;
}
