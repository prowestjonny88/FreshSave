// FreshSave – shared state, helpers and UI primitives.
import { CATEGORIES, RESCUE_CATS, catLabel, LOCATIONS, SEED_SELLERS, photo, SEED_CATALOGUE, SEED_USERS, SEED_LISTINGS, SEED_INVENTORY, SEED_BATCHES, SEED_RESERVATIONS, ELIGIBILITY, EXP_TYPES, expTypeLabel } from './data.js'
export { CATEGORIES, RESCUE_CATS, catLabel, LOCATIONS, photo, ELIGIBILITY, EXP_TYPES, expTypeLabel }

/* ---------------- Icons (outline, 24px grid) ---------------- */
const IC = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevd: '<path d="m6 9 6 6 6-6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  minus: '<path d="M5 12h14"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/>',
  milk: '<path d="M8 3h8v3l2 3v12H6V9l2-3z"/><path d="M6 12h12"/>',
  wheat: '<path d="M12 21V8"/><path d="M12 8c-3 0-4-2-4-5 3 0 4 2 4 5zM12 8c3 0 4-2 4-5-3 0-4 2-4 5zM12 13c-3 0-4-2-4-5 3 0 4 2 4 5zM12 13c3 0 4-2 4-5-3 0-4 2-4 5zM12 18c-3 0-4-2-4-5 3 0 4 2 4 5zM12 18c3 0 4-2 4-5-3 0-4 2-4 5z"/>',
  fish: '<path d="M3 12c3-5 10-6 14-2l4-3v10l-4-3c-4 4-11 3-14-2z"/><circle cx="8" cy="11" r=".8"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/>',
  jar: '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M8 3h8v4H8zM6 12h12"/>',
  dots: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  cl: '<path d="m15 6-6 6 6 6"/>', cr: '<path d="m9 6 6 6-6 6"/>', cd: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16"/><path d="M9 20v-6h6v6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  basket: '<path d="M3 10h18l-2 10H5z"/><path d="M8 10l4-6 4 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.5"/><path d="M4 4v4.5h4.5M12 8v4l3 2"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  barcode: '<path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.8-3M4 13a8 8 0 0 0 14.8 3"/><path d="M5 3v5h5M19 21v-5h-5"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  logout: '<path d="M10 4H4v16h6M15 8l4 4-4 4M19 12H9"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check2: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
}
export const ic = (n, c = '') => `<svg class="ico ${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`

/* ---------------- Utilities ---------------- */
export const $ = (s, r = document) => r.querySelector(s)
export const $$ = (s, r = document) => [...r.querySelectorAll(s)]
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
export const rm = (n) => 'RM' + Number(n || 0).toFixed(2)
export const DAY = 864e5
export const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayIso = () => iso(today0())
export const parseD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d) }
export const fmtDate = (s) => (s ? parseD(s).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
export const fmtShort = (s) => (s ? parseD(s).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '–')
export const fmtDT = (t) => new Date(t).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
export const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 6e4)); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago` }
export const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
export const uid = (p) => p + Math.random().toString(36).slice(2, 8)
export const rcode = () => 'FS-' + Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
export const daysTo = (s) => Math.round((parseD(s) - today0()) / DAY)
export const plural = (n, w, pl) => `${n} ${n === 1 ? w : pl || w + 's'}`

export const rref = rcode
export const rpin = () => String(Math.floor(1000 + Math.random() * 9000))

/* ---------------- Policy (one place, shown to users on the About page) ---------------- */
export const POLICY = {
  respondH: 2, // seller must accept/decline within this many hours or the request lapses
  holdH: 24, // once accepted, units are held for at most this long
  leadMin: 30, // no new reservation within this many minutes of the collection cut-off
  useByBufferDays: 1, // "use by" food must be collected at least this many days before the date
  soonDays: 3,
}

/* ---------------- State ---------------- */
const KEY = 'freshsave-app-v2'
const SCHEMA = 3
const PREFS = () => ({ d7: true, d3: true, d1: true, expired: true, stock: true, resv: true })
const hm = (t) => String(t || '21:00').split(':').map(Number)
export const winDeadline = (w) => { const d = parseD(w.until); const [h, m] = hm(w.to); d.setHours(h, m, 0, 0); return +d }
export const fmtTime = (t) => { const [h, m] = hm(t); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }) }

function snapshotOf(l, sellers) {
  const s = sellers[l.seller] || {}
  return { name: l.name, cat: l.cat, kind: l.kind, price: l.price, orig: l.orig, expiry: l.expiry, expiryType: l.expiryType || 'best-before', pack: l.pack, instr: l.instr, sellerId: l.seller, sellerName: s.name, sellerRole: s.role, sellerArea: s.area, sellerHours: s.hours, window: { until: l.pickupUntil, from: l.pickFrom, to: l.pickTo }, batchId: l.batchId || null }
}
function seedState() {
  const t = today0(), now = Date.now(), H = 36e5
  const day = (n) => iso(addDays(t, n))
  const sellers = JSON.parse(JSON.stringify(SEED_SELLERS))
  const listings = SEED_LISTINGS.map(({ exp, pu, posted, qty, ...l }) => ({ ...l, expiry: day(exp), pickupUntil: day(pu), postedAt: now - posted * H, total: qty }))
  const reservations = SEED_RESERVATIONS.map(({ created, collected, ...r }) => {
    const l = listings.find((x) => x.id === r.listingId)
    const createdAt = now + created * H, dl = winDeadline({ until: l.pickupUntil, to: l.pickTo })
    const o = { ...r, sample: true, createdAt, terms: snapshotOf(l, sellers), respondBy: Math.min(createdAt + POLICY.respondH * H, dl), events: [{ at: createdAt, type: 'requested' }] }
    if (['confirmed', 'completed'].includes(r.status) || r.reason === 'not-collected') { o.confirmedAt = createdAt + 0.5 * H; o.collectBy = Math.min(dl, o.confirmedAt + POLICY.holdH * H); o.events.push({ at: o.confirmedAt, type: 'confirmed' }) }
    if (r.status === 'completed') { o.collectedAt = now - collected * DAY; o.handover = { method: 'code', by: 'seller', at: o.collectedAt }; o.events.push({ at: o.collectedAt, type: 'handover' }) }
    if (r.status === 'cancelled' || r.status === 'declined') o.decidedAt = createdAt + H
    if (r.status === 'expired') { o.decidedAt = r.reason === 'not-collected' ? o.collectBy : o.respondBy }
    return o
  })
  // Ledger: units put on a listing = units still available + units reserved or already handed over.
  listings.forEach((l) => { l.total += reservations.filter((r) => r.listingId === l.id && ['pending', 'confirmed', 'completed'].includes(r.status)).reduce((a, r) => a + r.qty, 0) })
  return {
    schema: SCHEMA,
    session: null,
    buyerLoc: null,
    users: SEED_USERS.map((u) => ({ ...u, prefs: PREFS(), joined: now - 200 * DAY })),
    sellers,
    catalogue: SEED_CATALOGUE.map(({ ago: a, ...c }) => ({ ...c, at: a ? now - a * DAY : null })),
    listings,
    inventory: SEED_INVENTORY.map(({ d, pur, closed, et, ...i }) => { const closedAt = closed ? now - closed * DAY : null; return { status: 'active', ...i, expiryType: et, expiry: day(d), purchased: day(-pur), addedAt: now - pur * DAY, closedAt, initial: i.qty, log: closed ? [{ type: i.status, n: i.qty, at: closedAt }] : [] } }),
    batches: SEED_BATCHES.map(({ d, rec, et, ...b }) => ({ ...b, expiryType: et, expiry: day(d), recorded: day(-rec), addedAt: now - rec * DAY, verifiedAt: b.verify !== 'unverified' ? now - Math.max(1, rec - 1) * DAY : null, history: [] })),
    reservations,
    notifs: [
      { id: 'n1', user: 'u2', type: 'resv', text: 'New reservation request from Nurul Ain A. (sample)', sub: '2 x Milo refill pack · respond within 2 hours', at: now - 30 * 6e4, unread: true, href: '#/reservations?view=seller&tab=pending' },
      { id: 'n2', user: 'u2', type: 'collect', text: 'Handover recorded – Priya Nair (sample)', sub: '6 x Gardenia Raisin Loaf · sample record', at: now - 2 * DAY, unread: false, href: '#/reservations?view=seller&tab=completed' },
      { id: 'n3', user: 'u1', type: 'resv', text: 'Reservation confirmed by Telawi Fresh Mart (sample seller)', sub: '1 x Hup Seng Cream Crackers · ref FS-P8DN', at: now - 100 * 6e4, unread: true, href: '#/reservation/r6' },
      { id: 'n4', user: 'u1', type: 'collect', text: 'Handover recorded – Gardenia Original Classic Bread', sub: '2 items · sample record from Kiara Pantry Mart', at: now - 4 * DAY, unread: false, href: '#/reservation/r5' },
    ],
    activity: [
      { user: 'u1', icon: 'check', text: 'Marked Massimo Sandwich Loaf 400g as used', at: now - 4 * DAY },
      { user: 'u1', icon: 'trash', text: 'Marked Mixed Salad Greens Pack 200g as discarded', at: now - 2 * DAY },
      { user: 'u1', icon: 'camera', text: 'Added Gardenia Original Classic Bread 400g by photo scan', at: now - 2 * DAY },
      { user: 'u2', icon: 'layers', text: 'Recorded batch: Massimo Sandwich Loaf 400g (18 units)', at: now - 2 * DAY },
      { user: 'u2', icon: 'ban', text: 'Dismissed batch Milo 3-in-1 Sachets – sold out', at: now - 19 * DAY },
      { user: 'u2', icon: 'basket', text: 'Listed 6 x Gardenia Wholemeal Bread – awaiting transfer', at: now - 18 * 6e4 },
    ],
    threads: {},
    recent: ['milk', 'bread', 'rice'],
  }
}
export let S
export let MIGRATED = false
function persist() { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch { toast('Browser storage is full – some changes may not persist') } }
try { S = JSON.parse(localStorage.getItem(KEY)) } catch { S = null }
if (S && S.users && S.schema !== SCHEMA) {
  // The data model changed (reservation snapshots, unit ledger, pilot food rules). Sample data is rebuilt;
  // accounts the user registered are carried over.
  const old = S, seedIds = new Set(SEED_USERS.map((u) => u.id))
  S = seedState()
  old.users.filter((u) => !seedIds.has(u.id)).forEach((u) => { S.users.push({ ...u, prefs: { ...PREFS(), ...u.prefs } }); if (old.sellers?.[u.sellerId]) S.sellers[u.sellerId] = old.sellers[u.sellerId] })
  MIGRATED = true
  persist()
} else if (!S || !S.users) S = seedState()
// "Keep me logged in" unchecked => the session ends when the browser tab is closed.
try { if (S.sessionTemp && !sessionStorage.getItem('fs-live')) S.session = null } catch { /* storage unavailable */ }
export const save = persist
export const resetAll = () => { localStorage.removeItem(KEY); try { sessionStorage.removeItem('fs-live') } catch {} S = seedState(); persist() }

/* Hooks filled in by app.js */
export const app = { render: () => {}, refreshChrome: () => {} }
export function route() {
  const h = location.hash.slice(1) || '/'
  const [p, qs] = h.split('?')
  return { parts: p.replace(/^\//, '').split('/'), q: new URLSearchParams(qs || '') }
}
export const go = (h) => { if (location.hash === h) app.render(); else location.hash = h }

/* ---------------- Session & model ---------------- */
export const me = () => S.users.find((u) => u.id === S.session) || null
export const isRetailer = () => me()?.role === 'retailer'
export const mySeller = () => S.sellers[me()?.sellerId]
export const getSeller = (id) => S.sellers[id]
export const getL = (id) => S.listings.find((l) => l.id === id)
export const getR = (id) => S.reservations.find((r) => r.id === id)
export const getB = (id) => S.batches.find((b) => b.id === id)
export const getI = (id) => S.inventory.find((i) => i.id === id)
export const buyerLoc = () => LOCATIONS.find((l) => l.id === (S.buyerLoc || me()?.loc)) || LOCATIONS[0]
// Distances are straight-line between SAMPLE neighbourhood points, scaled to look like km. Never a real radius.
export const distTo = (sellerId) => { const s = getSeller(sellerId), b = buyerLoc(); return Math.max(0.3, Math.round(Math.hypot(b.x - s.x, b.y - s.y) * 0.7 * 10) / 10) }
export const dist = (l) => distTo(l.seller)
export const km = (l) => `≈${dist(l)} km`
export const disc = (l) => (l.orig > 0 && l.price > 0 && l.price < l.orig ? Math.round((1 - l.price / l.orig) * 100) : 0)
export const daysLeft = (l) => daysTo(l.expiry)
export const imgs = (l) => (l.photos?.length ? l.photos : [photo(l.kind, 0), photo(l.kind, 1), photo(l.kind, 2)])
export const illustrative = (l) => !l.photos?.length
export const thumb = (x) => x.photos?.[0] || x.photo || photo(x.kind, 0, 200)
export const expShort = (s) => { const d = daysTo(s); return d < 0 ? 'Expired' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtShort(s) }
export const expLong = (s) => { const d = daysTo(s); return d < -1 ? `Expired ${-d} days ago` : d === -1 ? 'Expired yesterday' : d === 0 ? 'Expires today' : d === 1 ? 'Expires tomorrow' : `${d} days left` }
export const OPEN = ['pending', 'confirmed']
export const resFor = (lid) => S.reservations.filter((r) => r.listingId === lid)
export const R_LABEL = { pending: 'Awaiting seller', confirmed: 'Ready for pickup', completed: 'Handed over', cancelled: 'Cancelled', declined: 'Declined', expired: 'Expired' }
export const R_CLS = { pending: 'y', confirmed: 'g', completed: '', cancelled: 'r', declined: 'r', expired: 'o' }
export const EXP_REASON = { 'no-response': 'Seller did not respond in time', 'not-collected': 'Not collected before the deadline', 'food-expired': 'The food date passed before collection' }
export const resLabel = (r) => (r.status === 'completed' ? (r.disputed ? 'Disputed' : r.handover?.method === 'simulated' ? 'Handed over (simulated)' : 'Handed over') : r.status === 'cancelled' ? `Cancelled by ${r.by || 'user'}` : r.status === 'declined' ? 'Declined by seller' : R_LABEL[r.status])
export const resCls = (r) => (r.disputed ? 'r' : R_CLS[r.status])

/* ---------------- Unit ledger ----------------
   A listing owns `total` units. Everything else is DERIVED so the numbers cannot drift:
   available = total - held (open reservations) - handed (completed) - withdrawn (returned to shelf / removed).
   A batch bounds its listings: received >= handed over + units still on offer + any new count. */
const sumQ = (xs) => xs.reduce((a, r) => a + r.qty, 0)
export const heldQty = (lid) => sumQ(resFor(lid).filter((r) => OPEN.includes(r.status)))
export const handedQty = (lid) => sumQ(resFor(lid).filter((r) => r.status === 'completed'))
export function ledger(l) {
  if (l.id === 'preview') return { total: l.total, held: 0, handed: 0, withdrawn: 0, avail: l.total }
  const held = heldQty(l.id), handed = handedQty(l.id), withdrawn = l.withdrawn || 0
  return { total: l.total, held, handed, withdrawn, avail: Math.max(0, l.total - held - handed - withdrawn) }
}
export const avail = (l) => ledger(l).avail
export const reservedQty = heldQty
export const deadlineTs = (l) => winDeadline({ until: l.pickupUntil, to: l.pickTo })
export const windowEnded = (l) => Date.now() > deadlineTs(l)
export function lifecycle(l) {
  if (l.status === 'removed') return 'removed'
  if (l.status === 'closed') return 'closed'
  if (l.status === 'pending') return 'awaiting'
  const g = ledger(l)
  if (windowEnded(l) || daysLeft(l) < 0) return g.avail || g.held ? 'ended' : 'completed'
  if (g.avail > 0) return 'live'
  return g.held > 0 ? 'reserved' : 'completed'
}
export const LIFE = { awaiting: ['Awaiting transfer', 'y'], live: ['Live', 'g'], reserved: ['Fully reserved', 'g'], ended: ['Collection window ended', 'o'], completed: ['Completed', ''], closed: ['Closed', ''], removed: ['Removed', ''] }
export const isLive = (l) => lifecycle(l) === 'live'
export const browsable = () => S.listings.filter(isLive)
export const batchListings = (b) => S.listings.filter((l) => l.batchId === b.id && l.status !== 'removed')
export const onOffer = (l) => (['removed', 'closed'].includes(l.status) ? 0 : Math.max(0, l.total - (l.withdrawn || 0) - handedQty(l.id)))
export const batchHanded = (b) => batchListings(b).reduce((a, l) => a + handedQty(l.id), 0)
export const batchOnOffer = (b, exceptId) => batchListings(b).filter((l) => l.id !== exceptId).reduce((a, l) => a + onOffer(l), 0)
// Units of a batch that could still be put on a (new or edited) listing.
export const batchListable = (b, exceptId) => Math.max(0, b.qty - batchHanded(b) - batchOnOffer(b, exceptId))
export function batchState(b) {
  if (b.verify === 'dismissed') return 'dismissed'
  if (b.verify === 'unverified') return 'check'
  return batchListings(b).some((l) => ['awaiting', 'live', 'reserved', 'ended'].includes(lifecycle(l))) ? 'listed' : 'closed'
}
export const batchLedger = (b) => { const ls = batchListings(b), gs = ls.map(ledger); const sum = (k) => gs.reduce((a, g) => a + g[k], 0); return { received: b.qty, counted: b.counted ?? 0, handed: sum('handed'), held: sum('held'), avail: ls.filter((l) => !['closed'].includes(l.status)).reduce((a, l) => a + ledger(l).avail, 0), withdrawn: sum('withdrawn') } }
// Consistency checks used by the tests (and cheap enough to run in the console).
export function checkInvariants() {
  const bad = []
  S.listings.forEach((l) => {
    const raw = l.total - heldQty(l.id) - handedQty(l.id) - (l.withdrawn || 0)
    if (raw < 0) bad.push(`${l.id}: allocated more units (${l.total - raw}) than listed (${l.total})`)
    if (!(l.total >= 0) || (l.withdrawn || 0) < 0) bad.push(`${l.id}: invalid total/withdrawn`)
  })
  S.batches.forEach((b) => { const used = batchHanded(b) + batchOnOffer(b); if (used > b.qty) bad.push(`${b.id}: ${used} units allocated from ${b.qty} received`) })
  S.inventory.forEach((i) => { if (i.qty < 0) bad.push(`${i.id}: negative quantity`) })
  return bad
}

/* ---------------- Reservation snapshot & lifecycle ----------------
   pending --(seller accepts)--> confirmed --(seller enters buyer's pickup code)--> completed
   pending/confirmed -> cancelled (buyer or seller) | declined (seller) | expired (system)
   Terms are copied at booking time (r.terms) so later listing/profile edits never rewrite history. */
export const snapshot = (l) => snapshotOf(l, S.sellers)
export const sellerUser = (sellerId) => S.users.find((u) => u.sellerId === sellerId)
export const termsDeadline = (r) => winDeadline(r.terms.window)
// Food whose printed date has passed (or, for "use by", is today) can no longer be handed over.
export const termsBlocked = (t) => { const d = daysTo(t.expiry); return d < 0 || (t.expiryType === 'use-by' && d <= 0) }
const prefOn = (uid) => S.users.find((u) => u.id === uid)?.prefs?.resv !== false
const ev = (r, type, extra) => r.events.push({ at: Date.now(), type, ...extra })
function tell(uid, text, sub, href) { if (uid && prefOn(uid)) notify(uid, 'resv', text, sub, href) }

export function maxQtyFor(l) { return avail(l) }
export function reserveError(l, n, buyer = me()) {
  if (!l || lifecycle(l) !== 'live') return 'This listing is no longer available.'
  if (buyer && l.seller === buyer.sellerId) return "You can't reserve your own listing."
  if (!Number.isInteger(n) || n < 1) return 'Choose a quantity of at least 1.'
  const a = avail(l)
  if (n > a) return a ? `Only ${plural(a, 'unit')} left. Choose ${a} or fewer.` : 'All units are reserved.'
  if (Date.now() > deadlineTs(l) - POLICY.leadMin * 6e4) return 'The collection window closes too soon to reserve this.'
  return ''
}
export function createReservation(l, n, buyer = me()) {
  const error = reserveError(l, n, buyer)
  if (error) return { error }
  const now = Date.now()
  const r = { id: uid('r'), listingId: l.id, qty: n, status: 'pending', buyerId: buyer.id, buyerName: buyer.name, ref: rref(), pin: rpin(), createdAt: now, respondBy: Math.min(now + POLICY.respondH * 36e5, deadlineTs(l)), terms: snapshot(l), events: [{ at: now, type: 'requested' }] }
  S.reservations.unshift(r)
  const su = sellerUser(l.seller)
  if (su) tell(su.id, `New reservation request from ${buyer.name}`, `${n} x ${l.name} · respond by ${fmtDT(r.respondBy)}`, '#/reservations?view=seller&tab=pending')
  logAct('receipt', `Requested ${n} x ${l.name}`)
  save()
  return { r }
}
export function confirmRes(r, now = Date.now()) {
  if (r.status !== 'pending') return 'This request is no longer pending.'
  if (now > r.respondBy) { expireRes(r, 'no-response', now); return 'The response time has passed – the request expired.' }
  if (termsBlocked(r.terms)) { expireRes(r, 'food-expired', now); return 'The food date has passed – the request was closed.' }
  r.status = 'confirmed'; r.confirmedAt = now; r.decidedAt = now
  r.collectBy = Math.min(termsDeadline(r), now + POLICY.holdH * 36e5)
  ev(r, 'confirmed')
  tell(r.buyerId, `Ready for pickup – ${r.terms.sellerName}`, `${r.qty} x ${r.terms.name} · collect by ${fmtDT(r.collectBy)} · ref ${r.ref}`, `#/reservation/${r.id}`)
  save()
  return ''
}
export function declineRes(r) {
  if (r.status !== 'pending') return
  r.status = 'declined'; r.by = 'seller'; r.decidedAt = Date.now(); ev(r, 'declined')
  tell(r.buyerId, 'Reservation declined', `${r.terms.sellerName} couldn't supply ${r.qty} x ${r.terms.name}`, `#/reservation/${r.id}`)
  save()
}
export function cancelRes(r, by, reason = '') {
  if (!OPEN.includes(r.status)) return
  r.status = 'cancelled'; r.by = by; r.reason = reason; r.decidedAt = Date.now(); ev(r, 'cancelled', { by })
  if (by === 'buyer') { const su = sellerUser(r.terms.sellerId); su && tell(su.id, `Reservation cancelled by ${r.buyerName}`, `${r.qty} x ${r.terms.name} · units released`, '#/reservations?view=seller&tab=closed') }
  else tell(r.buyerId, 'Reservation cancelled by the seller', `${r.qty} x ${r.terms.name}${reason ? ' · ' + reason : ''}`, `#/reservation/${r.id}`)
  save()
}
export function expireRes(r, reason, now = Date.now()) {
  if (!OPEN.includes(r.status)) return
  r.status = 'expired'; r.reason = reason; r.decidedAt = now; r.events.push({ at: now, type: 'expired', reason })
  const su = sellerUser(r.terms.sellerId), what = `${r.qty} x ${r.terms.name}`
  tell(r.buyerId, reason === 'no-response' ? 'Request expired – seller did not respond' : reason === 'food-expired' ? 'Reservation closed – food date passed' : 'Reservation expired – not collected', `${what} · units released`, `#/reservation/${r.id}`)
  if (su) tell(su.id, reason === 'not-collected' ? `Not collected – ${what}` : `Request closed – ${r.buyerName}`, reason === 'not-collected' ? 'Return these units to the shelf' : EXP_REASON[reason], '#/reservations?view=seller&tab=closed')
}
// Handover: the SELLER enters the pickup code the buyer was issued. Buyers cannot complete their own collection.
export function completeRes(r, code, opts = {}) {
  if (r.status !== 'confirmed') return 'Only a confirmed reservation can be handed over.'
  // A code-checked handover can only be recorded from the seller's own session – never by the buyer.
  if (!opts.simulated && r.terms.sellerId !== me()?.sellerId) return 'Only the seller can record a handover.'
  if (opts.simulated && (r.buyerId !== me()?.id || sellerUser(r.terms.sellerId))) return 'Simulation is only available to the buyer of a sample seller.'
  const now = Date.now()
  if (now > r.collectBy) { expireRes(r, 'not-collected', now); return 'The collection deadline has passed – the reservation expired and units were released.' }
  if (termsBlocked(r.terms)) { expireRes(r, 'food-expired', now); return 'The food date has passed – it cannot be handed over.' }
  const method = opts.simulated ? 'simulated' : 'code'
  if (method === 'code' && String(code || '').trim() !== r.pin) return "That code doesn't match this reservation."
  r.status = 'completed'; r.collectedAt = now; r.handover = { method, by: 'seller', at: now, sellerChecked: !!opts.checked }
  ev(r, 'handover', { method })
  tell(r.buyerId, `Handover recorded – ${r.terms.name}`, `${r.qty} x · recorded by ${r.terms.sellerName}${method === 'simulated' ? ' (simulated)' : ''}. Not right? Report a problem on the reservation.`, `#/reservation/${r.id}`)
  logAct('check2', `Handover recorded: ${r.qty} x ${r.terms.name}`)
  save()
  return ''
}
export function disputeRes(r) {
  if (r.status !== 'completed' || r.disputed) return
  r.disputed = { at: Date.now(), by: 'buyer' }; ev(r, 'disputed')
  const su = sellerUser(r.terms.sellerId); su && tell(su.id, `Handover disputed by ${r.buyerName}`, `${r.qty} x ${r.terms.name} · excluded from activity totals`, `#/reservation/${r.id}`)
  save()
}
// Runs whenever the app renders and once a minute while it is open (there is no server-side scheduler).
export function processExpiries(now = Date.now()) {
  let n = 0
  S.reservations.forEach((r) => {
    if (r.status === 'pending' && now > r.respondBy) { expireRes(r, 'no-response', now); n++ }
    else if (OPEN.includes(r.status) && termsBlocked(r.terms)) { expireRes(r, 'food-expired', now); n++ }
    else if (r.status === 'confirmed' && now > r.collectBy) { expireRes(r, 'not-collected', now); n++ }
  })
  if (n) save()
  return n
}
// Closing a listing returns every unit that has not been handed over to the shelf (`withdrawn`).
export function closeListing(l, { cancelOpen = false, remove = false, reason = 'Listing withdrawn by the seller' } = {}) {
  const open = resFor(l.id).filter((r) => OPEN.includes(r.status))
  if (open.length && !cancelOpen) return `${plural(open.length, 'open reservation')} must be resolved first.`
  open.forEach((r) => cancelRes(r, 'seller', reason))
  const g = ledger(l)
  l.withdrawn = (l.withdrawn || 0) + g.avail
  l.status = remove ? 'removed' : 'closed'; l.closedAt = Date.now()
  save()
  return ''
}
// Seller-edit guard: what may change while buyers hold units.
export function listingLocks(l) {
  const open = resFor(l.id).filter((r) => OPEN.includes(r.status)).length, done = resFor(l.id).filter((r) => r.status === 'completed').length
  return { open, done, product: open > 0, minTotal: ledger(l).held + ledger(l).handed + (l.withdrawn || 0) }
}

/* "What needs me today?" – shared by the dashboards and the marketplace strip. */
export const isSellerOf = (r) => r.terms?.sellerId === me()?.sellerId
export function todayActions() {
  const u = me(), R = u.role === 'retailer', out = []
  const soon = (x) => daysTo(x.expiry) <= POLICY.soonDays
  if (R) {
    const pend = S.reservations.filter((r) => r.status === 'pending' && isSellerOf(r)).sort((a, b) => a.respondBy - b.respondBy)
    const ready = S.reservations.filter((r) => r.status === 'confirmed' && isSellerOf(r)).sort((a, b) => a.collectBy - b.collectBy)
    const check = S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified' && daysTo(b.expiry) >= 0 && soon(b))
    const stale = S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified' && daysTo(b.expiry) < 0)
    const awaiting = S.listings.filter((l) => l.seller === u.sellerId && l.status === 'pending')
    const ended = S.listings.filter((l) => l.seller === u.sellerId && lifecycle(l) === 'ended' && avail(l) > 0)
    // Order matters: only the first three are shown up front. Time-bound and double-sale/safety risks come before routine chores.
    if (pend.length) out.push({ k: 'pend', tone: 'hot', icon: 'receipt', title: `${plural(pend.length, 'request')} to accept or decline`, sub: `Respond by ${fmtDT(pend[0].respondBy)} or it lapses`, href: '#/reservations?view=seller&tab=pending', cta: 'Review' })
    if (ready.length) out.push({ k: 'ready', tone: 'warn', icon: 'key', title: `${plural(ready.length, 'pickup')} waiting for handover`, sub: `Next collect-by: ${fmtDT(ready[0].collectBy)}`, href: '#/reservations?view=seller&tab=confirmed', cta: 'Open' })
    if (stale.length) out.push({ k: 'stale', tone: 'hot', icon: 'alert', title: `${plural(stale.length, 'unchecked batch', 'unchecked batches')} past the printed date`, sub: 'Remove from the shelf and dismiss', href: '#/batches', cta: 'Open' })
    if (ended.length) out.push({ k: 'ended', tone: 'warn', icon: 'basket', title: `${plural(ended.length, 'listing')} ended with units still in the basket`, sub: 'Return them to the shelf and close the listing', href: '#/listings?tab=ended', cta: 'Resolve' })
    if (awaiting.length) out.push({ k: 'move', tone: 'warn', icon: 'basket', title: `${plural(awaiting.length, 'listing')} not visible yet`, sub: 'Move the units to the Clearance Basket, then confirm', href: '#/basket', cta: 'Confirm move' })
    if (check.length) out.push({ k: 'check', tone: 'warn', icon: 'eye', title: `${plural(check.length, 'batch', 'batches')} expiring within ${POLICY.soonDays} days need a shelf count`, sub: check.slice(0, 2).map((b) => b.name).join(' · '), href: '#/batches', cta: 'Check stock' })
  } else {
    const mine = S.reservations.filter((r) => r.buyerId === u.id)
    const ready = mine.filter((r) => r.status === 'confirmed').sort((a, b) => a.collectBy - b.collectBy)
    const wait = mine.filter((r) => r.status === 'pending')
    const act = S.inventory.filter((i) => i.owner === u.id && i.status === 'active')
    const soonItems = act.filter((i) => daysTo(i.expiry) >= 0 && soon(i)), exp = act.filter((i) => daysTo(i.expiry) < 0)
    if (ready.length) out.push({ k: 'ready', tone: 'hot', icon: 'key', title: ready.length === 1 ? `Collect ${ready[0].terms.name}` : `${plural(ready.length, 'reservation')} ready to collect`, sub: `Collect by ${fmtDT(ready[0].collectBy)} · ${ready[0].terms.sellerName}`, href: ready.length === 1 ? `#/reservation/${ready[0].id}` : '#/reservations?tab=confirmed', cta: 'Pickup details' })
    if (exp.length) out.push({ k: 'exp', tone: 'hot', icon: 'alert', title: `${plural(exp.length, 'item')} past the printed date`, sub: 'Check, then mark as used or discarded', href: '#/inventory?st=expired', cta: 'Review' })
    if (soonItems.length) out.push({ k: 'soon', tone: 'warn', icon: 'clock', title: `${plural(soonItems.length, 'item')} to use within ${POLICY.soonDays} days`, sub: soonItems.slice(0, 2).map((i) => i.name).join(' · '), href: '#/inventory?st=d3', cta: 'See items' })
    if (wait.length) out.push({ k: 'wait', tone: '', icon: 'clock', title: `${plural(wait.length, 'request')} waiting for a seller`, sub: 'Sellers have 2 hours to respond', href: '#/reservations?tab=pending', cta: 'View' })
  }
  return out
}

/* ---------------- Expiry classification (A4) ----------------
   Buckets are DISTINCT intervals used for colour; list filters are CUMULATIVE ("within N days" includes
   everything sooner, including today). */
export function expStatus(s) {
  const d = daysTo(s)
  if (d < 0) return { k: 'expired', label: 'Past date', cls: 'r solid' }
  if (d <= 1) return { k: 'd1', label: d === 0 ? 'Expires today' : 'Expires tomorrow', cls: 'r' }
  if (d <= 3) return { k: 'd3', label: `${d} days left`, cls: 'o' }
  if (d <= 7) return { k: 'd7', label: `${d} days left`, cls: 'y' }
  return { k: 'fresh', label: `${d} days left`, cls: 'g' }
}
export const within = (s, n) => { const d = daysTo(s); return d >= 0 && d <= n }
export const countdown = (s) => { const d = daysTo(s); return d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : plural(d, 'day') }
export const dateWord = (t) => (t === 'use-by' ? 'Use by' : 'Best before')
export const pastAdvice = (t) => (t === 'use-by' ? "Past its use-by date – don't eat it." : 'Past its best-before date – quality may have dropped; check carefully before eating.')
export const whenShort = (ts) => { const d = new Date(ts), n = today0(), diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - n) / DAY); const t = d.toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }); return `${diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-MY', { weekday: 'short', day: 'numeric', month: 'short' })} ${t}` }
export const timeLeft = (ts) => { const m = Math.round((ts - Date.now()) / 6e4); if (m <= 0) return 'now overdue'; if (m < 60) return `${m} min left`; if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m left`; return `${plural(Math.round(m / 1440), 'day')} left` }

/* ---------------- Notifications, activity & reminders ---------------- */
export function notify(user, type, text, sub, href, key) {
  if (!S.users.some((u) => u.id === user)) return
  if (key && S.notifs.some((n) => n.key === key)) return
  S.notifs.unshift({ id: uid('n'), user, type, text, sub, href, key, at: Date.now(), unread: true })
}
export const myNotifs = () => S.notifs.filter((n) => n.user === S.session)
export const logAct = (icon, text) => S.activity.unshift({ user: S.session, icon, text, at: Date.now() })

// In-app reminders only: generated when FreshSave is opened (no push, SMS or e-mail exists in this prototype).
// One reminder per threshold crossing; if the app is first opened at 4 days left the "7-day" reminder says so.
const TH = [1, 3, 7]
export function syncReminders() {
  const u = me()
  if (!u) return 0
  const before = S.notifs.length
  const p = u.prefs || PREFS(), R = u.role === 'retailer'
  const items = R
    ? S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified').map((b) => ({ ...b, href: `#/batch/${b.id}`, kindKey: 'batch' }))
    : S.inventory.filter((i) => i.owner === u.id && i.status === 'active').map((i) => ({ ...i, href: '#/inventory', kindKey: 'inv' }))
  items.forEach((it) => {
    const d = daysTo(it.expiry), t = d >= 0 ? TH.find((x) => d <= x) : null, type = it.expiryType || 'best-before'
    if (d < 0 && p.expired) notify(u.id, 'expired', `${it.name}: ${type === 'use-by' ? 'past its use-by date' : 'past its best-before date'}`, `${dateWord(type)} ${fmtDate(it.expiry)} · ${R ? 'check and remove the batch from the shelf' : type === 'use-by' ? "don't eat it – mark it as discarded" : 'check carefully, then mark it as used or discarded'}`, it.href, `${it.kindKey}:${it.id}:expired:${it.expiry}`)
    else if (t && p['d' + t]) notify(u.id, 'expiry', `${it.name} ${d === 0 ? 'expires today' : d === 1 ? 'expires tomorrow' : `expires in ${d} days`}`, `${t}-day in-app reminder${d !== t ? ` (${d} days left when shown)` : ''} · ${dateWord(type)} ${fmtDate(it.expiry)}`, it.href, `${it.kindKey}:${it.id}:t${t}:${it.expiry}`)
    if (R && d >= 0 && d <= 3 && p.stock) notify(u.id, 'stock', `Check physical shelf stock: ${it.name}`, `Recorded ${it.qty} units on ${fmtDate(it.recorded)} · count what is left before listing or dismissing`, it.href, `stock:${it.id}:${it.expiry}`)
  })
  const added = S.notifs.length - before
  if (added) save()
  return added
}

/* ---------------- UI primitives ---------------- */
export function toast(msg, icon = 'check', undo = null) {
  const t = document.createElement('div')
  t.className = 'toast' + (undo ? ' has-undo' : '')
  t.innerHTML = ic(icon, 'sm') + `<span>${esc(msg)}</span>` + (undo ? `<button type="button">${ic('undo', 'xs')}Undo</button>` : '')
  if (undo) t.querySelector('button').onclick = () => { t.remove(); undo() }
  $('#toasts').appendChild(t)
  setTimeout(() => t.remove(), undo ? 8000 : 3400)
}
let lastFocus = null
export function openModal(html, cls = '') {
  const m = $('#modal')
  lastFocus = document.activeElement
  m.className = 'modal ' + cls
  m.innerHTML = html
  m.setAttribute('aria-labelledby', 'm-title')
  m.querySelector('h3')?.setAttribute('id', 'm-title')
  $('#ov').classList.add('open')
  setTimeout(() => m.querySelector('input:not([type=checkbox]):not([readonly]),select,textarea')?.focus() || m.querySelector('.macts .btn:last-child')?.focus(), 30)
}
// After a failed submit, move keyboard focus to the first invalid field.
export const focusErr = (root = document) => setTimeout(() => (root.querySelector('.fld.err input,.fld.err select,.fld.err textarea,.chk.err input,.confirm-date .e[style*="block"]') || root.querySelector('.formerr:not([hidden])'))?.focus?.(), 40)
export const closeModal = () => { $('#ov').classList.remove('open'); if (lastFocus?.isConnected) lastFocus.focus?.(); lastFocus = null }
let pendingOk = null
export function confirmDlg({ title, body, ok = 'Confirm', cls = '', onOk, cancel = 'Cancel' }) {
  pendingOk = onOk
  openModal(`<h3>${title}</h3><div class="mbody">${body}</div><div class="macts"><button class="btn sec" data-act="mclose">${cancel}</button><button class="btn ${cls}" data-act="mok">${ok}</button></div>`)
}
export const runOk = () => { const f = pendingOk; pendingOk = null; closeModal(); f && f() }

export const sp = (label, cls = '') => `<span class="sp ${cls}">${esc(label)}</span>`
export const pageHead = (title, sub = '', actions = '', kicker = '') => `<div class="pagehead"><div>${kicker ? `<span class="kicker k-${kicker.toLowerCase()}">${kicker}</span>` : ''}<h1>${title}</h1>${sub ? `<p class="mute">${sub}</p>` : ''}</div>${actions ? `<div class="ph-acts">${actions}</div>` : ''}</div>`
/* Progressive disclosure helpers. Both use native <details>, so they work without extra JS and are keyboard accessible. */
export const moreMenu = (items, label = 'More actions') => `<details class="more"><summary class="ibtn icon" aria-label="${label}" title="${label}">${ic('dots', 'xs')}</summary><div class="more-m">${items}</div></details>`
export const disclose = (title, body, { open = false, cls = '' } = {}) => `<details class="disc ${cls}" ${open ? 'open' : ''}><summary>${title}</summary><div class="disc-b">${body}</div></details>`
export const empty = (icon, title, text, acts = '') => `<div class="empty">${ic(icon)}<h3>${title}</h3><p>${text}</p>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`
export const steps = (labels, cur) => `<ol class="steps">${labels.map((t, i) => `<li class="${i < cur ? 'done' : i === cur ? 'cur done' : ''}">${t}</li>`).join('')}</ol>`
export const catOptions = (sel, blank = 'Select a category', only) => `<option value="">${blank}</option>` + CATEGORIES.slice(1).filter((c) => !only || only.includes(c.id)).map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${c.label}</option>`).join('')
export const avatar = (s, size = 'md') => `<span class="avatar ${size}" style="background:${s.hue}1f;color:color-mix(in srgb, ${s.hue} 68%, #000);border-color:${s.hue}55">${initials(s.name)}</span>`
export const sellerTag = (s) => `<span class="tagtype ${s.sample ? 'sample' : ''}">${s.sample ? 'Sample seller (fictional)' : s.demo ? 'Demo account' : 'Unverified account'}</span>`
export const dtype = (l) => `<span class="dtype ${l.expiryType === 'use-by' ? 'use' : ''}">${dateWord(l.expiryType)}</span>`

/* Marketplace listing card */
export function card(l, opts = {}) {
  const d = daysLeft(l), s = getSeller(l.seller), a = avail(l)
  const tag = opts.static ? 'div' : 'a'
  const st = a <= 0 ? '<span class="status">Fully reserved</span>' : a <= 3 ? `<span class="status hot">Only ${a} left</span>` : ''
  return `<${tag} class="card ${a <= 0 ? 'gone' : ''}" ${opts.static ? '' : `href="#/item/${l.id}"`}>
    <div class="im"><img src="${imgs(l)[0]}" alt="${esc(l.name)}" loading="lazy">${disc(l) ? `<span class="badge">-${disc(l)}%</span>` : ''}${st}${illustrative(l) ? '<span class="illus">Illustrative photo</span>' : ''}</div>
    <div class="bd"><div class="nm">${esc(l.name)}</div>
      <div class="price"><b>${rm(l.price)}</b>${l.orig ? `<s>${rm(l.orig)}</s>` : ''}</div>
      <div class="meta">${ic('store', 'xs')}<span>${esc(s?.name || '')}</span></div>
      <div class="meta">${ic('pin', 'xs')}<span>${opts.static ? 'Your pickup point' : km(l)}</span><span class="sep">·</span><span>${a} left</span></div>
      <div class="meta ${d <= 1 ? 'hotline' : ''}">${ic('cal', 'xs')}<span>${dtype(l)} ${expShort(l.expiry)}${d >= 0 && d <= 1 ? ', ' + fmtShort(l.expiry) : ''}</span></div>
      ${l.pickupUntil && l.pickTo ? `<div class="meta collect">${ic('clock', 'xs')}<span>Collect by ${whenShort(deadlineTs(l))}</span></div>` : ''}
    </div></${tag}>`
}
export const mini = (l) => `<a class="mini" href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt="" loading="lazy"><div style="min-width:0"><div class="t">${esc(l.name)}</div><div class="p">${rm(l.price)} <s>${rm(l.orig)}</s></div><div class="m">${km(l)} · <b class="${daysLeft(l) <= 1 ? 'hot' : ''}">${dateWord(l.expiryType)} ${expShort(l.expiry)}</b></div></div></a>`

/* Image downscale for uploads (kept small for localStorage). */
export function readImages(files, max = 4) {
  return Promise.all([...files].slice(0, max).map((f) => new Promise((res) => {
    const fr = new FileReader()
    fr.onload = () => {
      const img = new Image()
      img.onload = () => {
        const c = document.createElement('canvas'), m = 640, k = Math.min(1, m / Math.max(img.width, img.height))
        c.width = img.width * k; c.height = img.height * k
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        res(c.toDataURL('image/jpeg', 0.78))
      }
      img.onerror = () => res(null)
      img.src = fr.result
    }
    fr.onerror = () => res(null)
    fr.readAsDataURL(f)
  }))).then((xs) => xs.filter(Boolean))
}

/* ---------------- Form binding helpers ----------------
   Inputs carry data-b="form.key"; app.js writes values into FORMS[form][key]
   and calls HOOKS[form](key) so views can update previews without re-rendering. */
export const FORMS = {}
export const HOOKS = {}
const errOf = (f, k) => FORMS[f]?.err?.[k]
export const fld = (f, k, label, input, hint = '') => `<div class="fld ${errOf(f, k) ? 'err' : ''}" data-fk="${k}"><label class="l" for="${f}-${k}">${label}</label>${input}${hint ? `<div class="hint" id="${f}-${k}-h">${hint}</div>` : ''}<div class="e" id="${f}-${k}-e" role="alert">${esc(errOf(f, k) || '')}</div></div>`
export const inp = (f, k, type = 'text', attrs = '') => `<input type="${type}" id="${f}-${k}" data-b="${f}.${k}" value="${esc(FORMS[f]?.[k] ?? '')}" ${errOf(f, k) ? `aria-invalid="true" aria-describedby="${f}-${k}-e"` : ''} ${attrs}>`
export const sel = (f, k, opts) => `<select id="${f}-${k}" data-b="${f}.${k}" ${errOf(f, k) ? `aria-invalid="true" aria-describedby="${f}-${k}-e"` : ''}>${opts}</select>`
export const ta = (f, k, attrs = '') => `<textarea id="${f}-${k}" data-b="${f}.${k}" ${errOf(f, k) ? `aria-invalid="true" aria-describedby="${f}-${k}-e"` : ''} ${attrs}>${esc(FORMS[f]?.[k] ?? '')}</textarea>`
export const chk = (f, k, label) => `<label class="chk ${errOf(f, k) ? 'err' : ''}"><input type="checkbox" data-b="${f}.${k}" ${FORMS[f]?.[k] ? 'checked' : ''}>${label}</label>`
export const rmInp = (f, k) => `<div class="rm"><span>RM</span>${inp(f, k, 'number', 'min="0" step="0.10" placeholder="0.00"')}</div>`
export const expTypeSel = (f) => `<div class="seg-radio" role="radiogroup" aria-label="Date type on the pack">${EXP_TYPES.map((t) => `<label class="${FORMS[f]?.expiryType === t.id ? 'on' : ''}"><input type="radio" name="${f}-et" data-b="${f}.expiryType" value="${t.id}" ${FORMS[f]?.expiryType === t.id ? 'checked' : ''}><b>${t.label}</b><small>${t.help}</small></label>`).join('')}</div>`

/* ---------------- Marketplace eligibility (pilot rules; seller declarations are NOT verified) ---------------- */
export function eligibility(f) {
  const errs = [], t = ELIGIBILITY.find((x) => x.id === f.pack)
  if (!t) errs.push('Select the food type and storage condition.')
  else if (!t.ok) errs.push(`Not eligible: ${t.why}.`)
  if (t?.ok) {
    if (!f.c1) errs.push('Declare that the packaging is sealed, intact and undamaged.')
    if (!f.c2) errs.push('Declare that the food needs no refrigeration and was stored as its label says.')
    if (!f.c3) errs.push('Declare that the printed date is legible and matches the date entered.')
  }
  if (f.expiry && daysTo(f.expiry) < 0) errs.push("Not eligible: food past its printed date can't be listed.")
  return { ok: !errs.length, errs, rejected: t?.ok === false || !!(f.expiry && daysTo(f.expiry) < 0) }
}
export function eligResult(f) {
  const r = eligibility(f)
  if (r.ok) return `<div class="elig ok">${ic('check2', 'sm')}<div><b>Seller declarations complete</b><span>These are your own statements. FreshSave does not inspect, test or certify the food, and you stay responsible for what you hand over.</span></div></div>`
  if (r.rejected) return `<div class="elig bad">${ic('ban', 'sm')}<div><b>This item can't be listed in the pilot</b>${r.errs.filter((e) => e.startsWith('Not eligible')).map((e) => `<span>${esc(e)}</span>`).join('')}<span>The pilot accepts only sealed, packaged food that is safe at room temperature. You can still track it in Track.</span></div></div>`
  return `<div class="elig">${ic('info', 'sm')}<div><b>Seller declarations needed</b>${r.errs.map((e) => `<span>${esc(e)}</span>`).join('')}</div></div>`
}
export function eligFields(f, withDate = false) {
  const o = (x) => `<option value="${x.id}" ${FORMS[f].pack === x.id ? 'selected' : ''}>${x.label}</option>`
  return `${fld(f, 'pack', 'Food type and storage', sel(f, 'pack', `<option value="">Select…</option><optgroup label="Accepted in the pilot">${ELIGIBILITY.filter((x) => x.ok).map(o).join('')}</optgroup><optgroup label="Not accepted in the pilot">${ELIGIBILITY.filter((x) => !x.ok).map(o).join('')}</optgroup>`))}
  <fieldset class="decl"><legend>Seller declarations <span class="sp">Not verified by FreshSave</span></legend>${chk(f, 'c1', 'The packaging is sealed, unopened and undamaged (no leaks, swelling or tears)')}${chk(f, 'c2', 'It needs no refrigeration and has been stored as the label says')}${withDate ? chk(f, 'c3', 'The printed date is legible and matches the date and date type I entered') : ''}</fieldset>
  <div id="${f}-elig">${eligResult(FORMS[f])}</div>`
}
// Collection-window rules: "use by" food must be collected at least a day before the date.
export const lastPickupDay = (expiry, type) => iso(addDays(parseD(expiry), type === 'use-by' ? -POLICY.useByBufferDays : 0))
export function defaultPickupUntil(expiry, type) { const max = lastPickupDay(expiry, type), t = iso(addDays(today0(), 2)); return max < t ? max : t }
export function pickupErrors(f) {
  const e = {}
  if (!f.expiry) return e
  const max = lastPickupDay(f.expiry, f.expiryType)
  if (!f.pickupUntil) e.pickupUntil = 'Choose the last day buyers can collect.'
  else if (f.pickupUntil < todayIso()) e.pickupUntil = "The last collection day can't be in the past."
  else if (f.pickupUntil > max) e.pickupUntil = f.expiryType === 'use-by' ? `Use-by food must be collected by ${fmtDate(max)} (the day before the date).` : `Collection must end on or before the date on the pack (${fmtDate(max)}).`
  if (!f.pickFrom || !f.pickTo) e.pickTo = 'Set the daily collection hours.'
  else if (f.pickTo <= f.pickFrom) e.pickTo = 'Closing time must be after opening time.'
  else if (!e.pickupUntil && winDeadline({ until: f.pickupUntil, to: f.pickTo }) < Date.now() + POLICY.leadMin * 6e4) e.pickTo = `Collection must end at least ${POLICY.leadMin} minutes from now.`
  return e
}
