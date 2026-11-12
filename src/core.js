// FreshSave – shared state, helpers and UI primitives.
import { CATEGORIES, catLabel, LOCATIONS, SEED_SELLERS, photo, SEED_CATALOGUE, SEED_USERS, SEED_LISTINGS, SEED_INVENTORY, SEED_BATCHES, SEED_RESERVATIONS } from './data.js'
export { CATEGORIES, catLabel, LOCATIONS, photo }

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
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`

/* ---------------- State ---------------- */
const KEY = 'freshsave-app-v2'
const PREFS = () => ({ d7: true, d3: true, d1: true, expired: true, stock: true, resv: true })
function seedState() {
  const t = today0(), now = Date.now()
  const day = (n) => iso(addDays(t, n))
  return {
    session: null,
    buyerLoc: null,
    users: SEED_USERS.map((u) => ({ ...u, prefs: PREFS(), joined: now - 200 * DAY })),
    sellers: JSON.parse(JSON.stringify(SEED_SELLERS)),
    catalogue: SEED_CATALOGUE.map(({ ago: a, ...c }) => ({ ...c, at: a ? now - a * DAY : null })),
    listings: SEED_LISTINGS.map(({ exp, posted, ...l }) => ({ ...l, expiry: day(exp), postedAt: now - posted * 36e5 })),
    inventory: SEED_INVENTORY.map(({ d, pur, closed, ...i }) => ({ status: 'active', ...i, expiry: day(d), purchased: day(-pur), addedAt: now - pur * DAY, closedAt: closed ? now - closed * DAY : null })),
    batches: SEED_BATCHES.map(({ d, rec, ...b }) => ({ ...b, expiry: day(d), recorded: day(-rec), addedAt: now - rec * DAY, verifiedAt: b.verify !== 'unverified' ? now - Math.max(1, rec - 1) * DAY : null })),
    reservations: SEED_RESERVATIONS.map(({ created, collected, ...r }) => ({ ...r, createdAt: now + created * 36e5, collectedAt: collected ? now - collected * DAY : null })),
    notifs: [
      { id: 'n1', user: 'u2', type: 'resv', text: 'New reservation request from Nurul Ain A.', sub: '2 x Farm Fresh Eggs Grade A (10 pcs) · review and accept or reject', at: now - 30 * 6e4, unread: true, href: '#/reservations?tab=pending' },
      { id: 'n2', user: 'u2', type: 'collect', text: 'Collection completed – Priya Nair', sub: '6 x Marigold Natural Yoghurt · recorded as a completed rescue', at: now - 2 * DAY, unread: false, href: '#/reservations?tab=completed' },
      { id: 'n3', user: 'u1', type: 'resv', text: 'Reservation confirmed by Jaya Grocer Bangsar Village', sub: '1 x Cameron Highlands Strawberries · code FS-P8DN', at: now - 100 * 6e4, unread: true, href: '#/reservation/r6' },
      { id: 'n4', user: 'u1', type: 'collect', text: 'Rescue completed – Gardenia Original Classic Bread', sub: '2 items collected from Village Grocer Mont Kiara', at: now - 4 * DAY, unread: false, href: '#/reservation/r5' },
    ],
    activity: [
      { user: 'u1', icon: 'check', text: 'Marked Massimo Sandwich Loaf 400g as consumed', at: now - 4 * DAY },
      { user: 'u1', icon: 'trash', text: 'Marked Mixed Salad Greens Pack 200g as discarded', at: now - 2 * DAY },
      { user: 'u1', icon: 'camera', text: 'Added Gardenia Original Classic Bread 400g by photo scan', at: now - 2 * DAY },
      { user: 'u2', icon: 'layers', text: 'Recorded batch: Massimo Sandwich Loaf 400g (18 units)', at: now - 2 * DAY },
      { user: 'u2', icon: 'ban', text: 'Dismissed batch Milo 3-in-1 Sachets – sold out', at: now - 19 * DAY },
      { user: 'u2', icon: 'basket', text: 'Listed 6 x Gardenia Wholemeal Bread – awaiting transfer', at: now - 18 * 6e4 },
    ],
    threads: {},
    recent: ['milk', 'gardenia', 'eggs'],
  }
}
export let S
try { S = JSON.parse(localStorage.getItem(KEY)) } catch { S = null }
if (!S || !S.users) S = seedState()
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch { toast('Browser storage is full – some changes may not persist') } }
export const resetAll = () => { localStorage.removeItem(KEY); S = seedState(); save() }

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
export const distTo = (sellerId) => { const s = getSeller(sellerId), b = buyerLoc(); return Math.max(0.3, Math.round(Math.hypot(b.x - s.x, b.y - s.y) * 0.7 * 10) / 10) }
export const dist = (l) => distTo(l.seller)
export const disc = (l) => (l.orig > 0 && l.price > 0 && l.price < l.orig ? Math.round((1 - l.price / l.orig) * 100) : 0)
export const daysLeft = (l) => daysTo(l.expiry)
export const imgs = (l) => (l.photos?.length ? l.photos : [photo(l.kind, 0), photo(l.kind, 1), photo(l.kind, 2)])
export const thumb = (x) => x.photos?.[0] || x.photo || photo(x.kind, 0, 200)
export const expShort = (s) => { const d = daysTo(s); return d < 0 ? 'Expired' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtShort(s) }
export const expLong = (s) => { const d = daysTo(s); return d < -1 ? `Expired ${-d} days ago` : d === -1 ? 'Expired yesterday' : d === 0 ? 'Expires today' : d === 1 ? 'Expires tomorrow' : `${d} days left` }
export const isLive = (l) => l.status === 'active' && daysLeft(l) >= 0
export const browsable = () => S.listings.filter((l) => isLive(l) && l.qty > 0)
export const OPEN = ['pending', 'confirmed']
export const resFor = (lid) => S.reservations.filter((r) => r.listingId === lid)
export const reservedQty = (lid) => resFor(lid).filter((r) => OPEN.includes(r.status)).reduce((a, r) => a + r.qty, 0)
export const R_LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }
export const R_CLS = { pending: 'y', confirmed: 'g', completed: '', cancelled: 'r' }
export const CLEAR = ['Awaiting Physical Transfer', 'In Clearance Basket', 'Reserved', 'Collected']
export const CL_CLS = { 'Awaiting Physical Transfer': 'y', 'In Clearance Basket': 'g', Reserved: 'g', Collected: '' }

// Inventory / batch expiry classification aligned with the 7/3/1-day reminders.
export function expStatus(s) {
  const d = daysTo(s)
  if (d < 0) return { k: 'expired', label: 'Expired', cls: 'r solid' }
  if (d <= 1) return { k: 'd1', label: d === 0 ? 'Expires today' : 'Expires tomorrow', cls: 'r' }
  if (d <= 3) return { k: 'd3', label: 'Within 3 days', cls: 'o' }
  if (d <= 7) return { k: 'd7', label: 'Within 7 days', cls: 'y' }
  return { k: 'fresh', label: 'Fresh', cls: 'g' }
}
export const countdown = (s) => { const d = daysTo(s); return d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : plural(d, 'day') }

/* ---------------- Notifications, activity & reminders ---------------- */
export function notify(user, type, text, sub, href, key) {
  if (!S.users.some((u) => u.id === user)) return
  if (key && S.notifs.some((n) => n.key === key)) return
  S.notifs.unshift({ id: uid('n'), user, type, text, sub, href, key, at: Date.now(), unread: true })
}
export const myNotifs = () => S.notifs.filter((n) => n.user === S.session)
export const logAct = (icon, text) => S.activity.unshift({ user: S.session, icon, text, at: Date.now() })
export const sellerUser = (sellerId) => S.users.find((u) => u.sellerId === sellerId)

const BUCKET = { d7: '7-day reminder', d3: '3-day reminder', d1: '1-day reminder' }
export function syncReminders() {
  const u = me()
  if (!u) return 0
  const before = S.notifs.length
  const p = u.prefs || PREFS()
  const items = u.role === 'retailer'
    ? S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified').map((b) => ({ ...b, href: `#/batch/${b.id}`, kindKey: 'batch' }))
    : S.inventory.filter((i) => i.owner === u.id && i.status === 'active').map((i) => ({ ...i, href: '#/inventory', kindKey: 'inv' }))
  items.forEach((it) => {
    const st = expStatus(it.expiry), d = daysTo(it.expiry)
    const key = `${it.kindKey}:${it.id}:${st.k}:${it.expiry}`
    if (st.k === 'expired' && p.expired) notify(u.id, 'expired', `${it.name} has expired`, `Expired on ${fmtDate(it.expiry)} · ${u.role === 'retailer' ? 'check and remove the batch from the shelf' : 'mark it as consumed or discarded'}`, it.href, key)
    else if (BUCKET[st.k] && p[st.k]) notify(u.id, 'expiry', `${it.name} ${d === 0 ? 'expires today' : d === 1 ? 'expires tomorrow' : `expires in ${d} days`}`, `${BUCKET[st.k]} · ${fmtDate(it.expiry)}`, it.href, key)
    if (u.role === 'retailer' && d >= 0 && d <= 3 && p.stock) notify(u.id, 'stock', `Check physical shelf stock: ${it.name}`, `Recorded ${it.qty} units on ${fmtDate(it.recorded)} · verify what is left before listing or dismissing`, it.href, `stock:${it.id}:${it.expiry}`)
  })
  const added = S.notifs.length - before
  if (added) save()
  return added
}

/* ---------------- UI primitives ---------------- */
export function toast(msg, icon = 'check') {
  const t = document.createElement('div')
  t.className = 'toast'
  t.innerHTML = ic(icon, 'sm') + `<span>${esc(msg)}</span>`
  $('#toasts').appendChild(t)
  setTimeout(() => t.remove(), 3400)
}
export function openModal(html, cls = '') {
  const m = $('#modal')
  m.className = 'modal ' + cls
  m.innerHTML = html
  $('#ov').classList.add('open')
  setTimeout(() => m.querySelector('input:not([type=checkbox]):not([readonly]),select,textarea')?.focus(), 30)
}
export const closeModal = () => $('#ov').classList.remove('open')
let pendingOk = null
export function confirmDlg({ title, body, ok = 'Confirm', cls = '', onOk }) {
  pendingOk = onOk
  openModal(`<h3>${title}</h3><div class="mbody">${body}</div><div class="macts"><button class="btn sec" data-act="mclose">Cancel</button><button class="btn ${cls}" data-act="mok">${ok}</button></div>`)
}
export const runOk = () => { const f = pendingOk; pendingOk = null; closeModal(); f && f() }

export const sp = (label, cls = '') => `<span class="sp ${cls}">${esc(label)}</span>`
export const pageHead = (title, sub = '', actions = '') => `<div class="pagehead"><div><h1>${title}</h1>${sub ? `<p class="mute">${sub}</p>` : ''}</div>${actions ? `<div class="ph-acts">${actions}</div>` : ''}</div>`
export const empty = (icon, title, text, acts = '') => `<div class="empty">${ic(icon)}<h3>${title}</h3><p>${text}</p>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`
export const steps = (labels, cur) => `<ol class="steps">${labels.map((t, i) => `<li class="${i < cur ? 'done' : i === cur ? 'cur done' : ''}">${t}</li>`).join('')}</ol>`
export const catOptions = (sel, blank = 'Select a category') => `<option value="">${blank}</option>` + CATEGORIES.slice(1).map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${c.label}</option>`).join('')
export const avatar = (s, size = 'md') => `<span class="avatar ${size}" style="background:${s.hue}1f;color:${s.hue};border-color:${s.hue}55">${initials(s.name)}</span>`

/* Marketplace listing card */
export function card(l, opts = {}) {
  const d = daysLeft(l), s = getSeller(l.seller)
  const tag = opts.static ? 'div' : 'a'
  const st = l.qty <= 0 ? '<span class="status">Fully reserved</span>' : l.qty <= 3 ? `<span class="status hot">Only ${l.qty} left</span>` : ''
  return `<${tag} class="card ${l.qty <= 0 ? 'gone' : ''}" ${opts.static ? '' : `href="#/item/${l.id}"`}>
    <div class="im"><img src="${imgs(l)[0]}" alt="${esc(l.name)}" loading="lazy">${disc(l) ? `<span class="badge">-${disc(l)}%</span>` : ''}${st}</div>
    <div class="bd"><div class="nm">${esc(l.name)}</div>
      <div class="price"><b>${rm(l.price)}</b>${l.orig ? `<s>${rm(l.orig)}</s>` : ''}</div>
      <div class="meta">${ic('store', 'xs')}<span>${esc(s?.name || '')}</span></div>
      <div class="meta">${ic('pin', 'xs')}<span>${opts.static ? 'Your pickup point' : dist(l) + ' km'}</span><span class="sep">·</span><span>${l.qty} left</span></div>
      <div class="meta ${d <= 1 ? 'hotline' : ''}">${ic('clock', 'xs')}<span>Exp. ${expShort(l.expiry)}${d >= 0 && d <= 1 ? ', ' + fmtShort(l.expiry) : ''}</span></div>
    </div></${tag}>`
}
export const mini = (l) => `<a class="mini" href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt="" loading="lazy"><div style="min-width:0"><div class="t">${esc(l.name)}</div><div class="p">${rm(l.price)} <s>${rm(l.orig)}</s></div><div class="m">${dist(l)} km · <b class="${daysLeft(l) <= 1 ? 'hot' : ''}">${expLong(l.expiry)}</b></div></div></a>`

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
export const fld = (f, k, label, input, hint = '') => `<div class="fld ${errOf(f, k) ? 'err' : ''}" data-fk="${k}"><label class="l" for="${f}-${k}">${label}</label>${input}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="e">${esc(errOf(f, k) || '')}</div></div>`
export const inp = (f, k, type = 'text', attrs = '') => `<input type="${type}" id="${f}-${k}" data-b="${f}.${k}" value="${esc(FORMS[f]?.[k] ?? '')}" ${attrs}>`
export const sel = (f, k, opts) => `<select id="${f}-${k}" data-b="${f}.${k}">${opts}</select>`
export const ta = (f, k, attrs = '') => `<textarea id="${f}-${k}" data-b="${f}.${k}" ${attrs}>${esc(FORMS[f]?.[k] ?? '')}</textarea>`
export const chk = (f, k, label) => `<label class="chk ${errOf(f, k) ? 'err' : ''}"><input type="checkbox" data-b="${f}.${k}" ${FORMS[f]?.[k] ? 'checked' : ''}>${label}</label>`
export const rmInp = (f, k) => `<div class="rm"><span>RM</span>${inp(f, k, 'number', 'min="0" step="0.10" placeholder="0.00"')}</div>`

/* ---------------- Marketplace eligibility rules ---------------- */
import { ELIGIBILITY } from './data.js'
export function eligibility(f) {
  const errs = []
  const t = ELIGIBILITY.find((x) => x.id === f.pack)
  if (!t) errs.push('Select the food type and condition.')
  else if (!t.ok) errs.push(`Not eligible: ${t.label.toLowerCase()} can't be listed on FreshSave.`)
  if (t?.ok !== false) {
    if (!f.c1) errs.push('Confirm the packaging is sealed and undamaged.')
    if (!f.c2) errs.push('Confirm the item has been stored according to its label.')
  }
  if (f.expiry && daysTo(f.expiry) < 0) errs.push("Not eligible: expired food can't be listed.")
  return { ok: !errs.length, errs, rejected: t?.ok === false || (f.expiry && daysTo(f.expiry) < 0) }
}
export function eligResult(f) {
  const r = eligibility(f)
  if (r.ok) return `<div class="elig ok">${ic('check2', 'sm')}<div><b>Eligibility check passed</b><span>This item meets FreshSave's listing rules.</span></div></div>`
  if (r.rejected) return `<div class="elig bad">${ic('ban', 'sm')}<div><b>This item can't be listed</b>${r.errs.filter((e) => e.startsWith('Not eligible')).map((e) => `<span>${esc(e)}</span>`).join('')}<span>FreshSave only accepts unopened packaged food, safely stored packaged goods and sealed bakery products.</span></div></div>`
  return `<div class="elig">${ic('info', 'sm')}<div><b>Eligibility check</b>${r.errs.map((e) => `<span>${esc(e)}</span>`).join('')}</div></div>`
}
export function eligFields(f) {
  const o = (x) => `<option value="${x.id}" ${FORMS[f].pack === x.id ? 'selected' : ''}>${x.label}</option>`
  return `${fld(f, 'pack', 'Food type and condition', sel(f, 'pack', `<option value="">Select…</option><optgroup label="Accepted">${ELIGIBILITY.filter((x) => x.ok).map(o).join('')}</optgroup><optgroup label="Not accepted">${ELIGIBILITY.filter((x) => !x.ok).map(o).join('')}</optgroup>`))}
  <div class="fld" style="margin-top:12px">${chk(f, 'c1', 'Packaging is sealed, unopened and undamaged')}${chk(f, 'c2', 'Stored according to label instructions (e.g. chilled or frozen)')}</div>
  <div id="${f}-elig">${eligResult(FORMS[f])}</div>`
}
