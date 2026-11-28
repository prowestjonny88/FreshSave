/**
 * Device alerts for the 7/3/1-day reminders. The adapters already create in-app reminder
 * notifications at each threshold; this bridge shows each new one once as a browser/system
 * notification (Web Notification API – swap for FCM when Firebase credentials are available).
 */
import type { Notification as AppNotification } from "../domain/model.ts";

const KEY = "freshsave.alerted";
const ALERT_TYPES = new Set(["expiry", "expired", "stock"]);
const unavailableDelivery = new Set<string>();
export const deviceAlertChange = "freshsave:device-alert-change";

export const alertsSupported = () => typeof window !== "undefined" && "Notification" in window;
const deliveryKey = (account: string) => `${KEY}.delivery-unavailable.${account}`;
const storedFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};
export const alertsEnabled = (account: string) =>
  alertsSupported() &&
  Notification.permission === "granted" &&
  storedFlag(`${KEY}.enabled.${account}`);
export function deviceAlertStatus(
  account: string,
): "unsupported" | "blocked" | "off" | "on" | "delivery-unavailable" {
  if (!alertsSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (!alertsEnabled(account)) return "off";
  return unavailableDelivery.has(account) || storedFlag(deliveryKey(account))
    ? "delivery-unavailable"
    : "on";
}

export async function setDeviceAlerts(account: string, enabled: boolean) {
  try {
    if (enabled && (!alertsSupported() || (await Notification.requestPermission()) !== "granted"))
      return false;
    localStorage.setItem(`${KEY}.enabled.${account}`, String(enabled));
    localStorage.removeItem(deliveryKey(account));
    unavailableDelivery.delete(account);
    window.dispatchEvent(new Event(deviceAlertChange));
    return true;
  } catch {
    return false;
  }
}

function seen(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch {
    return new Set();
  }
}

export function showDeviceReminders(account: string, notifs: readonly AppNotification[]) {
  if (deviceAlertStatus(account) !== "on") return;
  const key = `${KEY}.seen.${account}`;
  const done = seen(key);
  let changed = false;
  for (const n of notifs) {
    if (!n.unread || !ALERT_TYPES.has(n.type) || done.has(n.id)) continue;
    try {
      const alert = new Notification("FreshSave · " + n.text, { body: n.sub, tag: n.id });
      done.add(n.id);
      changed = true;
      alert.onclick = () => {
        window.focus();
        if (n.href) location.hash = n.href.replace(/^#/, "");
      };
    } catch {
      try {
        localStorage.setItem(deliveryKey(account), "true");
      } catch {
        unavailableDelivery.add(account);
      }
      window.dispatchEvent(new Event(deviceAlertChange));
      break;
    }
  }
  if (changed) {
    try {
      localStorage.setItem(key, JSON.stringify([...done]));
    } catch {
      /* in-app notifications remain available */
    }
  }
}
