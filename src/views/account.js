// Dashboard, notifications, sustainability impact and profile & settings.
import {
  S, save, $, esc, ic, rm, catLabel, CATEGORIES, LOCATIONS, toast, go, app, me, isRetailer, mySeller, getL, browsable, dist, daysLeft, daysTo,
  expStatus, expLong, fmtDate, fmtDT, ago, plural, mini, sp, pageHead, empty, myNotifs, confirmDlg, resetAll, thumb, isLive, OPEN, FORMS, fld, inp, sel, photo,
} from '../core.js'
import { logout } from './auth.js'

/* ---------------- Derived metrics (only from recorded data) ---------------- */
export function metrics() {
  const u = me(), R = u.role === 'retailer', sid = u.sellerId
  const myListings = S.listings.filter((l) => l.seller === sid)
  const involved = S.reservations.filter((r) => r.buyerId === u.id || getL(r.listingId)?.seller === sid)
  const completed = involved.filter((r) => r.status === 'completed')
  const tracked = R ? S.batches.filter((b) => b.owner === u.id) : S.inventory.filter((i) => i.owner === u.id)
  const activeTracked = R ? tracked.filter((b) => b.verify === 'unverified') : tracked.filter((i) => i.status === 'active')
  return {
    R, tracked, activeTracked, completed,
    itemsTracked: tracked.length,
    listingsCreated: myListings.length,
    completedRescues: completed.length,
    foodRescued: completed.reduce((a, r) => a + r.qty, 0),
    activeListings: myListings.filter((l) => isLive(l)).length,
    expiringSoon: activeTracked.filter((x) => { const d = daysTo(x.expiry); return d >= 0 && d <= 7 }).length,
    expired: activeTracked.filter((x) => daysTo(x.expiry) < 0).length,
    pendingSeller: S.reservations.filter((r) => r.status === 'pending' && getL(r.listingId)?.seller === sid).length,
    openBuyer: S.reservations.filter((r) => r.buyerId === u.id && OPEN.includes(r.status)).length,
  }
}

/* ---------------- Dashboard ---------------- */
function pageDashboard() {
  const u = me(), m = metrics(), R = m.R
  const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const first = R ? mySeller().name : u.name.split(' ')[0]
  const upcoming = [...m.activeTracked].filter((x) => daysTo(x.expiry) <= 7).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 6)
  const acts = S.activity.filter((a) => a.user === u.id).slice(0, 6)
  const near = browsable().filter((l) => l.seller !== u.sellerId).sort((a, b) => dist(a) - dist(b)).slice(0, 4)
  const tile = (label, v, sub, href, cls = '') => `<a class="stat ${cls}" href="${href}"><small>${label}</small><b>${v}</b>${sub ? `<span class="mute sm">${sub}</span>` : ''}</a>`
  return `<div class="dash-hello"><div><h1>${greet}, ${esc(first)}</h1><p class="mute">${new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${R ? 'Retailer account' : 'Individual account'}</p></div>
    <div class="quick-acts"><a class="btn" href="#/scan">${ic('camera', 'sm')}Scan Food</a><button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}${R ? 'Add Batch' : 'Add Inventory'}</button><a class="btn sec" href="#/market">${ic('store', 'sm')}Browse Marketplace</a></div></div>
  <h2 class="sect-t">${R ? 'Batch inventory overview' : 'Inventory overview'}</h2>
  <div class="stats six">
    ${tile(R ? 'Tracked batches' : 'Tracked products', m.activeTracked.length, R ? 'awaiting stock check' : 'in your inventory', R ? '#/batches' : '#/inventory')}
    ${tile('Expiring soon', m.expiringSoon, 'within 7 days', R ? '#/batches' : '#/inventory', m.expiringSoon ? 'warn' : '')}
    ${tile('Expired', m.expired, R ? 'not yet checked' : 'still in inventory', R ? '#/batches' : '#/inventory', m.expired ? 'bad' : '')}
    ${tile('Active listings', m.activeListings, 'on the marketplace', '#/listings')}
    ${tile('Pending reservations', R ? m.pendingSeller : m.openBuyer, R ? 'requests to review' : 'awaiting pickup', R ? '#/reservations?view=seller&tab=pending' : '#/reservations')}
    ${tile('Completed rescues', m.completedRescues, 'collected transactions', '#/impact')}
  </div>
  <div class="dash-grid">
    <section class="panel"><div class="panel-h"><h3>${ic('bell', 'sm')}Upcoming expiry reminders</h3><a class="link sm" href="${R ? '#/batches' : '#/inventory'}">View all</a></div>
      ${upcoming.length ? `<ul class="plist">${upcoming.map((x) => { const st = expStatus(x.expiry); return `<li><a href="${R ? `#/batch/${x.id}` : '#/inventory'}"><img src="${thumb(x)}" alt=""><span><b>${esc(x.name)}</b><small>${R ? `Recorded ${x.qty} units · ` : `Qty ${x.qty} · `}${fmtDate(x.expiry)}</small></span>${sp(st.label, st.cls)}</a></li>` }).join('')}</ul>`
        : `<div class="pempty">No items expiring in the next 7 days.</div>`}</section>
    <section class="panel"><div class="panel-h"><h3>${ic('history', 'sm')}Recent inventory activity</h3></div>
      ${acts.length ? `<ul class="alist">${acts.map((a) => `<li>${ic(a.icon, 'sm')}<span>${esc(a.text)}</span><small>${ago(a.at)}</small></li>`).join('')}</ul>` : `<div class="pempty">No activity recorded yet. Scan or add food to get started.</div>`}</section>
    <section class="panel wide"><div class="panel-h"><h3>${ic('pin', 'sm')}Nearby food rescue listings</h3><a class="link sm" href="#/market">Browse marketplace</a></div>
      ${near.length ? `<div class="strip">${near.map(mini).join('')}</div>` : `<div class="pempty">No food rescue listings found nearby.</div>`}</section>
    <section class="panel wide"><div class="panel-h"><h3>${ic('leaf', 'sm')}Sustainability impact</h3><a class="link sm" href="#/impact">View dashboard</a></div>
      <div class="kv five"><div><small>Food items tracked</small><b>${m.itemsTracked}</b></div><div><small>Listings created</small><b>${m.listingsCreated}</b></div><div><small>Completed rescues</small><b>${m.completedRescues}</b></div><div><small>Food rescued</small><b>${plural(m.foodRescued, 'item')}</b></div><div><small>Active listings</small><b>${m.activeListings}</b></div></div>
      <p class="mute sm" style="margin-top:10px">Calculated from your recorded inventory and completed transactions only.</p></section>
  </div>`
}

/* ---------------- Notifications ---------------- */
const N_TABS = [['all', 'All'], ['unread', 'Unread'], ['expiry', 'Expiry reminders'], ['stock', 'Stock verification'], ['resv', 'Reservations & collection']]
const N_ICON = { expiry: 'clock', expired: 'alert', stock: 'eye', resv: 'receipt', collect: 'check2' }
let ntab = 'all'
function pageNotifs() {
  const all = myNotifs()
  const f = { all: () => true, unread: (n) => n.unread, expiry: (n) => n.type === 'expiry' || n.type === 'expired', stock: (n) => n.type === 'stock', resv: (n) => n.type === 'resv' || n.type === 'collect' }
  const xs = all.filter(f[ntab]).sort((a, b) => b.at - a.at)
  const tabs = N_TABS.filter(([k]) => k !== 'stock' || isRetailer())
  return `${pageHead('Notifications', `${all.filter((n) => n.unread).length} unread`, `<button class="btn sec" data-act="readall">${ic('check', 'sm')}Mark all as read</button>`)}
  <div class="tabs">${tabs.map(([k, t]) => `<button class="tab ${ntab === k ? 'on' : ''}" data-act="ntab" data-t="${k}">${t}<i>${all.filter(f[k]).length}</i></button>`).join('')}</div>
  ${xs.length ? `<ul class="nlist">${xs.map((n) => `<li class="${n.unread ? 'unread' : ''}"><button data-act="notif" data-id="${n.id}"><span class="nic ${n.type}">${ic(N_ICON[n.type] || 'bell', 'sm')}</span><span class="nt"><b>${esc(n.text)}</b><small>${esc(n.sub)}</small></span><span class="nwhen"><small title="${fmtDT(n.at)}">${ago(n.at)}</small>${n.unread ? '<i class="udot" aria-label="Unread"></i>' : ''}</span></button></li>`).join('')}</ul>`
    : `<div class="tabempty">${all.length ? 'Nothing in this view.' : 'No notifications yet.'}</div>`}`
}
export function openNotif(id) {
  const n = S.notifs.find((x) => x.id === id)
  if (!n) return
  n.unread = false; save(); app.refreshChrome(); go(n.href)
}

/* ---------------- Sustainability impact ---------------- */
function bars(rows, total) {
  if (!total) return `<div class="pempty">No records yet.</div>`
  const max = Math.max(...rows.map((r) => r[1]), 1)
  return `<ul class="hbars">${rows.map(([label, v, cls]) => `<li><span>${label}</span><div><i class="${cls || ''}" style="width:${(v / max) * 100}%"></i></div><b>${v}</b></li>`).join('')}</ul>`
}
function pageImpact() {
  const m = metrics(), R = m.R
  let status
  if (R) {
    const un = m.tracked.filter((b) => b.verify === 'unverified')
    const k = (key) => un.filter((b) => expStatus(b.expiry).k === key).length
    status = [['Fresh (8+ days)', k('fresh'), 'g'], ['Within 7 days', k('d7'), 'y'], ['Within 3 days', k('d3'), 'o'], ['Within 1 day', k('d1'), 'r'], ['Expired, unchecked', k('expired'), 'rs'], ['Verified & listed', m.tracked.filter((b) => b.verify === 'listed').length, 'g2'], ['Sold out / dismissed', m.tracked.filter((b) => b.verify === 'dismissed').length, '']]
  } else {
    const act = m.tracked.filter((i) => i.status === 'active')
    const k = (key) => act.filter((i) => expStatus(i.expiry).k === key).length
    status = [['Fresh (8+ days)', k('fresh'), 'g'], ['Within 7 days', k('d7'), 'y'], ['Within 3 days', k('d3'), 'o'], ['Within 1 day', k('d1'), 'r'], ['Expired', k('expired'), 'rs'], ['Consumed', m.tracked.filter((i) => i.status === 'consumed').length, 'g2'], ['Discarded', m.tracked.filter((i) => i.status === 'discarded').length, '']]
  }
  const cats = CATEGORIES.slice(1).map((c) => [c.label, m.tracked.filter((x) => x.cat === c.id).length, 'g2']).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1])
  // completed rescue transactions per week, last 8 weeks
  const wk = 7 * 864e5, now = Date.now()
  const weeks = Array.from({ length: 8 }, (_, i) => { const end = now - (7 - i) * wk; const xs = m.completed.filter((r) => r.collectedAt > end - wk && r.collectedAt <= end); return { label: new Date(end).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }), n: xs.length, q: xs.reduce((a, r) => a + r.qty, 0) } })
  const wmax = Math.max(1, ...weeks.map((w) => w.n))
  const tiles = [['Food Items Tracked', m.itemsTracked, R ? 'batches recorded' : 'products recorded'], ['Food Listings Created', m.listingsCreated, 'marketplace listings'], ['Completed Rescues', m.completedRescues, 'collected transactions'], ['Food Rescued', m.foodRescued, 'items collected'], ['Active Listings', m.activeListings, 'currently live']]
  return `${pageHead('Sustainability Impact', 'Your FreshSave activity, calculated only from recorded data.')}
  <div class="stats five">${tiles.map(([a, b, c]) => `<div class="stat"><small>${a}</small><b>${b}</b><span class="mute sm">${c}</span></div>`).join('')}</div>
  <div class="dash-grid">
    <section class="panel"><div class="panel-h"><h3>${R ? 'Batch expiry status' : 'Inventory expiry status'}</h3><small class="mute">${plural(m.tracked.length, R ? 'batch' : 'item')}</small></div>${bars(status, m.tracked.length)}</section>
    <section class="panel"><div class="panel-h"><h3>Food categories</h3><small class="mute">tracked ${R ? 'batches' : 'items'}</small></div>${bars(cats, m.tracked.length)}</section>
    <section class="panel wide"><div class="panel-h"><h3>Completed rescue transactions over time</h3><small class="mute">last 8 weeks</small></div>
      ${m.completed.length ? `<div class="cols-chart">${weeks.map((w) => `<div class="cc"><span class="cv">${w.n || ''}</span><i style="height:${(w.n / wmax) * 100}%" title="${w.n} transactions · ${w.q} items"></i><small>${w.label}</small></div>`).join('')}</div>` : `<div class="pempty">No completed rescues recorded yet.</div>`}</section>
  </div>
  <div class="note">${ic('info', 'sm')}<span>Only collected transactions count as completed rescues. Reserved and cancelled items, and quantities that were listed but not collected, are not counted as rescued. FreshSave does not estimate CO₂, water or weight savings without supporting data.</span></div>`
}

/* ---------------- Profile & settings ---------------- */
function pageProfile() {
  const u = me(), s = mySeller(), R = u.role === 'retailer'
  if (!FORMS.pf || FORMS.pf.uid !== u.id) FORMS.pf = { uid: u.id, name: u.name, email: u.email, loc: u.loc, store: s.name, address: s.area, cur: '', npw: '', err: {} }
  const p = u.prefs
  const tog = (k, label, sub) => `<label class="toggle"><span><b>${label}</b><small>${sub}</small></span><input type="checkbox" data-pref="${k}" ${p[k] ? 'checked' : ''}><i></i></label>`
  return `${pageHead('Profile & Settings')}
  <div class="settings">
    <form class="form" id="f-pf" novalidate>
      <h2>Profile information</h2>
      <div class="cols">${fld('pf', 'name', R ? 'Contact person' : 'Full name', inp('pf', 'name'))}${fld('pf', 'email', 'Email', inp('pf', 'email', 'email'))}</div>
      <div class="fld"><label class="l">Account role</label><div class="fixed">${ic(R ? 'store' : 'user', 'sm')}<span><b>${R ? 'Retailer' : 'Individual'}</b><br><span class="mute sm">Set at registration</span></span></div></div>
      ${fld('pf', 'loc', R ? 'Store neighbourhood / preferred location' : 'Preferred location', sel('pf', 'loc', LOCATIONS.map((l) => `<option value="${l.id}" ${FORMS.pf.loc === l.id ? 'selected' : ''}>${l.name}</option>`).join('')), 'Default area for marketplace distance filtering.')}
      ${R ? `<h2 style="margin-top:26px">Store</h2>${fld('pf', 'store', 'Store name', inp('pf', 'store'))}${fld('pf', 'address', 'Registered store / pickup address', inp('pf', 'address'), 'Fixed pickup location shown on all your listings. It is never updated from GPS.')}`
        : `${fld('pf', 'address', 'Pickup point for your listings', inp('pf', 'address'), 'Shown to buyers if you list food. Not updated from GPS.')}`}
      <div class="wnav"><span></span><button class="btn" type="submit">Save changes</button></div>
    </form>
    <div>
      <section class="form"><h2>Notification preferences</h2><p class="mute sm">Choose which notifications you receive.</p>
        ${tog('d7', '7-day expiry reminder', '7 days before an item expires')}${tog('d3', '3-day expiry reminder', '3 days before expiry')}${tog('d1', '1-day expiry reminder', 'The day before, and on the day')}${tog('expired', 'Expired food', 'When an item passes its expiry date')}
        ${R ? tog('stock', 'Stock verification reminders', 'When a batch needs a physical shelf check') : ''}${tog('resv', 'Reservations & collection', 'Requests, confirmations and collection updates')}</section>
      <form class="form" id="f-pw" novalidate style="margin-top:16px"><h2>Account settings</h2>
        ${fld('pf', 'cur', 'Current password', inp('pf', 'cur', 'password', 'autocomplete="current-password"'))}${fld('pf', 'npw', 'New password', inp('pf', 'npw', 'password', 'autocomplete="new-password" placeholder="At least 8 characters"'))}
        <div class="wnav"><button type="button" class="btn danger" data-act="logout">${ic('logout', 'sm')}Log out</button><button class="btn sec" type="submit">Change password</button></div>
        <p class="mute sm" style="margin-top:14px">Prototype data is stored in this browser. <button type="button" class="link sm" data-act="resetdemo">Reset demo data</button></p></form>
    </div>
  </div>`
}

export const routes = { dashboard: pageDashboard, notifications: pageNotifs, impact: pageImpact, profile: pageProfile }
export const actions = {
  ntab: (el) => { ntab = el.dataset.t; app.render() },
  notif: (el) => { $('#npop')?.classList.remove('open'); openNotif(el.dataset.id) },
  readall: () => { myNotifs().forEach((n) => (n.unread = false)); save(); app.refreshChrome(); if (location.hash.startsWith('#/notifications')) app.render(); else $('#npop')?.classList.remove('open') },
  logout: () => logout(),
  resetdemo: () => confirmDlg({ title: 'Reset demo data?', body: '<p>All prototype records in this browser return to the original sample data and you will be logged out.</p>', ok: 'Reset', cls: 'danger', onOk: () => { resetAll(); Object.keys(FORMS).forEach((k) => delete FORMS[k]); location.hash = '#/login'; app.render() } }),
}
export function change(e) {
  const t = e.target
  if (t.dataset.pref) { me().prefs[t.dataset.pref] = t.checked; save(); toast(`${t.checked ? 'On' : 'Off'}: ${t.closest('label').querySelector('b').textContent}`); return true }
  return false
}
export function submit(e) {
  const id = e.target.id, f = FORMS.pf
  if (id === 'f-pf') {
    const u = me(), s = mySeller(), er = {}
    if (f.name.trim().length < 2) er.name = 'Enter your name.'
    if (!/\S+@\S+\.\S+/.test(f.email)) er.email = 'Enter a valid email.'
    else if (S.users.some((x) => x.id !== u.id && x.email === f.email.trim().toLowerCase())) er.email = 'This email is used by another account.'
    if (u.role === 'retailer') { if (f.store.trim().length < 2) er.store = 'Enter the store name.'; if (f.address.trim().length < 8) er.address = 'Enter the full pickup address.' }
    f.err = er
    if (Object.keys(er).length) return app.render(), true
    Object.assign(u, { name: f.name.trim(), email: f.email.trim().toLowerCase(), loc: f.loc })
    if (u.role === 'retailer') s.name = f.store.trim()
    else s.name = u.name
    s.area = f.address.trim()
    S.buyerLoc = null
    save(); toast('Profile saved'); app.refreshChrome(); app.render()
    return true
  }
  if (id === 'f-pw') {
    const u = me(), er = {}
    if (f.cur !== u.pw) er.cur = 'Current password is incorrect.'
    if (f.npw.length < 8) er.npw = 'Use at least 8 characters.'
    f.err = er
    if (Object.keys(er).length) return app.render(), true
    u.pw = f.npw; f.cur = ''; f.npw = ''; save(); toast('Password changed'); app.render()
    return true
  }
  return false
}
