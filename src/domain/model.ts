import { pastCollectionDate, storeTime, type DateType, type PickupWindow } from "./time.ts";

export type Role = "individual" | "retailer";
export interface Preferences {
  d7: boolean;
  d3: boolean;
  d1: boolean;
  expired: boolean;
  stock: boolean;
  resv: boolean;
}
export interface Profile {
  id: string;
  sellerId: string;
  role: Role;
  name: string;
  email: string;
  loc: string;
  onboard?: boolean;
  joined: number;
  prefs: Preferences;
}
export interface Store {
  id: string;
  role: Role;
  name: string;
  area: string;
  kind: string;
  hours: string;
  x: number;
  y: number;
  hue: string;
  sample?: boolean;
  demo?: boolean;
  since?: number;
  defaultInstr?: string;
}
export interface FoodInput {
  name: string;
  cat: string;
  qty: number;
  expiry: string;
  expiryType: DateType;
  date: string;
  barcode?: string;
  kind?: string;
  photo?: string | null;
  confirmed: boolean;
}
export interface ProductRecord {
  id: string;
  owner: string;
  name: string;
  cat: string;
  kind: string;
  qty: number;
  expiry: string;
  expiryType: DateType;
  photo?: string | null;
  addedAt: number;
  barcode?: string;
}
export type StockUse = "consumed" | "discarded";
export interface InventoryItem extends ProductRecord {
  purchased: string;
  reservationId?: string;
  initial: number;
  status: "active" | StockUse;
  closedAt?: number | null;
  log: { n: number; at: number; type: StockUse }[];
}
export interface Batch extends ProductRecord {
  recorded: string;
  verify: "unverified" | "listed" | "dismissed";
  counted?: number;
  verifiedAt?: number | null;
  source?: string;
  history: { at: number; field: string; from: string; to: string }[];
}
export interface ListingTerms {
  name: string;
  cat: string;
  kind: string;
  price: number;
  orig: number;
  expiry: string;
  expiryType: DateType;
  pack: string;
  instr: string;
}
export interface Listing extends ListingTerms {
  id: string;
  seller: string;
  batchId?: string;
  total: number;
  withdrawn: number;
  removedQty?: number;
  pickFrom: string;
  pickTo: string;
  pickupUntil: string;
  desc: string;
  photos: string[];
  status: "pending" | "active" | "closed" | "removed";
  moved: boolean;
  postedAt: number;
  closedAt?: number;
  units?: UnitLedger;
}
export interface BookedTerms extends ListingTerms {
  sellerId: string;
  sellerName: string;
  sellerRole: Role;
  sellerArea: string;
  sellerHours: string;
  window: PickupWindow;
  batchId: string | null;
}
export interface ReservationEvent {
  at: number;
  type: string;
  reason?: string;
  by?: string;
  method?: string;
}
interface ReservationBase {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  qty: number;
  ref: string;
  terms: BookedTerms;
  createdAt: number;
  respondBy: number;
  sample?: boolean;
  events: ReservationEvent[];
  pin?: string;
  requestId?: string;
}
export type Reservation = ReservationBase &
  (
    | { status: "pending" }
    | { status: "confirmed"; confirmedAt: number; collectBy: number }
    | {
        status: "completed";
        confirmedAt: number;
        collectBy: number;
        collectedAt: number;
        handover: { method: "code" | "simulated" };
        disputed?: { at: number; by: string };
      }
    | {
        status: "expired" | "cancelled" | "declined";
        decidedAt?: number;
        reason?: string;
        by?: string;
      }
  );
export interface UnitLedger {
  total: number;
  held: number;
  handed: number;
  withdrawn: number;
  avail: number;
}
export interface ListingInput {
  batchId?: string;
  name: string;
  cat: string;
  desc: string;
  pack: string;
  c1: boolean;
  c2: boolean;
  c3: boolean;
  orig: number;
  price: number;
  qty: number;
  expiry: string;
  expiryType: DateType;
  pickupUntil: string;
  pickFrom: string;
  pickTo: string;
  instr: string;
  photos: string[];
}
export interface CatalogueItem {
  barcode: string;
  name: string;
  cat: string;
  kind: string;
  src: string;
  by?: string;
  at?: number;
}
export interface Notification {
  id: string;
  user: string;
  type: string;
  text: string;
  sub: string;
  unread: boolean;
  cleared?: boolean;
  at: number;
  href: string;
}
export interface Activity {
  user: string;
  icon: string;
  text: string;
  at: number;
}
export interface Session {
  user: Profile;
  store: Store;
}

export const OPEN = ["pending", "confirmed"];

export function listingLedger(listing: Listing, reservations: readonly Reservation[]): UnitLedger {
  if (listing.units) return listing.units;
  let held = 0;
  let handed = 0;
  for (const reservation of reservations) {
    if (reservation.listingId !== listing.id) continue;
    if (OPEN.includes(reservation.status)) held += reservation.qty;
    if (reservation.status === "completed") handed += reservation.qty;
  }
  const { total, withdrawn = 0 } = listing;
  return { total, held, handed, withdrawn, avail: Math.max(0, total - held - handed - withdrawn) };
}

export function listingStatus(
  listing: Listing,
  reservations: readonly Reservation[],
  now = Date.now(),
) {
  if (listing.status === "removed" || listing.status === "closed") return listing.status;
  const { avail, held } = listingLedger(listing, reservations);
  if (
    pastCollectionDate(listing.expiry, listing.expiryType, now) ||
    now > storeTime(listing.pickupUntil, listing.pickTo)
  ) {
    return avail || held ? "ended" : "completed";
  }
  if (listing.status === "pending") return "awaiting";
  return avail ? "live" : held ? "reserved" : "completed";
}

export function batchStock(
  batch: Batch,
  listings: readonly Listing[],
  reservations: readonly Reservation[],
  excluding?: string,
) {
  const listed = listings.filter((item) => item.batchId === batch.id);
  let handed = 0,
    removed = 0,
    offered = 0;
  for (const listing of listed) {
    const ledger = listingLedger(listing, reservations);
    handed += ledger.handed;
    removed += listing.removedQty || 0;
    if (listing.id !== excluding && listing.status !== "closed" && listing.status !== "removed")
      offered += ledger.held + ledger.avail;
  }
  return {
    listed,
    handed,
    removed,
    offered,
    listable: Math.max(0, batch.qty - handed - removed - offered),
  };
}
