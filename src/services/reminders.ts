/**
 * Device alerts for the 7/3/1-day reminders. The adapters already create in-app reminder
 * notifications at each threshold; this bridge shows each new one once as a browser/system
 * notification (Web Notification API – swap for FCM when Firebase credentials are available).
 */
import type { Notification as AppNotification } from "../domain/model.ts";

const KEY = "freshsave.alerted";
const ALERT_TYPES = new Set(["expiry", "expired", "stock"]);

export const alertsSupported = () => typeof window !== "undefined" && "Notification" in window;
export const alertsEnabled = () => alertsSupported() && Notification.permission === "granted";

export async function enableAlerts() {
  if (!alertsSupported()) return false;
  return (await Notification.requestPermission()) === "granted";
}

function seen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function pushReminders(notifs: readonly AppNotification[]) {
  if (!alertsEnabled()) return;
  const done = seen();
  let changed = false;
  for (const n of notifs) {
    if (!n.unread || !ALERT_TYPES.has(n.type) || done.has(n.id)) continue;
    done.add(n.id);
    changed = true;
    try {
      const alert = new Notification("FreshSave · " + n.text, { body: n.sub, tag: n.id });
      alert.onclick = () => {
        window.focus();
        if (n.href) location.hash = n.href.replace(/^#/, "");
      };
    } catch {
      /* some mobile browsers require a service worker; the in-app list still works */
    }
  }
  if (changed) localStorage.setItem(KEY, JSON.stringify([...done].slice(-500)));
}
