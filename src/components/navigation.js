import {
  S,
  $,
  ic,
  CATEGORIES,
  route,
  me,
  isRetailer,
  mySeller,
  buyerLoc,
  myNotifs,
  getL,
  daysTo,
  initials,
} from "../core.js";
import * as market from "../views/market.js";

export const MARKET_PAGES = ["market", "item", "seller"];
const NAV_ALIAS = {
  item: "market",
  seller: "market",
  sell: "listings",
  batch: "batches",
  reservation: "reservations",
  barcode: "scan",
};

function navHtml(cur) {
  const R = isRetailer(),
    sid = me().sellerId;
  const resBadge = S.reservations.filter(
    (r) => r.status === "pending" && getL(r.listingId)?.seller === sid,
  ).length;
  const item = (id, href, icon, label, badge) =>
    `<a class="nav-i ${cur === id ? "on" : ""}" href="${href}" ${id === "market" ? 'data-act="home"' : ""}>${ic(icon, "sm")}<span>${label}</span>${badge ? `<i>${badge}</i>` : ""}</a>`;
  return `${item("market", "#/market", "store", "Marketplace")}${item("listings", "#/listings", "list", "My Listings")}${R ? item("basket", "#/basket", "basket", "Clearance Basket", S.listings.filter((l) => l.seller === sid && l.status === "pending").length) : ""}${item("reservations", "#/reservations", "receipt", R ? "Reservations" : "My Reservations", resBadge)}
  <span class="nsep"></span>${item("scan", "#/scan", "camera", "Scan Food")}${R ? item("batches", "#/batches", "layers", "Batch Inventory", S.batches.filter((b) => b.owner === me().id && b.verify === "unverified" && daysTo(b.expiry) <= 3).length) : item("inventory", "#/inventory", "box", "My Inventory")}
  <span class="nsep"></span>${item("dashboard", "#/dashboard", "home", "Dashboard")}${item("impact", "#/impact", "chart", "Sustainability Impact")}`;
}

export function refreshChrome() {
  const u = me();
  if (!u) return;

  const p = route().parts[0],
    cur = NAV_ALIAS[p] || p;
  $("#nav").innerHTML = navHtml(cur);
  const s = mySeller();
  $("#pname").textContent = (isRetailer() ? s.name : u.name).split(/\s+/).slice(0, 2).join(" ");
  $("#topav").textContent = initials(isRetailer() ? s.name : u.name);
  $("#locName").textContent = buyerLoc().short;
  $("#hdr-dist").value = String(market.F.dist);
  const n = myNotifs().filter((x) => x.unread).length,
    nb = $("#nBadge");
  nb.hidden = !n;
  nb.textContent = n;
  const m = Object.entries(S.threads)
    .filter(([k]) => k.startsWith(u.id + ":"))
    .reduce((a, [, t]) => a + (t.unread || 0), 0);
  const mb = $("#mBadge");
  mb.hidden = !m;
  mb.textContent = m;
  const on =
    market.F.cats.length === 1 ? market.F.cats[0] : market.F.cats.length === 0 ? "all" : "";
  $("#cats").innerHTML = CATEGORIES.map(
    (c) =>
      `<button class="cat ${on === c.id ? "on" : ""}" data-act="cat" data-id="${c.id}">${ic(c.icon)}${c.label}</button>`,
  ).join("");
  $("#catbar").hidden = !MARKET_PAGES.includes(p);
}
