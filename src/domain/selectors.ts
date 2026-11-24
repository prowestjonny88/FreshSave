import { daysUntil, formatDeadline } from "./time.ts";
import { listingStatus } from "./model.ts";
import type { ViewData } from "../services/contracts.ts";
import { LOCATIONS } from "../data.js";

export { listingStatus };

export function areaOf(data: ViewData) {
  return (
    LOCATIONS.find((area) => area.id === (data.area || data.session?.user.loc)) || LOCATIONS[0]
  );
}

export function distanceTo(data: ViewData, seller: string) {
  const area = areaOf(data),
    store = data.stores[seller];
  return store
    ? Math.max(0.3, Math.round(Math.hypot(area.x - store.x, area.y - store.y) * 7) / 10)
    : Infinity;
}

export function browse(data: ViewData, search: string, distance: number | "all") {
  return data.listings
    .filter((item) => {
      if (
        listingStatus(item, data.reservations) !== "live" ||
        (distance !== "all" && distanceTo(data, item.seller) > distance)
      )
        return false;
      const text = [item.name, item.cat, data.stores[item.seller]?.name, item.desc]
        .join(" ")
        .toLowerCase();
      return search
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .every((word) => text.includes(word));
    })
    .sort((a, b) => distanceTo(data, a.seller) - distanceTo(data, b.seller));
}

export function needsToday(data: ViewData) {
  const user = data.session?.user;
  if (!user) return [];
  const seller = user.role === "retailer";
  const relevant = data.reservations.filter((r) =>
    seller ? r.terms.sellerId === user.sellerId : r.buyerId === user.id,
  );
  const pending = relevant
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.respondBy - b.respondBy);
  const ready = relevant
    .filter((r) => r.status === "confirmed")
    .sort((a, b) => a.collectBy - b.collectBy);
  const actions: { title: string; detail: string; to: string; tone: string }[] = [];
  const add = (title: string, detail: string, to: string, tone = "warn") =>
    actions.push({ title, detail, to, tone });
  if (seller && pending.length)
    add(
      `${pending.length} request${pending.length === 1 ? "" : "s"} to accept or decline`,
      "Respond by " + formatDeadline(pending[0].respondBy),
      "/reservations?view=seller&tab=pending",
      "hot",
    );
  if (ready.length)
    add(
      seller ? `${ready.length} pickup waiting for handover` : "Collect " + ready[0].terms.name,
      "Pickup deadline: " + formatDeadline(ready[0].collectBy),
      seller ? "/reservations?view=seller&tab=confirmed" : "/reservation/" + ready[0].id,
      "hot",
    );
  if (seller) {
    const listings = data.listings.filter((l) => l.seller === user.sellerId);
    const ended = listings.filter((l) => listingStatus(l, data.reservations) === "ended");
    const waiting = listings.filter((l) => listingStatus(l, data.reservations) === "awaiting");
    const counts = data.batches.filter(
      (b) => b.verify === "unverified" && daysUntil(b.expiry, Date.now()) <= 3,
    );
    if (ended.length)
      add(
        `${ended.length} listing ended with units still in the basket`,
        "Review remaining units and close the listing",
        "/listings?tab=ended",
      );
    if (waiting.length)
      add(
        `${waiting.length} listing not visible yet`,
        "Confirm the move to the Clearance Basket",
        "/basket",
      );
    if (counts.length)
      add(`${counts.length} batches need a shelf count`, counts[0].name, "/batches");
  } else {
    const past = data.inventory.filter(
      (i) => i.status === "active" && daysUntil(i.expiry, Date.now()) < 0,
    );
    const soon = data.inventory.filter(
      (i) =>
        i.status === "active" &&
        daysUntil(i.expiry, Date.now()) >= 0 &&
        daysUntil(i.expiry, Date.now()) <= 3,
    );
    if (past.length)
      add(
        `${past.length} item${past.length === 1 ? "" : "s"} past the printed date`,
        "Review My food",
        "/inventory?st=expired",
        "hot",
      );
    if (soon.length)
      add(`${soon.length} items to use within 3 days`, soon[0].name, "/inventory?st=d3");
    if (pending.length)
      add(
        `${pending.length} request waiting for a seller`,
        "Sellers have 2 hours to respond",
        "/reservations?tab=pending",
      );
  }
  return actions;
}
