// Dashboards ("Today"), notifications, activity and profile & settings.
import {
  S, save, $, esc, ic, rm, catLabel, CATEGORIES, LOCATIONS, toast, go, app, me, isRetailer, mySeller, getL, browsable, dist, daysLeft, daysTo,
  expStatus, within, fmtDate, fmtDT, ago, plural, mini, sp, pageHead, empty, myNotifs, confirmDlg, resetAll, thumb, isLive, OPEN, FORMS, fld, inp, sel,
  todayActions, disclose, focusErr, isSellerOf, avail, ledger, lifecycle, batchState, POLICY, whenShort, timeLeft, dateWord, resLabel, resCls, km, today0,
} from '../core.js'
import { logout } from './auth.js'

/* ---------------- Derived activity (only from records made in this browser) ----------------
   A handover counts only if the SELLER recorded it with the buyer's matching code, it is not a sample record,
   not simulated and not disputed. Reserved, expired and cancelled units never count. */
export const validHandover = (r) => r.status === 'completed' && r.handover?.method === 'code' && !r.sample && !r.disputed
export function metrics() {
  const u = me(), R = u.role === 'retailer', sid = u.sellerId
  const involved = S.reservations.filter((r) => r.buyerId === u.id || r.terms?.sellerId === sid)
  const done = involved.filter((r) => r.status === 'completed')
  const valid = done.filter(validHandover)
  const tracked = R ? S.batches.filter((b) => b.owner === u.id) : S.inventory.filter((i) => i.owner === u.id)
  const act = R ? tracked.filter((b) => b.verify === 'unverified') : tracked.filter((i) => i.status === 'active')
  const mine = S.listings.filter((l) => l.seller === sid)
  const logSum = (t) => S.inventory.filter((i) => i.owner === u.id).reduce((a, i) => a + (i.log || []).filter((e) => e.type === t).reduce((b, e) => b + e.n, 0), 0)
  return {
    R, tracked, act, valid,
    handovers: valid.length, units: valid.reduce((a, r) => a + r.qty, 0),
    sampleDone: done.filter((r) => r.sample).length, simulated: done.filter((r) => r.handover?.method === 'simulated').length, disputed: done.filter((r) => r.disputed).length,
    requested: involved.length, lapsed: involved.filter((r) => ['expired', 'declined', 'cancelled'].includes(r.status)).length,
    used: logSum('consumed'), discarded: logSum('discarded'),
    unitsOffered: mine.reduce((a, l) => a + l.total, 0), unitsReturned: mine.reduce((a, l) => a + (l.withdrawn || 0), 0),
    liveListings: mine.filter(isLive).length, liveUnits: mine.filter(isLive).reduce((a, l) => a + avail(l), 0), heldUnits: mine.reduce((a, l) => a + ledger(l).held, 0),
    needCount: S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified' && daysTo(b.expiry) >= 0 && daysTo(b.expiry) <= 7).length,
  }
}

/* ---------------- Today (dashboard) ---------------- */
function checklist(u, R) {
  if (!u.onboard) return ''
  const hasItem = R ? S.batches.some((b) => b.owner === u.id && !b.history?.length && b.addedAt > u.joined) : S.inventory.some((i) => i.owner === u.id && i.addedAt > u.joined)
  const steps = R
    ? [['Record your first batch', 'Scan or type the date from the pack.', '#/scan', 'Scan batch', hasItem], ['Count the shelf for a batch near its date', 'Only counted units can be offered.', '#/batches', 'Open stock', S.batches.some((b) => b.owner === u.id && b.verify === 'listed' && b.verifiedAt > u.joined)], ['Offer units on Rescue', 'Only sealed, room-temperature packaged food.', '#/sell', 'New listing', S.listings.some((l) => l.seller === u.sellerId && l.postedAt > u.joined)]]
    : [['Add something you bought', 'A photo, a barcode or typed by hand – you always confirm the date.', '#/scan', 'Add food', hasItem], ['Choose your area', 'Used to sort nearby listings.', '#/market', 'Open Rescue', !!S.buyerLoc], ['Browse food nearby', 'Sealed pantry and bakery items from pilot sellers.', '#/market', 'Find food', S.reservations.some((r) => r.buyerId === u.id && r.createdAt > u.joined)]]
  const n = steps.filter((x) => x[4]).length
  return `<section class="panel onboard"><div class="panel-h"><h3>${ic('leaf', 'sm')}Welcome to FreshSave</h3><button class="link sm" data-act="onboardoff">Hide</button></div>
    <p class="mute">FreshSave has two halves. <b>Track</b> reminds you before food runs out of date. <b>Rescue</b> lets ${R ? 'you offer' : 'you collect'} sealed surplus food nearby. ${n}/3 steps done.</p>
    <ol class="ob">${steps.map(([t, s, h, c, d]) => `<li class="${d ? 'done' : ''}"><span class="obn">${d ? ic('check', 'xs') : ''}</span><div><b>${t}</b><small>${s}</small></div>${d ? '' : `<a class="btn sm sec" href="${h}">${c}</a>`}</li>`).join('')}</ol></section>`
}
function pageDashboard() {
  const u = me(), m = metrics(), R = m.R, acts = todayActions()
  const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  const first = R ? mySeller().name : u.name.split(' ')[0]
  const upcoming = m.act.filter((x) => daysTo(x.expiry) <= 7).sort((a, b) => a.expiry.localeCompare(b.expiry)).slice(0, 5)
  const recent = S.activity.filter((a) => a.user === u.id).slice(0, 5)
  const near = browsable().filter((l) => l.seller !== u.sellerId).sort((a, b) => dist(a) - dist(b)).slice(0, 3)
  const actItem = (a) => `<li class="${a.tone}"><span class="ai">${ic(a.icon, 'sm')}</span><div><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></div><a class="btn sm ${a.tone === 'hot' ? '' : 'sec'}" href="${a.href}">${a.cta}</a></li>`
  // Only the top three actions are shown up front; the rest are one click away.
  const rest = acts.slice(3)
  const actCards = acts.length ? `<ul class="acts">${acts.slice(0, 3).map(actItem).join('')}</ul>${rest.length ? `<details class="acts-more"><summary><span class="more-closed">Show ${rest.length} more</span><span class="more-open">Show fewer</span></summary><ul class="acts">${rest.map(actItem).join('')}</ul></details>` : ''}`
    : `<div class="allclear">${ic('check2')}<div><b>You're all caught up.</b><span>${R ? 'No requests, handovers or stock checks need you right now.' : 'Nothing is close to its date and no pickups are waiting.'}</span></div></div>`
  return `<div class="dash-hello slim"><div><span class="kicker">${R ? 'Store today' : 'Today'}</span><h1>${greet}, ${esc(first)}</h1><p class="mute">${new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
  ${checklist(u, R)}
  <section class="panel"><div class="panel-h"><h3>${ic('bell', 'sm')}${R ? 'Needs your action' : 'Needs you today'}</h3></div>${actCards}</section>
  ${R ? `<p class="snapline"><a href="#/listings"><b>${m.liveListings}</b> live ${m.liveListings === 1 ? 'listing' : 'listings'} · ${m.liveUnits} units available</a><a href="#/reservations?view=seller&tab=confirmed"><b>${m.heldUnits}</b> units held for pickup</a></p>` : ''}
  ${upcoming.length ? `<section class="panel"><div class="panel-h"><h3>${ic('clock', 'sm')}${R ? 'Batches dated within 7 days' : 'Use soon'}</h3><a class="link sm" href="${R ? '#/batches' : '#/inventory?st=d7'}">View all</a></div>
      <ul class="plist">${upcoming.map((x) => { const st = expStatus(x.expiry); return `<li><a href="${R ? `#/batch/${x.id}` : '#/inventory'}"><img src="${thumb(x)}" alt=""><span><b>${esc(x.name)}</b><small>${R ? `Received ${x.qty} · ` : `${x.qty} left · `}${dateWord(x.expiryType)} ${fmtDate(x.expiry)}</small></span>${sp(daysTo(x.expiry) < 0 ? 'Past date' : st.label, st.cls)}</a></li>` }).join('')}</ul></section>` : ''}
  ${R || !near.length ? '' : `<section class="panel"><div class="panel-h"><h3>${ic('pin', 'sm')}Nearby on Rescue</h3><a class="link sm" href="#/market">Browse all</a></div><div class="strip">${near.map(mini).join('')}</div></section>`}
  ${recent.length ? `<div class="fold">${disclose('Recent activity', `<ul class="alist">${recent.map((a) => `<li>${ic(a.icon, 'sm')}<span>${esc(a.text)}</span><small>${ago(a.at)}</small></li>`).join('')}</ul><a class="link sm" href="#/impact">Your activity</a>`)}</div>` : ''}`
}

/* ---------------- Notifications (in-app only) ---------------- */
const N_TABS = [['all', 'All'], ['unread', 'Unread'], ['expiry', 'Date reminders'], ['stock', 'Stock counts'], ['resv', 'Reservations & handovers']]
const N_ICON = { expiry: 'clock', expired: 'alert', stock: 'eye', resv: 'receipt', collect: 'check2' }
let ntab = 'all'
function pageNotifs() {
  const all = myNotifs()
  const f = { all: () => true, unread: (n) => n.unread, expiry: (n) => n.type === 'expiry' || n.type === 'expired', stock: (n) => n.type === 'stock', resv: (n) => n.type === 'resv' || n.type === 'collect' }
  const xs = all.filter(f[ntab]).sort((a, b) => b.at - a.at)
  const tabs = N_TABS.filter(([k]) => k !== 'stock' || isRetailer())
  return `${pageHead('Notifications', `${all.filter((n) => n.unread).length} unread`, `<button class="btn sec" data-act="readall">${ic('check', 'sm')}Mark all as read</button>`)}
  <p class="hintline">${ic('info', 'xs')}<span><b>In-app only.</b> Date reminders are created when you open FreshSave. Nothing is sent by push, SMS or email, so a reminder can arrive late.</span></p>
  <div class="tabs">${tabs.map(([k, t]) => `<button class="tab ${ntab === k ? 'on' : ''}" data-act="ntab" data-t="${k}">${t}<i>${all.filter(f[k]).length}</i></button>`).join('')}</div>
  ${xs.length ? `<ul class="nlist">${xs.map((n) => `<li class="${n.unread ? 'unread' : ''}"><button data-act="notif" data-id="${n.id}"><span class="nic ${n.type}">${ic(N_ICON[n.type] || 'bell', 'sm')}</span><span class="nt"><b>${esc(n.text)}</b><small>${esc(n.sub)}</small></span><span class="nwhen"><small title="${fmtDT(n.at)}">${ago(n.at)}</small>${n.unread ? '<i class="udot" aria-label="Unread"></i>' : ''}</span></button></li>`).join('')}</ul>`
    : `<div class="tabempty">${all.length ? 'Nothing in this view.' : 'No notifications yet. Add food to My food and reminders will appear here.'}</div>`}`
}
export function openNotif(id) {
  const n = S.notifs.find((x) => x.id === id)
  if (!n) return
  n.unread = false; save(); app.refreshChrome(); go(n.href)
}

/* ---------------- Activity ("impact") ---------------- */
function bars(rows, total) {
  if (!total) return `<div class="pempty">No records yet.</div>`
  const max = Math.max(...rows.map((r) => r[1]), 1)
  return `<ul class="hbars">${rows.map(([label, v, cls]) => `<li><span>${label}</span><div><i class="${cls || ''}" style="width:${(v / max) * 100}%"></i></div><b>${v}</b></li>`).join('')}</ul>`
}
function pageImpact() {
  const m = metrics(), R = m.R
  // DISTINCT intervals here (not cumulative), so the bars add up to the number of active records.
  const act = m.act, band = (lo, hi) => act.filter((x) => { const d = daysTo(x.expiry); return d >= lo && d <= hi }).length
  const status = [['Past date', act.filter((x) => daysTo(x.expiry) < 0).length, 'rs'], ['Today – tomorrow', band(0, 1), 'r'], ['2 – 3 days', band(2, 3), 'o'], ['4 – 7 days', band(4, 7), 'y'], ['8+ days', act.filter((x) => daysTo(x.expiry) > 7).length, 'g']]
  const cats = CATEGORIES.slice(1).map((c) => [c.label, m.tracked.filter((x) => x.cat === c.id).length, 'g2']).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1])
  const wk = 7 * 864e5, now = Date.now()
  const weeks = Array.from({ length: 8 }, (_, i) => { const end = now - (7 - i) * wk; const xs = m.valid.filter((r) => r.collectedAt > end - wk && r.collectedAt <= end); return { label: new Date(end).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }), n: xs.length, q: xs.reduce((a, r) => a + r.qty, 0) } })
  const wmax = Math.max(1, ...weeks.map((w) => w.n))
  const tiles = R
    ? [['Batches recorded', m.tracked.length, 'incl. sample batches'], ['Units offered on Rescue', m.unitsOffered, 'listed by you'], ['Units handed over', m.units, 'code-checked, excl. sample'], ['Units returned to shelf', m.unitsReturned, 'unclaimed or withdrawn'], ['Requests lapsed', m.lapsed, 'declined, cancelled or expired']]
    : [['Items tracked', m.tracked.length, 'incl. sample items'], ['Units marked used', m.used, 'by you'], ['Units discarded', m.discarded, 'by you'], ['Pickups recorded', m.handovers, 'code-checked, excl. sample'], ['Requests lapsed', m.lapsed, 'declined, cancelled or expired']]
  return `${pageHead('Your activity', 'Counts of records made in this browser. This is not an estimate of food waste avoided.')}
  <div class="stats five">${tiles.map(([a, b, c]) => `<div class="stat"><small>${a}</small><b>${b}</b><span class="mute sm">${c}</span></div>`).join('')}</div>
  <div class="dash-grid">
    <section class="panel"><div class="panel-h"><h3>${R ? 'Unchecked batches by date' : 'Active food by date'}</h3><small class="mute">distinct intervals</small></div>${bars(status, act.length)}</section>
    <section class="panel"><div class="panel-h"><h3>Categories</h3><small class="mute">${R ? 'batches' : 'items'} recorded</small></div>${bars(cats, m.tracked.length)}</section>
    <section class="panel wide"><div class="panel-h"><h3>Code-checked handovers per week</h3><small class="mute">last 8 weeks</small></div>
      ${m.valid.length ? `<div class="cols-chart">${weeks.map((w) => `<div class="cc"><span class="cv">${w.n || ''}</span><i style="height:${(w.n / wmax) * 100}%" title="${w.n} handovers · ${w.q} units"></i><small>${w.label}</small></div>`).join('')}</div>` : `<div class="pempty">No code-checked handovers recorded yet. Sample records and simulated handovers are not counted.</div>`}</section>
  </div>
  <p class="hintline" style="margin-top:4px">${ic('info', 'xs')}<span>Only code-checked handovers count. Sample records, simulated handovers, disputed records and anything reserved but not collected are excluded. <b>Not measured:</b> food waste avoided, CO₂, money saved or any outcome FreshSave cannot observe.</span></p>
  ${disclose('How handovers are counted', `<p class="sm char">A handover counts only when the seller recorded it by entering the buyer's matching pickup code, it is not a sample record, was not simulated, and was not disputed. ${m.sampleDone ? `${plural(m.sampleDone, 'sample record')} and ` : ''}${m.simulated ? `${plural(m.simulated, 'simulated handover')} ` : ''}${m.disputed ? `${plural(m.disputed, 'disputed record')} ` : ''}${m.sampleDone || m.simulated || m.disputed ? 'are excluded here. ' : ''}Prices are entered by sellers and not verified.</p>`, { cls: 'flat' })}`
}

/* ---------------- Profile & settings ---------------- */
function pageProfile() {
  const u = me(), s = mySeller(), R = u.role === 'retailer'
  if (!FORMS.pf || FORMS.pf.uid !== u.id) FORMS.pf = { uid: u.id, name: u.name, email: u.email, loc: u.loc, store: s.name, address: s.area, cur: '', npw: '', err: {} }
  const p = u.prefs
  const tog = (k, label, sub) => `<label class="toggle"><span><b>${label}</b><small>${sub}</small></span><input type="checkbox" data-pref="${k}" ${p[k] ? 'checked' : ''}><i></i></label>`
  return `${pageHead('Profile & settings')}
  <div class="settings">
    <form class="form" id="f-pf" novalidate>
      <h2>Profile</h2>
      <div class="cols">${fld('pf', 'name', R ? 'Contact person' : 'Full name', inp('pf', 'name'))}${fld('pf', 'email', 'Email', inp('pf', 'email', 'email'))}</div>
      <div class="fld"><label class="l">Account type</label><div class="fixed">${ic(R ? 'store' : 'user', 'sm')}<span><b>${R ? 'Retailer' : 'Individual'}</b><br><span class="mute sm">Set at registration. ${R ? 'Retailer accounts are not verified in this prototype.' : 'Individuals track food and reserve; listing is retailer-only in the pilot.'}</span></span></div></div>
      ${fld('pf', 'loc', R ? 'Store area' : 'Preferred area', sel('pf', 'loc', LOCATIONS.map((l) => `<option value="${l.id}" ${FORMS.pf.loc === l.id ? 'selected' : ''}>${l.name}</option>`).join('')), R ? 'Position on the demo map used for approximate distances.' : 'Default area for sorting listings. Distances are approximate.')}
      ${R ? `<h2 style="margin-top:26px">Store</h2>${fld('pf', 'store', 'Store name', inp('pf', 'store'))}${fld('pf', 'address', 'Pickup address', inp('pf', 'address'), 'Shown on your listings. Existing reservations keep the name and address they were booked with.')}` : ''}
      <div class="wnav"><span></span><button class="btn" type="submit">Save changes</button></div>
    </form>
    <div>
      <section class="form"><h2>In-app notifications</h2><p class="mute sm">Shown inside FreshSave when you open it. No push, SMS or email is sent, so these switches only control what appears here.</p>
        ${tog('d7', '7-day date reminder', 'First reminder, 4–7 days before')}${tog('d3', '3-day date reminder', '2–3 days before')}${tog('d1', '1-day date reminder', 'Today and tomorrow')}${tog('expired', 'Past-date alert', 'When an item passes its printed date')}
        ${R ? tog('stock', 'Shelf-count prompts', 'When a batch needs a physical count') : ''}${tog('resv', 'Reservations & handovers', 'Requests, acceptances, expiries and handovers')}</section>
      <section class="form" style="margin-top:16px"><h2>Account</h2>
        <p class="note warn" style="margin-top:0">${ic('alert', 'sm')}<span>Prototype: your password is stored as plain text in this browser. Never use a real password.</span></p>
        ${disclose('Change password', `<form id="f-pw" novalidate>
          ${fld('pf', 'cur', 'Current password', inp('pf', 'cur', 'password', 'autocomplete="current-password"'))}${fld('pf', 'npw', 'New password', inp('pf', 'npw', 'password', 'autocomplete="new-password" placeholder="At least 8 characters"'))}
          <div class="wnav"><span></span><button class="btn sec" type="submit">Change password</button></div></form>`, { open: !!(FORMS.pf.err.cur || FORMS.pf.err.npw), cls: 'flat' })}
        <div class="wnav" style="margin-top:6px"><button type="button" class="btn danger" data-act="logout">${ic('logout', 'sm')}Log out</button></div>
        <p class="mute sm" style="margin-top:14px">Data lives only in this browser. <a class="link sm" href="#/about">What is simulated?</a> · <button type="button" class="link sm" data-act="resetdemo">Reset demo data</button></p></section>
    </div>
  </div>`
}

export const routes = { dashboard: pageDashboard, notifications: pageNotifs, impact: pageImpact, profile: pageProfile }
export const actions = {
  ntab: (el) => { ntab = el.dataset.t; app.render() },
  notif: (el) => { $('#npop')?.classList.remove('open'); openNotif(el.dataset.id) },
  readall: () => { myNotifs().forEach((n) => (n.unread = false)); save(); app.refreshChrome(); if (location.hash.startsWith('#/notifications')) app.render(); else $('#npop')?.classList.remove('open') },
  logout: () => logout(),
  onboardoff: () => { me().onboard = false; save(); app.render() },
  resetdemo: () => confirmDlg({ title: 'Reset demo data?', body: '<p>All prototype records in this browser, including accounts you registered, return to the original sample data and you will be logged out.</p>', ok: 'Reset', cls: 'danger', onOk: () => { resetAll(); Object.keys(FORMS).forEach((k) => delete FORMS[k]); location.hash = '#/login'; app.render() } }),
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
    if (Object.keys(er).length) return app.render(), focusErr(), true
    const moved = f.loc !== u.loc
    Object.assign(u, { name: f.name.trim(), email: f.email.trim().toLowerCase(), loc: f.loc })
    if (u.role === 'retailer') {
      s.name = f.store.trim(); s.area = f.address.trim()
      if (moved) { const loc = LOCATIONS.find((l) => l.id === f.loc); s.x = loc.x + 0.3; s.y = loc.y + 0.2 }
    } else s.name = u.name
    S.buyerLoc = null
    save(); toast(u.role === 'retailer' ? 'Profile saved – existing reservations keep their original name and address' : 'Profile saved'); app.refreshChrome(); app.render()
    return true
  }
  if (id === 'f-pw') {
    const u = me(), er = {}
    if (f.cur !== u.pw) er.cur = 'Current password is incorrect.'
    if (f.npw.length < 8) er.npw = 'Use at least 8 characters.'
    f.err = er
    if (Object.keys(er).length) return app.render(), focusErr(), true
    u.pw = f.npw; f.cur = ''; f.npw = ''; save(); toast('Password changed'); app.render()
    return true
  }
  return false
}
