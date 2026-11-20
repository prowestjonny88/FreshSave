// FreshSave – app shell, Track/Rescue navigation, router and global event delegation.
import './styles.css'
import { S, $, $$, esc, ic, CATEGORIES, RESCUE_CATS, app, route, me, isRetailer, mySeller, buyerLoc, myNotifs, ago, getL, daysTo, FORMS, HOOKS, closeModal, runOk, syncReminders, processExpiries, toast, initials, todayActions, isSellerOf, MIGRATED, POLICY } from './core.js'
import * as auth from './views/auth.js'
import * as tracking from './views/tracking.js'
import * as market from './views/market.js'
import * as listings from './views/listings.js'
import * as reservations from './views/reservations.js'
import * as account from './views/account.js'
import * as about from './views/about.js'

const MODS = [auth, tracking, market, listings, reservations, account, about]
const ROUTES = Object.assign({}, ...MODS.map((m) => m.routes))
const ACT = {}
MODS.forEach((m) => Object.entries(m.actions || {}).forEach(([k, f]) => { if (ACT[k]) console.warn('duplicate action', k); ACT[k] = f }))
const AUTH = ['login', 'register', 'forgot']
const RETAILER_ONLY = ['batches', 'batch', 'basket']
const INDIVIDUAL_ONLY = ['inventory']
const MARKET_PAGES = ['market', 'item', 'seller']
const landing = () => (isRetailer() ? '#/dashboard' : '#/market')

document.title = 'FreshSave – Track food expiry, rescue sealed surplus'
$('#root').innerHTML = `
<a class="skip" href="#main">Skip to main content</a>
<div id="auth-root" hidden></div>
<div class="app" id="app" hidden>
  <div class="protobar" role="note">${ic('info', 'xs')}<span><b>Prototype</b> · synthetic sample data<span class="pb-long"> · no real sellers, payments or notifications</span></span><a href="#/about">What is simulated?</a></div>
  <header class="hdr" id="hdr">
    <div class="hdr-top wrap">
      <a class="logo" id="logo" href="#/market" data-act="home" aria-label="FreshSave home"><i>${ic('leaf')}</i><span>Fresh<b>Save</b></span></a>
      <nav class="mnav" id="nav" aria-label="Main navigation"></nav>
      <div class="top-acts">
        <a class="btn sell-btn" id="cta" href="#/scan"></a>
        <button class="hbtn" data-act="inbox" title="Messages (simulated)" aria-label="Messages (simulated)">${ic('chat')}<span class="dot" id="mBadge" hidden></span></button>
        <div class="hwrap"><button class="hbtn" data-act="npop" title="Notifications" aria-label="Notifications" aria-haspopup="true">${ic('bell')}<span class="dot" id="nBadge" hidden></span></button><div class="pop" id="npop"></div></div>
        <div class="hwrap"><button class="hbtn prof" data-act="mpop" aria-label="Account menu" aria-haspopup="true"><span class="avatar" id="topav"></span><span class="pname" id="pname"></span>${ic('chevd', 'xs')}</button><div class="pop menu" id="mpop"></div></div>
      </div>
    </div>
    <div class="hdr-search" id="hsearch"><div class="wrap hs-in">
      <div class="searchbox" id="searchbox">
        <form id="sform" role="search">${ic('search', 'si')}<input id="q" autocomplete="off" placeholder="Search sealed food near you…" aria-label="Search listings"><button class="go" type="submit">Search</button></form>
        <div class="sdrop" id="sdrop"></div>
      </div>
      <div class="locgrp">
        <button class="hbtn locbtn" data-act="loc" title="Your area (used for sorting only; distances are approximate)">${ic('pin', 'sm')}<span class="lt"><small>Your area</small><span id="locName"></span></span>${ic('chevd', 'xs')}</button>
        <select class="sel distsel" id="hdr-dist" aria-label="Approximate distance"><option value="2">Within ~2 km</option><option value="5">Within ~5 km</option><option value="10">Within ~10 km</option><option value="all">Show all</option></select>
      </div>
    </div></div>
    <nav class="catbar" id="catbar" aria-label="Categories"><div class="cats wrap" id="cats"></div></nav>
  </header>
  <main id="main" tabindex="-1"></main>
  <footer class="foot"><div class="wrap"><span><b>FreshSave</b> · design prototype · reserve online, pay in person, collect at the seller · no delivery</span><a href="#/about">About this prototype</a></div></footer>
  <nav class="bnav" id="bnav" aria-label="Main navigation"></nav>
</div>
<div class="ov" id="ov"><div class="modal" id="modal" role="dialog" aria-modal="true"></div></div>
<aside class="drawer" id="drawer" aria-label="Messages (simulated)"></aside>
<div class="toasts" id="toasts" role="status" aria-live="polite"></div>`

/* ---------------- Chrome ---------------- */
function navItems() {
  const R = isRetailer(), u = me(), sid = u.sellerId
  const inv = S.inventory.filter((i) => i.owner === u.id && i.status === 'active' && daysTo(i.expiry) <= 1).length
  const buyerReady = S.reservations.filter((r) => r.buyerId === u.id && r.status === 'confirmed').length
  const pend = S.reservations.filter((r) => r.status === 'pending' && isSellerOf(r)).length
  const check = S.batches.filter((b) => b.owner === u.id && b.verify === 'unverified' && daysTo(b.expiry) >= 0 && daysTo(b.expiry) <= POLICY.soonDays).length
  const aw = S.listings.filter((l) => l.seller === sid && l.status === 'pending').length
  return R
    ? [{ id: 'dashboard', href: '#/dashboard', icon: 'home', label: 'Store today' }, { grp: 'Track' }, { id: 'batches', href: '#/batches', icon: 'layers', label: 'Stock', badge: check }, { grp: 'Rescue' }, { id: 'listings', href: '#/listings', icon: 'basket', label: 'Listings', badge: aw }, { id: 'reservations', href: '#/reservations', icon: 'receipt', label: 'Reservations', badge: pend }]
    : [{ id: 'dashboard', href: '#/dashboard', icon: 'home', label: 'Today' }, { grp: 'Track' }, { id: 'inventory', href: '#/inventory', icon: 'box', label: 'My food', badge: inv }, { grp: 'Rescue' }, { id: 'market', href: '#/market', icon: 'store', label: 'Find food' }, { id: 'reservations', href: '#/reservations', icon: 'receipt', label: 'Reservations', badge: buyerReady }]
}
const NAV_ALIAS = () => ({ item: 'market', seller: 'market', sell: 'listings', basket: 'listings', batch: 'batches', reservation: 'reservations', scan: isRetailer() ? 'batches' : 'inventory', barcode: isRetailer() ? 'batches' : 'inventory' })
function refreshChrome() {
  const u = me(); if (!u) return
  const p = route().parts[0], cur = NAV_ALIAS()[p] || p
  const items = navItems()
  let g = ''
  $('#nav').innerHTML = items.map((i) => { if (i.grp) { g = i.grp.toLowerCase(); return `<span class="ngrp g-${g}">${i.grp}</span>` } return `<a class="nav-i ${g === 'track' ? 'trk' : ''} ${cur === i.id ? 'on' : ''}" href="${i.href}" ${cur === i.id ? 'aria-current="page"' : ''}>${ic(i.icon, 'sm')}<span>${i.label}</span>${i.badge ? `<i aria-label="${i.badge} need attention">${i.badge}</i>` : ''}</a>` }).join('')
  $('#bnav').innerHTML = items.filter((i) => !i.grp).map((i) => `<a class="${cur === i.id ? 'on' : ''}" href="${i.href}" ${cur === i.id ? 'aria-current="page"' : ''}>${ic(i.icon)}<span>${i.label}</span>${i.badge ? `<i>${i.badge}</i>` : ''}</a>`).join('')
  const cta = $('#cta'); cta.href = '#/scan'; cta.setAttribute('aria-label', isRetailer() ? 'Add stock' : 'Add food'); cta.innerHTML = `${ic('camera', 'sm')}<span>${isRetailer() ? 'Add stock' : 'Add food'}</span>`
  $('#logo').href = landing()
  const s = mySeller()
  $('#pname').textContent = (isRetailer() ? s.name : u.name).split(/\s+/).slice(0, 2).join(' ')
  $('#topav').textContent = initials(isRetailer() ? s.name : u.name)
  $('#locName').textContent = buyerLoc().short
  $('#hdr-dist').value = String(market.F.dist)
  const n = myNotifs().filter((x) => x.unread).length, nb = $('#nBadge'); nb.hidden = !n; nb.textContent = n
  const m = Object.entries(S.threads).filter(([k]) => k.startsWith(u.id + ':')).reduce((a, [, t]) => a + (t.unread || 0), 0), mb = $('#mBadge'); mb.hidden = !m; mb.textContent = m
  const on = market.F.cats.length === 1 ? market.F.cats[0] : market.F.cats.length === 0 ? 'all' : ''
  $('#cats').innerHTML = CATEGORIES.filter((c) => c.id === 'all' || RESCUE_CATS.includes(c.id)).map((c) => `<button class="cat ${on === c.id ? 'on' : ''}" data-act="cat" data-id="${c.id}">${ic(c.icon)}${c.label}</button>`).join('')
  const mk = MARKET_PAGES.includes(p)
  $('#hsearch').hidden = !mk
  $('#catbar').hidden = p !== 'market'
  document.body.classList.toggle('has-bnav', true)
}

/* ---------------- Router ---------------- */
let lastPath = null
const TITLES = { market: 'Find food', item: 'Listing', seller: 'Seller', dashboard: 'Today', inventory: 'My food', batches: 'Stock', batch: 'Batch', listings: 'Listings', sell: 'Listing', basket: 'Clearance Basket', reservations: 'Reservations', reservation: 'Reservation', scan: 'Scan food', barcode: 'Barcode', notifications: 'Notifications', impact: 'Your activity', profile: 'Profile & settings', about: 'About this prototype' }
function render() {
  const { parts, q } = route()
  const p = parts[0]
  const u = me()
  if (!u && p === 'about') {
    $('#app').hidden = true; $('#auth-root').hidden = false
    $('#auth-root').innerHTML = `<div class="auth-plain"><header class="wrap"><a class="logo" href="#/login"><i>${ic('leaf')}</i><span>Fresh<b>Save</b></span></a><a class="link" href="#/login">${ic('cl', 'xs')} Back to log in</a></header><div class="wrap">${ROUTES.about()}</div></div>`
    return
  }
  if (!u && !AUTH.includes(p)) return void (location.hash = '#/login')
  if (u && (AUTH.includes(p) || p === '')) return void (location.hash = landing())
  if (u && RETAILER_ONLY.includes(p) && !isRetailer()) { toast('That page is for retailer accounts', 'info'); return void (location.hash = '#/inventory') }
  if (u && INDIVIDUAL_ONLY.includes(p) && isRetailer()) return void (location.hash = '#/batches')
  const path = location.hash.split('?')[0]
  const newPage = path !== lastPath
  if (newPage) { window.scrollTo(0, 0); closeModal() }
  lastPath = path
  if (!u) {
    $('#app').hidden = true; $('#auth-root').hidden = false
    $('#auth-root').innerHTML = ROUTES[p]()
    return
  }
  $('#auth-root').hidden = true; $('#app').hidden = false
  $('#auth-root').innerHTML = ''
  processExpiries()
  syncReminders()
  const fn = ROUTES[p]
  $('#main').innerHTML = fn ? fn(parts, q) || '' : `<div class="empty">${ic('info')}<h3>Page not found</h3><p>The page you're looking for doesn't exist.</p><div class="acts"><a class="btn" href="${landing()}">Go home</a></div></div>`
  $('#main').dataset.page = p
  $$('#main table.tbl:not(.plain)').forEach((t) => { const w = document.createElement('div'); w.className = 'tblwrap'; t.before(w); w.appendChild(t) })
  refreshChrome()
  if (newPage) { document.title = `${TITLES[p] || 'FreshSave'} – FreshSave`; $('#main').focus({ preventScroll: true }) }
}
app.render = render
app.refreshChrome = refreshChrome
window.addEventListener('hashchange', render)
// There is no server-side scheduler: reservation deadlines are enforced here while the app is open.
setInterval(() => {
  if (!me()) return
  const busy = $('#ov').classList.contains('open') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')
  if (processExpiries() && !busy) render(); else refreshChrome()
}, 60000)
document.addEventListener('visibilitychange', () => { if (!document.hidden && me() && processExpiries()) render() })

/* ---------------- Popovers ---------------- */
function closePops(except) { ['#npop', '#mpop'].forEach((s) => s !== except && $(s).classList.remove('open')) }
const N_ICON = { expiry: 'clock', expired: 'alert', stock: 'eye', resv: 'receipt', collect: 'check2' }
const CORE = {
  mclose: () => closeModal(),
  mok: () => runOk(),
  home: (el, e) => { market.resetBrowse(); if (location.hash.split('?')[0] === el.getAttribute('href').split('?')[0]) { e.preventDefault(); app.render() } },
  npop: () => {
    const p = $('#npop'); if (p.classList.contains('open')) return p.classList.remove('open')
    closePops('#npop')
    const xs = myNotifs().sort((a, b) => b.at - a.at).slice(0, 6)
    p.innerHTML = `<div class="ph">Notifications <button class="link sm" data-act="readall">Mark all read</button></div>${xs.map((n) => `<button class="pi ${n.unread ? 'unread' : ''}" data-act="notif" data-id="${n.id}">${ic(N_ICON[n.type] || 'bell', 'sm')}<div><b>${esc(n.text)}</b><small>${esc(n.sub)}</small><small>${ago(n.at)}</small></div>${n.unread ? '<i class="udot"></i>' : ''}</button>`).join('') || '<div class="mute" style="padding:20px">No notifications</div>'}<div class="pnote">In-app only – no push, SMS or email.</div><a class="pf" href="#/notifications">View all notifications</a>`
    p.classList.add('open')
  },
  mpop: () => {
    const p = $('#mpop'); if (p.classList.contains('open')) return p.classList.remove('open')
    closePops('#mpop')
    const u = me(), R = isRetailer()
    p.innerHTML = `<div class="ph col"><span>${esc(R ? mySeller().name : u.name)}</span><span class="mute sm">${esc(u.email)} · ${R ? 'Retailer' : 'Individual'}</span></div>
    ${[['#/profile', 'gear', 'Profile & settings'], ['#/notifications', 'bell', 'Notifications'], ['#/impact', 'chart', 'Your activity'], ...(R ? [['#/market', 'store', 'View marketplace'], ['#/basket', 'basket', 'Clearance Basket']] : []), ['#/about', 'info', 'About this prototype']].map(([h, i, t]) => `<a class="pi" href="${h}">${ic(i, 'sm')}${t}</a>`).join('')}
    <button class="pi sep" data-act="logout">${ic('logout', 'sm')}Log out</button>`
    p.classList.add('open')
  },
}
Object.assign(ACT, CORE)

/* ---------------- "More actions" menus ---------------- */
// The menu is position:fixed so scrollable table wrappers never clip it; place it under its button when it opens.
const closeMenus = (except) => $$('details.more[open]').forEach((d) => d !== except && d.removeAttribute('open'))
document.addEventListener('toggle', (e) => {
  const d = e.target
  if (!d.matches?.('details.more') || !d.open) return
  closeMenus(d)
  const m = d.querySelector('.more-m'), r = d.querySelector('summary').getBoundingClientRect()
  m.style.top = '0px'; m.style.left = '0px'
  const w = m.offsetWidth, h = m.offsetHeight
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px'
  m.style.top = (r.bottom + h + 8 > window.innerHeight && r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 6) + 'px'
}, true)
window.addEventListener('scroll', () => closeMenus(), { passive: true })
window.addEventListener('resize', () => closeMenus())

/* ---------------- Global events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]')
  if (!e.target.closest('.hwrap')) closePops()
  if (!e.target.closest('#searchbox')) $('#sdrop').classList.remove('open')
  if (e.target === $('#ov')) closeModal()
  if (e.target.closest('.pop a')) closePops()
  closeMenus(e.target.closest('.more-m') ? null : e.target.closest('details.more'))
  if (!el) return
  const f = ACT[el.dataset.act]
  if (f) f(el, e)
})
function bind(t) {
  const b = t.dataset?.b
  if (!b) return false
  const [f, k] = b.split('.')
  if (!FORMS[f]) return true
  FORMS[f][k] = t.type === 'checkbox' ? t.checked : t.value
  if (FORMS[f].err?.[k]) { delete FORMS[f].err[k]; t.closest('.fld,.chk')?.classList.remove('err'); t.removeAttribute('aria-invalid') }
  if (t.type === 'radio') t.closest('.seg-radio')?.querySelectorAll('label').forEach((l) => l.classList.toggle('on', l.contains($(`input:checked`, l))))
  HOOKS[f]?.(k)
  return true
}
document.addEventListener('input', (e) => { if (bind(e.target)) return; for (const m of MODS) if (m.input?.(e)) return })
document.addEventListener('change', (e) => { if (bind(e.target)) return; for (const m of MODS) if (m.change?.(e)) return })
document.addEventListener('submit', (e) => { e.preventDefault(); for (const m of MODS) if (m.submit?.(e)) return })
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenus(); closeModal(); closePops(); $('#sdrop').classList.remove('open'); $('#drawer').classList.remove('open') }
  // Keep keyboard focus inside an open dialog.
  if (e.key === 'Tab' && $('#ov').classList.contains('open')) {
    const f = $$('button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),a[href]', $('#modal')).filter((x) => x.offsetParent)
    if (f.length) { const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } }
  }
  market.keydown(e)
})
document.addEventListener('focusin', (e) => { if (e.target.id === 'q') market.renderDrop() })
// Fallback for images that fail to load (e.g. offline).
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f1f0ec"/><path d="M38 62c0-14 8-22 24-24-1 16-9 24-24 24z M38 62l12-12" fill="none" stroke="#a9a596" stroke-width="2.5" stroke-linecap="round"/></svg>')
document.addEventListener('error', (e) => { const t = e.target; if (t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = 1; t.src = FALLBACK } }, true)

reservations.resume()
render()
if (MIGRATED) toast('FreshSave was updated: sample data was refreshed (your registered accounts were kept).', 'info')
