import * as core from "./demo-state.js";
import { CAT_KIND, CATEGORIES, LOCATIONS, RESCUE_CATS } from "../data.js";
import type {
  Batch,
  FoodInput,
  InventoryItem,
  Listing,
  ListingInput,
  Preferences,
  Profile,
  Reservation,
  Session,
} from "../domain/model.ts";
import { listingLedger } from "../domain/model.ts";
import { pastCollectionDate, storeDay } from "../domain/time.ts";
import {
  emptyView,
  forbidden,
  invalid,
  RequestError,
  success,
  type Commands,
  type Handlers,
  type Result,
  type Services,
  type ViewData,
} from "./contracts.ts";

interface DemoState extends Omit<ViewData, "session" | "stores"> {
  session: string | null;
  sessionTemp?: boolean;
  buyerLoc?: string | null;
  sellers: ViewData["stores"];
  users: (Profile & { pw: string })[];
  threads: NonNullable<ViewData["threads"]>;
}
const state = () => core.S as DemoState;
const categoryImage = (id: string) => CAT_KIND[id as keyof typeof CAT_KIND] || "rice";
const isCategory = (id: string) => id !== "all" && CATEGORIES.some((cat) => cat.id === id);
const records = {
  reservation: (id: string) => state().reservations.find((record) => record.id === id),
  listing: (id: string) => state().listings.find((record) => record.id === id),
  batch: (id: string) => state().batches.find((record) => record.id === id),
};

function requiredSession(): Session {
  const record = state().users.find((user) => user.id === state().session);
  if (!record) return forbidden();
  const { pw: _password, ...user } = record;
  return { user, store: state().sellers[user.sellerId] };
}

function actor() {
  return requiredSession().user;
}
function retailer() {
  const session = requiredSession();
  if (session.user.role !== "retailer") return forbidden();
  return session;
}

function ownBatch(id: string): Batch {
  const batch = records.batch(id);
  if (!batch || batch.owner !== retailer().user.id) return forbidden();
  return batch;
}

function ownListing(id: string): Listing {
  const listing = records.listing(id);
  if (!listing || listing.seller !== retailer().store.id) return forbidden();
  return listing;
}

function ownFood(id: string): InventoryItem {
  const item = state().inventory.find((record) => record.id === id && record.owner === actor().id);
  if (!item) return forbidden();
  return item;
}

function reservationFor(id: string, side: "buyer" | "seller" | "either" = "either"): Reservation {
  const r = records.reservation(id);
  if (!r) return forbidden();
  const user = actor();
  if (
    (side !== "seller" && r.buyerId === user.id) ||
    (side !== "buyer" && r.terms.sellerId === user.sellerId)
  )
    return r;
  return forbidden();
}

function bookingError(message: string) {
  if (!message) return;
  throw new RequestError(/expired|passed/.test(message) ? "expired" : "stale", message);
}

function validateFood(input: FoodInput, previous?: Pick<Batch, "expiry" | "expiryType">) {
  if (input.name.trim().length < 2) invalid("Enter the product name.", "name");
  if (!isCategory(input.cat)) invalid("Choose a category.", "cat");
  if (!Number.isSafeInteger(input.qty) || input.qty < 1)
    invalid("Enter a whole number of at least 1.", "qty");
  if (!input.expiry) invalid("Enter the date printed on the pack.", "expiry");
  if (!input.date || input.date > storeDay(Date.now()))
    invalid("Enter a date up to today.", "date");
  if (
    (!previous || input.expiry !== previous.expiry || input.expiryType !== previous.expiryType) &&
    !input.confirmed
  ) {
    invalid("Tick the box to confirm you have checked the date against the pack.", "ok");
  }
}

export function validateListing(input: ListingInput, batch?: Batch, existing?: Listing) {
  const model = {
    ...input,
    expiry: batch?.expiry ?? input.expiry,
    expiryType: batch?.expiryType ?? input.expiryType,
  };
  if ((!batch && model.name.trim().length < 3) || !RESCUE_CATS.includes(batch?.cat ?? model.cat))
    invalid("Enter the product and choose an eligible category.", "name");
  if (!batch && model.desc.trim().length < 10) invalid("Add a short description.", "desc");
  const eligibility = core.eligibility(model);
  if (!eligibility.ok) invalid(eligibility.errs.join(" "), "pack");
  if (
    !Number.isFinite(model.orig) ||
    !Number.isFinite(model.price) ||
    model.price <= 0 ||
    model.price >= model.orig
  )
    invalid("Rescue price must be lower than the original price.", "price");
  if (!Number.isSafeInteger(model.qty) || model.qty < 1)
    invalid("Enter a whole number of at least 1.", "qty");
  if (!model.expiry) invalid("Choose today or a future printed date.", "expiry");
  const errors = core.pickupErrors(model);
  const field = Object.keys(errors)[0] as (keyof typeof errors & string) | undefined;
  if (field) invalid(errors[field] || "Choose a valid collection window.", field);
  if (!model.instr.trim()) invalid("Add pickup instructions for buyers.", "instr");
  if (existing) {
    const ledger = listingLedger(existing, state().reservations);
    const minimum = ledger.held + ledger.handed + ledger.withdrawn;
    if (model.qty < minimum)
      throw new RequestError(
        "stock",
        `At least ${minimum} units are already accounted for.`,
        "qty",
      );
  }
}

export function createDemoServices(): Services {
  const listeners = new Set<() => void>();
  const fakeReplies = new Map<string, ReturnType<typeof setTimeout>>();
  const changed = () => listeners.forEach((listener) => listener());
  const persist = () => {
    core.save();
    changed();
  };
  const needRole = (email: string, password: string, keep: boolean) => {
    const user = state().users.find(
      (record) =>
        record.email.toLowerCase() === email.trim().toLowerCase() && record.pw === password,
    );
    if (!user) invalid("Email or password is incorrect.");
    state().session = user.id;
    state().sessionTemp = !keep;
    state().buyerLoc = null;
    try {
      sessionStorage.setItem("fs-live", "1");
    } catch {
      /* storage may be disabled */
    }
    core.syncReminders();
    return requiredSession();
  };

  function scheduleSample(id: string) {
    if (fakeReplies.has(id)) return;
    fakeReplies.set(
      id,
      setTimeout(() => {
        fakeReplies.delete(id);
        const r = records.reservation(id);
        if (r?.status === "pending") {
          core.confirmRes(r);
          changed();
        }
      }, 4000),
    );
  }

  const handlers: Handlers = {
    login: ({ email, password, keep }) => needRole(email, password, keep),
    logout: () => {
      state().session = null;
      state().sessionTemp = false;
    },
    register: (input) => {
      const { name, role, store, address, password } = input;
      const email = input.email.trim().toLowerCase();
      const loc = LOCATIONS.find((area) => area.id === input.loc);
      if (!loc || name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
        invalid("Enter a name, valid email, and at least 8 password characters.");
      if (role === "retailer" && (store.trim().length < 2 || address.trim().length < 8))
        invalid("Enter the store name and full pickup address.");
      if (state().users.some((user) => user.email === email))
        invalid("An account with this email already exists.", "email");
      const id = core.uid("u"),
        sellerId = core.uid("s");
      state().sellers[sellerId] = {
        id: sellerId,
        name: role === "retailer" ? store.trim() : name.trim(),
        role,
        area: role === "retailer" ? address.trim() : loc.short + " (not shown to others)",
        kind: role === "retailer" ? "Retailer" : "Individual",
        x: loc.x + 0.3,
        y: loc.y + 0.2,
        hue: "#4f6f55",
        hours: role === "retailer" ? "Set opening hours with each listing" : "n/a",
      };
      state().users.push({
        id,
        sellerId,
        role,
        email,
        pw: password,
        name: name.trim(),
        loc: loc.id,
        joined: Date.now(),
        onboard: true,
        prefs: { d7: true, d3: true, d1: true, expired: true, stock: true, resv: true },
      });
      return needRole(email, password, true);
    },
    resetPassword: () => undefined,
    changePassword: ({ current, password }) => {
      const user = state().users.find((record) => record.id === actor().id)!;
      if (current !== user.pw) invalid("Current password is incorrect.", "cur");
      if (password.length < 8) invalid("Use at least 8 characters.", "npw");
      user.pw = password;
    },
    profile: (input) => {
      const session = requiredSession(),
        user = state().users.find((record) => record.id === session.user.id)!;
      const area = LOCATIONS.find((item) => item.id === input.loc),
        email = input.email.trim().toLowerCase();
      if (!area || input.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email))
        invalid("Enter a name, valid email, and area.");
      if (state().users.some((record) => record.id !== user.id && record.email === email))
        invalid("This email is used by another account.", "email");
      if (user.role === "retailer") {
        if (input.store.trim().length < 2 || input.address.trim().length < 8)
          invalid("Enter the store name and full pickup address.");
        Object.assign(session.store, {
          name: input.store.trim(),
          area: input.address.trim(),
          ...(user.loc === area.id ? {} : { x: area.x + 0.3, y: area.y + 0.2 }),
        });
      } else session.store.name = input.name.trim();
      Object.assign(user, { name: input.name.trim(), email, loc: area.id });
      state().buyerLoc = null;
    },
    preferences: (values) => Object.assign(actor().prefs, values) && undefined,
    hideOnboarding: () => {
      state().users.find((user) => user.id === actor().id)!.onboard = false;
    },
    resetDemo: () => {
      fakeReplies.forEach(clearTimeout);
      fakeReplies.clear();
      core.resetAll();
    },
    area: ({ id }) => {
      if (!LOCATIONS.some((area) => area.id === id)) invalid("Choose an area.");
      state().buyerLoc = id;
    },
    recentSearch: ({ query }) => {
      if (query.trim())
        state().recent = [
          query,
          ...state().recent.filter((text) => text.toLowerCase() !== query.toLowerCase()),
        ].slice(0, 6);
    },
    clearSearch: () => {
      state().recent = [];
    },
    saveFood: (input) => {
      const user = actor(),
        isBatch = user.role === "retailer";
      const previous = input.id ? (isBatch ? ownBatch(input.id) : ownFood(input.id)) : undefined;
      validateFood(input, previous);
      if (previous && "verify" in previous) {
        if (previous.verify !== "unverified")
          invalid("Count the batch again before correcting its details.");
        const allocated =
          core.batchHanded(previous) +
          core.batchRemoved(previous) +
          core.batchOnOffer(previous, undefined);
        if (input.qty < allocated)
          throw new RequestError(
            "stock",
            `At least ${allocated} units have already been accounted for.`,
            "qty",
          );
        if (input.expiry !== previous.expiry)
          previous.history.push({
            at: Date.now(),
            field: "expiry",
            from: previous.expiry,
            to: input.expiry,
          });
      }
      const base = {
        name: input.name.trim(),
        cat: input.cat,
        kind: input.kind || previous?.kind || categoryImage(input.cat),
        qty: input.qty,
        expiry: input.expiry,
        expiryType: input.expiryType,
        photo: input.photo ?? previous?.photo,
        barcode: input.barcode || previous?.barcode,
      };
      const id = previous?.id ?? core.uid(isBatch ? "b" : "i");
      if (previous) {
        if ("initial" in previous) previous.initial = Math.max(previous.initial, input.qty);
        Object.assign(
          previous,
          base,
          isBatch ? { recorded: input.date } : { purchased: input.date },
        );
      } else if (isBatch) {
        state().batches.unshift({
          ...base,
          id,
          owner: user.id,
          addedAt: Date.now(),
          recorded: input.date,
          verify: "unverified",
          history: [],
        });
      } else
        state().inventory.unshift({
          ...base,
          id,
          owner: user.id,
          addedAt: Date.now(),
          purchased: input.date,
          status: "active",
          initial: input.qty,
          log: [],
        });
      core.logAct(
        previous ? "edit" : "plus",
        previous ? `Edited ${base.name}` : `Added ${base.name}`,
      );
      core.syncReminders();
      return id;
    },
    useFood: ({ id, qty, type }) => {
      const food = ownFood(id);
      if (food.status !== "active" || !Number.isInteger(qty) || qty <= 0 || food.qty < qty)
        invalid("Choose a quantity that is still available.");
      food.qty -= qty;
      food.log.push({ n: qty, at: Date.now(), type });
      if (!food.qty) {
        food.status = type;
        food.closedAt = Date.now();
      }
      core.logAct(
        type === "consumed" ? "check" : "trash",
        `Marked ${qty} × ${food.name} as ${type === "consumed" ? "used" : "discarded"}`,
      );
    },
    undoFood: ({ id }) => {
      const food = ownFood(id),
        last = food.log.pop();
      if (last) {
        food.qty += last.n;
        food.status = "active";
        food.closedAt = null;
        core.logAct("undo", `Restored ${food.name}`);
      }
    },
    deleteFood: ({ id }) => {
      ownFood(id);
      state().inventory = state().inventory.filter((item) => item.id !== id);
    },
    findBarcode: ({ barcode }) =>
      state().catalogue.find((item) => item.barcode === barcode) ?? null,
    saveBarcode: ({ barcode, name, cat }) => {
      if (name.trim().length < 2 || !isCategory(cat))
        invalid("Enter the product name and category.");
      const item = {
        barcode,
        name: name.trim(),
        cat,
        kind: categoryImage(cat),
        src: "user",
        by: actor().name,
        at: Date.now(),
      };
      state().catalogue = [item, ...state().catalogue.filter((entry) => entry.barcode !== barcode)];
      return item;
    },
    dismissBatch: ({ id }) => {
      const batch = ownBatch(id);
      if (batch.verify !== "unverified") invalid("Only unchecked stock can be dismissed.");
      Object.assign(batch, { verify: "dismissed", counted: 0, verifiedAt: Date.now() });
      core.logAct("ban", `Dismissed batch ${batch.name} as sold out`);
    },
    recountBatch: ({ id }) => {
      const batch = ownBatch(id);
      if (
        core.batchState(batch) !== "closed" ||
        pastCollectionDate(batch.expiry, batch.expiryType, Date.now())
      )
        invalid("This batch cannot be offered again.");
      batch.verify = "unverified";
    },
    offerBatch: (input) => {
      const { user, store } = retailer();
      const existing = input.id ? ownListing(input.id) : undefined;
      const selectedBatch = input.batchId && !existing ? ownBatch(input.batchId) : undefined;
      const batch = existing?.batchId ? ownBatch(existing.batchId) : selectedBatch;
      if (selectedBatch && selectedBatch.verify !== "unverified")
        invalid("This batch was already counted.");
      const lock = existing ? core.listingLocks(existing) : undefined;
      const controlled = { ...input };
      if (existing && lock?.product) {
        Object.assign(controlled, {
          name: existing.name,
          cat: existing.cat,
          pack: existing.pack,
          expiry: existing.expiry,
          expiryType: existing.expiryType,
        });
      }
      validateListing(controlled, selectedBatch, existing);
      if (batch) {
        const max =
          core.batchListable(batch, existing?.id) +
          (existing
            ? existing.withdrawn + listingLedger(existing, state().reservations).handed
            : 0);
        if (input.qty > max)
          throw new RequestError(
            "stock",
            `At most ${max} units can be offered from this batch.`,
            "qty",
          );
      }
      const name = selectedBatch?.name || controlled.name.trim(),
        expiry = selectedBatch?.expiry || controlled.expiry;
      if (
        state().listings.some(
          (listing) =>
            listing.id !== existing?.id &&
            listing.seller === store.id &&
            ["awaiting", "live", "reserved", "ended"].includes(core.lifecycle(listing)) &&
            listing.name.toLowerCase() === name.toLowerCase() &&
            listing.expiry === expiry,
        )
      ) {
        invalid("You already have a live listing of this product with this date.", "expiry");
      }
      if (existing && input.qty > existing.total && !input.countedExtra)
        invalid("Confirm you counted and set aside the extra units.", "extra");
      const now = Date.now(),
        cat = selectedBatch?.cat ?? controlled.cat;
      const values = {
        name,
        cat,
        kind: selectedBatch?.kind || existing?.kind || categoryImage(cat),
        expiry,
        expiryType: selectedBatch?.expiryType ?? controlled.expiryType,
        desc: controlled.desc.trim() || `${name}, counted on the shelf before listing.`,
        pack: controlled.pack,
        pickupUntil: controlled.pickupUntil,
        pickFrom: controlled.pickFrom,
        pickTo: controlled.pickTo,
        instr: controlled.instr.trim(),
        orig: Number(controlled.orig.toFixed(2)),
        price: Number(controlled.price.toFixed(2)),
        total: controlled.qty,
        photos: selectedBatch?.photo ? [selectedBatch.photo] : controlled.photos,
      };
      store.defaultInstr = values.instr;
      if (existing) {
        Object.assign(existing, values);
        if (batch && !lock?.open && !lock?.done)
          Object.assign(batch, { name, cat, expiry, expiryType: values.expiryType });
        core.logAct("edit", `Edited listing ${name}`);
        return existing.id;
      }
      const origin = selectedBatch ?? {
        id: core.uid("b"),
        owner: user.id,
        name,
        cat,
        kind: values.kind,
        qty: values.total,
        recorded: storeDay(now),
        expiry,
        expiryType: values.expiryType,
        addedAt: now,
        history: [],
        photo: values.photos[0] || null,
        source: "direct",
        verify: "listed" as const,
      };
      if (!selectedBatch) state().batches.unshift(origin);
      Object.assign(origin, { verify: "listed", counted: values.total, verifiedAt: now });
      const id = core.uid("m");
      state().listings.unshift({
        ...values,
        id,
        seller: store.id,
        batchId: origin.id,
        postedAt: now,
        withdrawn: 0,
        status: "pending",
        moved: false,
      });
      core.logAct("basket", `Published listing ${name}`);
      return id;
    },
    moveListing: ({ id }) => {
      const listing = ownListing(id);
      if (
        listing.status !== "pending" ||
        pastCollectionDate(listing.expiry, listing.expiryType, Date.now()) ||
        core.windowEnded(listing)
      )
        invalid("This listing can no longer be made visible.");
      listing.status = "active";
      listing.moved = true;
      core.logAct("basket", `Moved ${listing.name} to the Clearance Basket`);
    },
    closeListing: ({ id, cancelOpen }) => {
      const listing = ownListing(id);
      if (listing.status === "closed") return;
      bookingError(core.closeListing(listing, { cancelOpen, remove: false }));
      core.logAct("basket", `Closed listing ${listing.name}`);
    },
    reserveListing: ({ id, qty, requestId }) => {
      const user = actor();
      const replay = state().reservations.find(
        (record) => record.buyerId === user.id && record.requestId === requestId,
      );
      if (replay) {
        if (replay.listingId !== id || replay.qty !== qty)
          invalid("This request ID already belongs to a different reservation.");
        return replay.id;
      }
      const listing = records.listing(id);
      if (!listing) invalid("This listing is no longer available.");
      core.processExpiries();
      const result = core.createReservation(listing, qty);
      if (!result.r)
        throw new RequestError("stock", result.error || "This listing is no longer available.");
      Object.assign(result.r, { requestId });
      if (state().sellers[listing.seller]?.sample && !core.sellerUser(listing.seller))
        scheduleSample(result.r.id);
      return result.r.id;
    },
    acceptReservation: ({ id }) => bookingError(core.confirmRes(reservationFor(id, "seller"))),
    declineReservation: ({ id }) => core.declineRes(reservationFor(id, "seller")),
    cancelReservation: ({ id, reason }) => {
      const reservation = reservationFor(id);
      core.cancelRes(reservation, reservation.buyerId === actor().id ? "buyer" : "seller", reason);
    },
    completeHandover: ({ id, code, item, paid, simulated }) => {
      if (!item || !paid) invalid("Tick both boxes to confirm the handover.");
      bookingError(
        core.completeRes(reservationFor(id, simulated ? "buyer" : "seller"), code, {
          simulated,
          checked: true,
        }),
      );
    },
    disputeReservation: ({ id }) => core.disputeRes(reservationFor(id, "buyer")),
    readNotification: ({ id }) => {
      for (const notice of state().notifs)
        if (notice.user === actor().id && (!id || notice.id === id)) notice.unread = false;
    },
    openThread: ({ sellerId, listingId }) => {
      const key = `${actor().id}:${sellerId}`,
        threads = state().threads;
      threads[key] ||= { sellerId, listingId, msgs: [], unread: 0 };
      if (listingId) threads[key].listingId = listingId;
      threads[key].unread = 0;
    },
    sendMessage: ({ sellerId, text }) => {
      const key = `${actor().id}:${sellerId}`,
        thread = state().threads[key];
      if (!thread || !text.trim()) return;
      thread.msgs.push({ from: "me", text: text.trim(), at: Date.now() });
      setTimeout(() => {
        if (state().threads[key] !== thread) return;
        thread.msgs.push({
          from: "them",
          text: "Demo reply: collection details are on your reservation.",
          at: Date.now(),
        });
        persist();
      }, 1400);
    },
  };

  return {
    mode: "demo",
    async read() {
      if (!state().session) return emptyView();
      const session = requiredSession(),
        { user } = session;
      core.processExpiries();
      core.syncReminders();
      const data = state();
      for (const r of data.reservations) {
        if (r.status === "pending" && !r.sample && data.sellers[r.terms.sellerId]?.sample)
          scheduleSample(r.id);
      }
      return structuredClone({
        session,
        stores: data.sellers,
        inventory: data.inventory.filter((record) => record.owner === user.id),
        batches: data.batches.filter((record) => record.owner === user.id),
        reservations: data.reservations
          .filter((r) => r.buyerId === user.id || r.terms.sellerId === user.sellerId)
          .map((r) => ({
            ...r,
            pin:
              r.status === "confirmed" && (r.buyerId === user.id || r.sample) ? r.pin : undefined,
          })),
        notifs: data.notifs.filter((record) => record.user === user.id),
        activity: data.activity.filter((record) => record.user === user.id),
        listings: data.listings.map((l) => ({ ...l, units: listingLedger(l, data.reservations) })),
        catalogue: data.catalogue,
        recent: data.recent,
        area: data.buyerLoc,
        threads: Object.fromEntries(
          Object.entries(data.threads).filter(([key]) => key.startsWith(user.id + ":")),
        ),
      });
    },
    async run<K extends keyof Commands>(
      name: K,
      input: Commands[K]["input"],
    ): Promise<Result<Commands[K]["output"]>> {
      try {
        const value = await handlers[name](input);
        if (name !== "findBarcode" && name !== "resetPassword") persist();
        return success(value);
      } catch (error) {
        changed();
        return {
          ok: false,
          error:
            error instanceof RequestError
              ? error
              : new RequestError("connection", "FreshSave could not save this change."),
        };
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
