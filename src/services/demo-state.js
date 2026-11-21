// Standalone prototype data and schema migration. React uses the typed demo service.
import {
  SEED_SELLERS,
  SEED_USERS,
  SEED_CATALOGUE,
  SEED_LISTINGS,
  SEED_INVENTORY,
  SEED_BATCHES,
  SEED_RESERVATIONS,
} from "../data.js";
import {
  collectionDeadline,
  daysUntil,
  lastCollectionDay,
  pastCollectionDate,
  storeDay,
  storeTime,
  STORE_ZONE,
  POLICY,
} from "../domain/time.ts";
import { batchStock, listingLedger, listingStatus, OPEN } from "../domain/model.ts";
export { POLICY } from "../domain/time.ts";
export { eligibility, pickupErrors } from "../domain/listing.ts";
export const DAY = 864e5;
export const today0 = () => parseD(storeDay(Date.now()));
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => iso(today0());
export const parseD = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const fmtDate = (s) =>
  s
    ? parseD(s).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "–";
export const fmtDT = (t) =>
  new Date(t).toLocaleString("en-MY", {
    timeZone: STORE_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export const uid = (p) => p + Math.random().toString(36).slice(2, 8);
export const rcode = () =>
  "FS-" +
  Array.from(
    { length: 4 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
  ).join("");
export const daysTo = (s) => daysUntil(s, Date.now());
export const plural = (n, w, pl) => `${n} ${n === 1 ? w : pl || w + "s"}`;

export const rref = rcode;
export const rpin = () => String(Math.floor(1000 + Math.random() * 9000));

/* ---------------- State ---------------- */
const KEY = "freshsave-app-v2";
const SCHEMA = 3;
const PREFS = () => ({ d7: true, d3: true, d1: true, expired: true, stock: true, resv: true });
export const winDeadline = (w) => storeTime(w.until, w.to || "21:00");

function snapshotOf(l, sellers) {
  const s = sellers[l.seller] || {};
  return {
    name: l.name,
    cat: l.cat,
    kind: l.kind,
    price: l.price,
    orig: l.orig,
    expiry: l.expiry,
    expiryType: l.expiryType || "best-before",
    pack: l.pack,
    instr: l.instr,
    sellerId: l.seller,
    sellerName: s.name,
    sellerRole: s.role,
    sellerArea: s.area,
    sellerHours: s.hours,
    window: { until: l.pickupUntil, from: l.pickFrom, to: l.pickTo },
    batchId: l.batchId || null,
  };
}
function seedState() {
  const t = today0(),
    now = Date.now(),
    H = 36e5;
  const day = (n) => iso(addDays(t, n));
  const sellers = JSON.parse(JSON.stringify(SEED_SELLERS));
  const listings = SEED_LISTINGS.map(({ exp, pu, posted, qty, ...l }) => ({
    ...l,
    expiry: day(exp),
    pickupUntil: day(pu),
    postedAt: now - posted * H,
    total: qty,
  }));
  const reservations = SEED_RESERVATIONS.map(({ created, collected, ...r }) => {
    const l = listings.find((x) => x.id === r.listingId);
    const createdAt = now + created * H,
      dl = winDeadline({ until: l.pickupUntil, to: l.pickTo });
    const o = {
      ...r,
      sample: true,
      createdAt,
      terms: snapshotOf(l, sellers),
      respondBy: Math.min(createdAt + POLICY.respondH * H, dl),
      events: [{ at: createdAt, type: "requested" }],
    };
    if (["confirmed", "completed"].includes(r.status) || r.reason === "not-collected") {
      o.confirmedAt = createdAt + 0.5 * H;
      o.collectBy = Math.min(dl, o.confirmedAt + POLICY.holdH * H);
      o.events.push({ at: o.confirmedAt, type: "confirmed" });
    }
    if (r.status === "completed") {
      o.collectedAt = now - collected * DAY;
      o.handover = { method: "code", by: "seller", at: o.collectedAt };
      o.events.push({ at: o.collectedAt, type: "handover" });
    }
    if (r.status === "cancelled" || r.status === "declined") o.decidedAt = createdAt + H;
    if (r.status === "expired") {
      o.decidedAt = r.reason === "not-collected" ? o.collectBy : o.respondBy;
    }
    return o;
  });
  // Ledger: units put on a listing = units still available + units reserved or already handed over.
  listings.forEach((l) => {
    l.total += reservations
      .filter(
        (r) => r.listingId === l.id && ["pending", "confirmed", "completed"].includes(r.status),
      )
      .reduce((a, r) => a + r.qty, 0);
  });
  return {
    schema: SCHEMA,
    session: null,
    buyerLoc: null,
    users: SEED_USERS.map((u) => ({ ...u, prefs: PREFS(), joined: now - 200 * DAY })),
    sellers,
    catalogue: SEED_CATALOGUE.map(({ ago: a, ...c }) => ({ ...c, at: a ? now - a * DAY : null })),
    listings,
    inventory: SEED_INVENTORY.map(({ d, pur, closed, et, ...i }) => {
      const closedAt = closed ? now - closed * DAY : null;
      return {
        status: "active",
        ...i,
        expiryType: et,
        expiry: day(d),
        purchased: day(-pur),
        addedAt: now - pur * DAY,
        closedAt,
        initial: i.qty,
        log: closed ? [{ type: i.status, n: i.qty, at: closedAt }] : [],
      };
    }),
    batches: SEED_BATCHES.map(({ d, rec, et, ...b }) => ({
      ...b,
      expiryType: et,
      expiry: day(d),
      recorded: day(-rec),
      addedAt: now - rec * DAY,
      verifiedAt: b.verify !== "unverified" ? now - Math.max(1, rec - 1) * DAY : null,
      history: [],
    })),
    reservations,
    notifs: [
      {
        id: "n1",
        user: "u2",
        type: "resv",
        text: "New reservation request from Nurul Ain A. (sample)",
        sub: "2 x Milo refill pack · respond within 2 hours",
        at: now - 30 * 6e4,
        unread: true,
        href: "#/reservations?view=seller&tab=pending",
      },
      {
        id: "n2",
        user: "u2",
        type: "collect",
        text: "Handover recorded – Priya Nair (sample)",
        sub: "6 x Gardenia Raisin Loaf · sample record",
        at: now - 2 * DAY,
        unread: false,
        href: "#/reservations?view=seller&tab=completed",
      },
      {
        id: "n3",
        user: "u1",
        type: "resv",
        text: "Reservation confirmed by Telawi Fresh Mart (sample seller)",
        sub: "1 x Hup Seng Cream Crackers · ref FS-P8DN",
        at: now - 100 * 6e4,
        unread: true,
        href: "#/reservation/r6",
      },
      {
        id: "n4",
        user: "u1",
        type: "collect",
        text: "Handover recorded – Gardenia Original Classic Bread",
        sub: "2 items · sample record from Kiara Pantry Mart",
        at: now - 4 * DAY,
        unread: false,
        href: "#/reservation/r5",
      },
    ],
    activity: [
      {
        user: "u1",
        icon: "check",
        text: "Marked Massimo Sandwich Loaf 400g as used",
        at: now - 4 * DAY,
      },
      {
        user: "u1",
        icon: "trash",
        text: "Marked Mixed Salad Greens Pack 200g as discarded",
        at: now - 2 * DAY,
      },
      {
        user: "u1",
        icon: "camera",
        text: "Added Gardenia Original Classic Bread 400g by photo scan",
        at: now - 2 * DAY,
      },
      {
        user: "u2",
        icon: "layers",
        text: "Recorded batch: Massimo Sandwich Loaf 400g (18 units)",
        at: now - 2 * DAY,
      },
      {
        user: "u2",
        icon: "ban",
        text: "Dismissed batch Milo 3-in-1 Sachets – sold out",
        at: now - 19 * DAY,
      },
      {
        user: "u2",
        icon: "basket",
        text: "Listed 6 x Gardenia Wholemeal Bread – awaiting transfer",
        at: now - 18 * 6e4,
      },
    ],
    threads: {},
    recent: ["milk", "bread", "rice"],
  };
}
export let S;
export let MIGRATED = false;
function persist() {
  localStorage.setItem(KEY, JSON.stringify(S));
}
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch {
  S = null;
}
if (S && S.users && S.schema !== SCHEMA) {
  // The data model changed (reservation snapshots, unit ledger, pilot food rules). Sample data is rebuilt;
  // accounts the user registered are carried over.
  const old = S,
    seedIds = new Set(SEED_USERS.map((u) => u.id));
  S = seedState();
  old.users
    .filter((u) => !seedIds.has(u.id))
    .forEach((u) => {
      S.users.push({ ...u, prefs: { ...PREFS(), ...u.prefs } });
      if (old.sellers?.[u.sellerId]) S.sellers[u.sellerId] = old.sellers[u.sellerId];
    });
  MIGRATED = true;
  persist();
} else if (!S || !S.users) S = seedState();
// "Keep me logged in" unchecked => the session ends when the browser tab is closed.
try {
  if (S.sessionTemp && !sessionStorage.getItem("fs-live")) S.session = null;
} catch {
  /* storage unavailable */
}
export const save = persist;
export const resetAll = () => {
  localStorage.removeItem(KEY);
  try {
    sessionStorage.removeItem("fs-live");
  } catch {}
  S = seedState();
  persist();
};

/* ---------------- Session & model ---------------- */
export const me = () => S.users.find((u) => u.id === S.session) || null;
export const getL = (id) => S.listings.find((l) => l.id === id);
export const getR = (id) => S.reservations.find((r) => r.id === id);
export const getB = (id) => S.batches.find((b) => b.id === id);
export const resFor = (lid) => S.reservations.filter((r) => r.listingId === lid);
export const EXP_REASON = {
  "no-response": "Seller did not respond in time",
  "not-collected": "Not collected before the deadline",
  "food-expired": "The food date passed before collection",
};
/* ---------------- Unit ledger ----------------
   A listing owns `total` units. Everything else is DERIVED so the numbers cannot drift:
   available = total - held (open reservations) - handed (completed) - withdrawn (returned to shelf / removed).
   A batch bounds its listings: received >= handed over + units still on offer + any new count. */
const sumQ = (xs) => xs.reduce((a, r) => a + r.qty, 0);
export const heldQty = (lid) => sumQ(resFor(lid).filter((r) => OPEN.includes(r.status)));
export const handedQty = (lid) => sumQ(resFor(lid).filter((r) => r.status === "completed"));
export const ledger = (listing) => listingLedger(listing, S.reservations);
export const avail = (l) => ledger(l).avail;
export const deadlineTs = (l) => winDeadline({ until: l.pickupUntil, to: l.pickTo });
export const windowEnded = (l) => Date.now() > deadlineTs(l);
export const lifecycle = (listing) => listingStatus(listing, S.reservations);
export const isLive = (l) => lifecycle(l) === "live";
export const browsable = () => S.listings.filter(isLive);
const stock = (batch, excluding) => batchStock(batch, S.listings, S.reservations, excluding);
export const batchListings = (batch) => stock(batch).listed;
export const batchHanded = (batch) => stock(batch).handed;
export const batchRemoved = (batch) => stock(batch).removed;
export const batchOnOffer = (batch, excluding) => stock(batch, excluding).offered;
export const batchListable = (batch, excluding) => stock(batch, excluding).listable;
export function batchState(b) {
  if (b.verify === "dismissed") return "dismissed";
  if (b.verify === "unverified") return "check";
  return batchListings(b).some((l) =>
    ["awaiting", "live", "reserved", "ended"].includes(lifecycle(l)),
  )
    ? "listed"
    : "closed";
}
// Consistency checks used by the tests (and cheap enough to run in the console).
export function checkInvariants() {
  const bad = [];
  S.listings.forEach((l) => {
    const raw = l.total - heldQty(l.id) - handedQty(l.id) - (l.withdrawn || 0);
    if (raw < 0)
      bad.push(`${l.id}: allocated more units (${l.total - raw}) than listed (${l.total})`);
    if (!(l.total >= 0) || (l.withdrawn || 0) < 0) bad.push(`${l.id}: invalid total/withdrawn`);
  });
  S.batches.forEach((b) => {
    const used = batchHanded(b) + batchRemoved(b) + batchOnOffer(b);
    if (used > b.qty) bad.push(`${b.id}: ${used} units allocated from ${b.qty} received`);
  });
  S.inventory.forEach((i) => {
    if (i.qty < 0) bad.push(`${i.id}: negative quantity`);
  });
  return bad;
}

/* ---------------- Reservation snapshot & lifecycle ----------------
   pending --(seller accepts)--> confirmed --(seller enters buyer's pickup code)--> completed
   pending/confirmed -> cancelled (buyer or seller) | declined (seller) | expired (system)
   Terms are copied at booking time (r.terms) so later listing/profile edits never rewrite history. */
export const snapshot = (l) => snapshotOf(l, S.sellers);
export const sellerUser = (sellerId) => S.users.find((u) => u.sellerId === sellerId);
export const termsDeadline = (r) => winDeadline(r.terms.window);
// Food whose printed date has passed (or, for "use by", is today) can no longer be handed over.
export const termsBlocked = (t, now = Date.now()) =>
  pastCollectionDate(t.expiry, t.expiryType, now);
const prefOn = (uid) => S.users.find((u) => u.id === uid)?.prefs?.resv !== false;
const ev = (r, type, extra) => r.events.push({ at: Date.now(), type, ...extra });
function tell(uid, text, sub, href) {
  if (uid && prefOn(uid)) notify(uid, "resv", text, sub, href);
}

export function maxQtyFor(l) {
  return avail(l);
}
export function reserveError(l, n, buyer = me()) {
  if (!l || lifecycle(l) !== "live") return "This listing is no longer available.";
  if (buyer && l.seller === buyer.sellerId) return "You can't reserve your own listing.";
  if (!Number.isInteger(n) || n < 1) return "Choose a quantity of at least 1.";
  const a = avail(l);
  if (n > a)
    return a ? `Only ${plural(a, "unit")} left. Choose ${a} or fewer.` : "All units are reserved.";
  if (Date.now() > deadlineTs(l) - POLICY.leadMin * 6e4)
    return "The collection window closes too soon to reserve this.";
  return "";
}
export function createReservation(l, n, buyer = me()) {
  const error = reserveError(l, n, buyer);
  if (error) return { error };
  const now = Date.now();
  const r = {
    id: uid("r"),
    listingId: l.id,
    qty: n,
    status: "pending",
    buyerId: buyer.id,
    buyerName: buyer.name,
    ref: rref(),
    pin: rpin(),
    createdAt: now,
    respondBy: Math.min(now + POLICY.respondH * 36e5, deadlineTs(l)),
    terms: snapshot(l),
    events: [{ at: now, type: "requested" }],
  };
  S.reservations.unshift(r);
  const su = sellerUser(l.seller);
  if (su)
    tell(
      su.id,
      `New reservation request from ${buyer.name}`,
      `${n} x ${l.name} · respond by ${fmtDT(r.respondBy)}`,
      "#/reservations?view=seller&tab=pending",
    );
  logAct("receipt", `Requested ${n} x ${l.name}`);
  save();
  return { r };
}
export function confirmRes(r, now = Date.now()) {
  if (r.status !== "pending") return "This request is no longer pending.";
  if (now > r.respondBy) {
    expireRes(r, "no-response", now);
    save();
    return "The response time has passed – the request expired.";
  }
  if (termsBlocked(r.terms, now)) {
    expireRes(r, "food-expired", now);
    save();
    return "The food date has passed – the request was closed.";
  }
  const collectBy = collectionDeadline(r.terms.window, now);
  if (collectBy === null) return "There is no pickup window in the next 24 hours.";
  r.status = "confirmed";
  r.confirmedAt = now;
  r.decidedAt = now;
  r.collectBy = collectBy;
  ev(r, "confirmed");
  tell(
    r.buyerId,
    `Ready for pickup – ${r.terms.sellerName}`,
    `${r.qty} x ${r.terms.name} · collect by ${fmtDT(r.collectBy)} · ref ${r.ref}`,
    `#/reservation/${r.id}`,
  );
  save();
  return "";
}
export function declineRes(r) {
  if (r.status !== "pending") return;
  r.status = "declined";
  r.by = "seller";
  r.decidedAt = Date.now();
  ev(r, "declined");
  tell(
    r.buyerId,
    "Reservation declined",
    `${r.terms.sellerName} couldn't supply ${r.qty} x ${r.terms.name}`,
    `#/reservation/${r.id}`,
  );
  save();
}
export function cancelRes(r, by, reason = "") {
  if (!OPEN.includes(r.status)) return;
  r.status = "cancelled";
  r.by = by;
  r.reason = reason;
  r.decidedAt = Date.now();
  ev(r, "cancelled", { by });
  if (by === "buyer") {
    const su = sellerUser(r.terms.sellerId);
    su &&
      tell(
        su.id,
        `Reservation cancelled by ${r.buyerName}`,
        `${r.qty} x ${r.terms.name} · units released`,
        "#/reservations?view=seller&tab=closed",
      );
  } else
    tell(
      r.buyerId,
      "Reservation cancelled by the seller",
      `${r.qty} x ${r.terms.name}${reason ? " · " + reason : ""}`,
      `#/reservation/${r.id}`,
    );
  save();
}
export function expireRes(r, reason, now = Date.now()) {
  if (!OPEN.includes(r.status)) return;
  r.status = "expired";
  r.reason = reason;
  r.decidedAt = now;
  r.events.push({ at: now, type: "expired", reason });
  const su = sellerUser(r.terms.sellerId),
    what = `${r.qty} x ${r.terms.name}`;
  tell(
    r.buyerId,
    reason === "no-response"
      ? "Request expired – seller did not respond"
      : reason === "food-expired"
        ? "Reservation closed – food date passed"
        : "Reservation expired – not collected",
    `${what} · units released`,
    `#/reservation/${r.id}`,
  );
  if (su)
    tell(
      su.id,
      reason === "not-collected" ? `Not collected – ${what}` : `Request closed – ${r.buyerName}`,
      reason === "not-collected" ? "Return these units to the shelf" : EXP_REASON[reason],
      "#/reservations?view=seller&tab=closed",
    );
}
// Handover: the SELLER enters the pickup code the buyer was issued. Buyers cannot complete their own collection.
export function completeRes(r, code, opts = {}) {
  if (r.status !== "confirmed") return "Only a confirmed reservation can be handed over.";
  // A code-checked handover can only be recorded from the seller's own session – never by the buyer.
  if (!opts.simulated && r.terms.sellerId !== me()?.sellerId)
    return "Only the seller can record a handover.";
  if (opts.simulated && (r.buyerId !== me()?.id || sellerUser(r.terms.sellerId)))
    return "Simulation is only available to the buyer of a sample seller.";
  const now = Date.now();
  if (now > r.collectBy) {
    expireRes(r, "not-collected", now);
    save();
    return "The collection deadline has passed – the reservation expired and units were released.";
  }
  if (termsBlocked(r.terms, now)) {
    expireRes(r, "food-expired", now);
    save();
    return "The food date has passed – it cannot be handed over.";
  }
  const method = opts.simulated ? "simulated" : "code";
  if (method === "code" && String(code || "").trim() !== r.pin)
    return "That code doesn't match this reservation.";
  r.status = "completed";
  r.collectedAt = now;
  r.handover = { method, by: "seller", at: now, sellerChecked: !!opts.checked };
  ev(r, "handover", { method });
  tell(
    r.buyerId,
    `Handover recorded – ${r.terms.name}`,
    `${r.qty} x · recorded by ${r.terms.sellerName}${method === "simulated" ? " (simulated)" : ""}. Not right? Report a problem on the reservation.`,
    `#/reservation/${r.id}`,
  );
  logAct("check2", `Handover recorded: ${r.qty} x ${r.terms.name}`);
  save();
  return "";
}
export function disputeRes(r) {
  if (r.status !== "completed" || r.disputed) return;
  r.disputed = { at: Date.now(), by: "buyer" };
  ev(r, "disputed");
  const su = sellerUser(r.terms.sellerId);
  su &&
    tell(
      su.id,
      `Handover disputed by ${r.buyerName}`,
      `${r.qty} x ${r.terms.name} · excluded from activity totals`,
      `#/reservation/${r.id}`,
    );
  save();
}
// Runs whenever the app renders and once a minute while it is open (there is no server-side scheduler).
export function processExpiries(now = Date.now()) {
  let n = 0;
  S.reservations.forEach((r) => {
    if (r.status === "pending" && now > r.respondBy) {
      expireRes(r, "no-response", now);
      n++;
    } else if (OPEN.includes(r.status) && termsBlocked(r.terms, now)) {
      expireRes(r, "food-expired", now);
      n++;
    } else if (r.status === "confirmed" && now > r.collectBy) {
      expireRes(r, "not-collected", now);
      n++;
    }
  });
  if (n) save();
  return n;
}
// Closing a listing returns every unit that has not been handed over to the shelf (`withdrawn`).
export function closeListing(
  l,
  { cancelOpen = false, remove = false, reason = "Listing withdrawn by the seller" } = {},
) {
  const open = resFor(l.id).filter((r) => OPEN.includes(r.status));
  if (open.length && !cancelOpen)
    return `${plural(open.length, "open reservation")} must be resolved first.`;
  open.forEach((r) => cancelRes(r, "seller", reason));
  const g = ledger(l);
  l.withdrawn = (l.withdrawn || 0) + g.avail;
  if (termsBlocked(l)) l.removedQty = (l.removedQty || 0) + g.avail;
  l.status = remove ? "removed" : "closed";
  l.closedAt = Date.now();
  save();
  return "";
}
// Seller-edit guard: what may change while buyers hold units.
export function listingLocks(l) {
  const open = resFor(l.id).filter((r) => OPEN.includes(r.status)).length,
    done = resFor(l.id).filter((r) => r.status === "completed").length;
  return {
    open,
    done,
    product: open > 0,
    minTotal: ledger(l).held + ledger(l).handed + (l.withdrawn || 0),
  };
}

/* ---------------- Expiry classification (A4) ----------------
   Buckets are DISTINCT intervals used for colour; list filters are CUMULATIVE ("within N days" includes
   everything sooner, including today). */
export function expStatus(s) {
  const d = daysTo(s);
  if (d < 0) return { k: "expired", label: "Past date", cls: "r solid" };
  if (d <= 1) return { k: "d1", label: d === 0 ? "Expires today" : "Expires tomorrow", cls: "r" };
  if (d <= 3) return { k: "d3", label: `${d} days left`, cls: "o" };
  if (d <= 7) return { k: "d7", label: `${d} days left`, cls: "y" };
  return { k: "fresh", label: `${d} days left`, cls: "g" };
}
export const within = (s, n) => {
  const d = daysTo(s);
  return d >= 0 && d <= n;
};
export const dateWord = (t) => (t === "use-by" ? "Use by" : "Best before");
/* ---------------- Notifications, activity & reminders ---------------- */
export function notify(user, type, text, sub, href, key) {
  if (!S.users.some((u) => u.id === user)) return;
  if (key && S.notifs.some((n) => n.key === key)) return;
  S.notifs.unshift({
    id: uid("n"),
    user,
    type,
    text,
    sub,
    href,
    key,
    at: Date.now(),
    unread: true,
  });
}
export const myNotifs = () => S.notifs.filter((n) => n.user === S.session);
export const logAct = (icon, text) =>
  S.activity.unshift({ user: S.session, icon, text, at: Date.now() });

// In-app reminders only: generated when FreshSave is opened (no push, SMS or e-mail exists in this prototype).
// One reminder per threshold crossing; if the app is first opened at 4 days left the "7-day" reminder says so.
const TH = [1, 3, 7];
export function syncReminders() {
  const u = me();
  if (!u) return 0;
  const before = S.notifs.length;
  const p = u.prefs || PREFS(),
    R = u.role === "retailer";
  const items = R
    ? S.batches
        .filter((b) => b.owner === u.id && b.verify === "unverified")
        .map((b) => ({ ...b, href: `#/batch/${b.id}`, kindKey: "batch" }))
    : S.inventory
        .filter((i) => i.owner === u.id && i.status === "active")
        .map((i) => ({ ...i, href: "#/inventory", kindKey: "inv" }));
  items.forEach((it) => {
    const d = daysTo(it.expiry),
      t = d >= 0 ? TH.find((x) => d <= x) : null,
      type = it.expiryType || "best-before";
    if (d < 0 && p.expired)
      notify(
        u.id,
        "expired",
        `${it.name}: ${type === "use-by" ? "past its use-by date" : "past its best-before date"}`,
        `${dateWord(type)} ${fmtDate(it.expiry)} · ${R ? "check and remove the batch from the shelf" : type === "use-by" ? "don't eat it – mark it as discarded" : "check carefully, then mark it as used or discarded"}`,
        it.href,
        `${it.kindKey}:${it.id}:expired:${it.expiry}`,
      );
    else if (t && p["d" + t])
      notify(
        u.id,
        "expiry",
        `${it.name} ${d === 0 ? "expires today" : d === 1 ? "expires tomorrow" : `expires in ${d} days`}`,
        `${t}-day in-app reminder${d !== t ? ` (${d} days left when shown)` : ""} · ${dateWord(type)} ${fmtDate(it.expiry)}`,
        it.href,
        `${it.kindKey}:${it.id}:t${t}:${it.expiry}`,
      );
    if (R && d >= 0 && d <= 3 && p.stock)
      notify(
        u.id,
        "stock",
        `Check physical shelf stock: ${it.name}`,
        `Recorded ${it.qty} units on ${fmtDate(it.recorded)} · count what is left before listing or dismissing`,
        it.href,
        `stock:${it.id}:${it.expiry}`,
      );
  });
  const added = S.notifs.length - before;
  if (added) save();
  return added;
}

// Collection-window rules: "use by" food must be collected at least a day before the date.
export const lastPickupDay = (expiry, type) => lastCollectionDay(expiry, type);
export function defaultPickupUntil(expiry, type) {
  const max = lastPickupDay(expiry, type),
    t = iso(addDays(today0(), 2));
  return max < t ? max : t;
}
