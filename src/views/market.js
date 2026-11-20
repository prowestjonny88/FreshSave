// Module B – marketplace browsing, search, filters, product detail, seller profile and contact panel.
import {
  S, save, $, esc, ic, rm, catLabel, CATEGORIES, RESCUE_CATS, LOCATIONS, toast, go, app, route, me, getL, getSeller, buyerLoc, dist, distTo, disc, km,
  daysLeft, imgs, isLive, browsable, expShort, expLong, fmtDate, fmtShort, ago, card, mini, avatar, empty, openModal, closeModal, confirmDlg,
  R_LABEL, R_CLS, OPEN, avail, ledger, lifecycle, LIFE, sellerUser, plural, sellerTag, illustrative, dateWord, whenShort, timeLeft, deadlineTs, fmtTime, POLICY, reserveError,
  disclose, todayActions, isRetailer, todayIso, iso, daysTo, resLabel, EXP_TYPES, ELIGIBILITY, sp,
} from '../core.js'
import { reserve } from './reservations.js'
import { photo } from '../data.js'

export const DEF_F = () => ({ q: '', cats: [], dist: 5, min: '', max: '', exp: 'all', sort: 'near', types: [], collect: 'all' })
export let F = DEF_F()
let listMode = false
let gal = 0, qty = 1, lastItem = ''

/* ---------------- Search ---------------- */
function matches(l, q) {
  q = q.trim().toLowerCase()
  if (!q) return true
  const hay = `${l.name} ${catLabel(l.cat)} ${getSeller(l.seller).name} ${l.desc}`.toLowerCase()
  return q.split(/\s+/).every((w) => hay.includes(w))
}
// Suggestions respect the distance filter so they never offer things the results would hide.
const nearPool = () => browsable().filter((l) => F.dist === 'all' || dist(l) <= F.dist)
export function renderDrop() {
  const v = $('#q').value.trim(), dd = $('#sdrop'), pool = nearPool()
  let h = ''
  if (!v) {
    if (S.recent.length) h += `<h6>Recent searches <button data-act="clearrecent">Clear</button></h6>` + S.recent.map((r) => `<button class="row" data-act="dosearch" data-q="${esc(r)}">${ic('history', 'sm')}${esc(r)}</button>`).join('')
    h += `<h6>Browse by category</h6>` + CATEGORIES.slice(1).filter((c) => RESCUE_CATS.includes(c.id)).map((c) => `<button class="row" data-act="cat" data-id="${c.id}">${ic(c.icon, 'sm')}${c.label}<small>${pool.filter((l) => l.cat === c.id).length} listings</small></button>`).join('')
  } else {
    const ps = pool.filter((l) => matches(l, v)).slice(0, 5)
    const cs = CATEGORIES.slice(1).filter((c) => RESCUE_CATS.includes(c.id) && c.label.toLowerCase().includes(v.toLowerCase()))
    h += `<button class="row" data-act="dosearch" data-q="${esc(v)}">${ic('search', 'sm')}Search “${esc(v)}”</button>`
    if (cs.length) h += `<h6>Categories</h6>` + cs.map((c) => `<button class="row" data-act="cat" data-id="${c.id}">${ic(c.icon, 'sm')}${c.label}</button>`).join('')
    if (ps.length) h += `<h6>Products ${F.dist === 'all' ? '' : `within ~${F.dist} km`}</h6>` + ps.map((l) => `<button class="row" data-act="goto" data-href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt="">${esc(l.name)}<small>${rm(l.price)} · ${km(l)}</small></button>`).join('')
    if (!ps.length && !cs.length) h += `<div class="mute sm" style="padding:8px 14px 10px">No matching listings${F.dist === 'all' ? '' : ` within ~${F.dist} km`} – press Enter to search with your current filters.</div>`
  }
  dd.innerHTML = h
  dd.classList.add('open')
}
export function doSearch(q) {
  q = q.trim()
  F.q = q
  if (q) S.recent = [q, ...S.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6)
  save()
  $('#q').value = q
  $('#sdrop').classList.remove('open')
  $('#q').blur()
  listMode = true
  toMarket()
}
function toMarket() {
  if (route().parts[0] !== 'market') location.hash = '#/market'
  else { refresh(true); app.refreshChrome(); window.scrollTo(0, 0) }
}

/* ---------------- Browse ---------------- */
function collectOk(l) {
  if (F.collect === 'all') return true
  const d = daysTo(iso(new Date(deadlineTs(l))))
  return F.collect === 'today' ? d <= 0 : d <= 2
}
function filtered() {
  let xs = browsable().filter((l) => matches(l, F.q))
  if (F.cats.length) xs = xs.filter((l) => F.cats.includes(l.cat))
  if (F.dist !== 'all') xs = xs.filter((l) => dist(l) <= F.dist)
  if (F.min !== '') xs = xs.filter((l) => l.price >= +F.min)
  if (F.max !== '') xs = xs.filter((l) => l.price <= +F.max)
  if (F.exp !== 'all') xs = xs.filter((l) => daysLeft(l) <= +F.exp)
  if (F.types.length) xs = xs.filter((l) => F.types.includes(l.expiryType))
  xs = xs.filter(collectOk)
  const s = { near: (a, b) => dist(a) - dist(b), low: (a, b) => a.price - b.price, disc: (a, b) => disc(b) - disc(a), new: (a, b) => b.postedAt - a.postedAt, exp: (a, b) => daysLeft(a) - daysLeft(b) || dist(a) - dist(b), collect: (a, b) => deadlineTs(a) - deadlineTs(b) }[F.sort]
  return xs.sort(s)
}
function filtersHtml() {
  const r = (name, val, label) => `<label class="rad"><input type="radio" name="f-${name}" data-f="${name}" value="${val}" ${String(F[name]) === String(val) ? 'checked' : ''}>${label}</label>`
  const pr = [['', '5', 'Under RM5'], ['5', '10', 'RM5 – RM10'], ['10', '20', 'RM10 – RM20'], ['20', '', 'RM20+']]
  const moreOpen = F.exp !== 'all' || F.types.length || F.min !== '' || F.max !== ''
  // Category, area and distance already live in the top bar, so this panel keeps only what is not one tap away.
  return `<div class="fgrp fhead"><b>Filters</b><button class="link sm" data-act="freset">Reset filters</button><button class="hbtn mobile-only" data-act="closefilters" aria-label="Close filters">${ic('x')}</button></div>
  <div class="fgrp"><h4>Collect by</h4>${r('collect', 'today', 'Today')}${r('collect', '2d', 'Within 2 days')}${r('collect', 'all', 'Any time')}</div>
  ${disclose('More filters <span class="mute">· date, price</span>', `<h4>Date type</h4>${EXP_TYPES.map((t) => `<label class="chk"><input type="checkbox" data-f="types" value="${t.id}" ${F.types.includes(t.id) ? 'checked' : ''}>${t.label}</label>`).join('')}
    <h4 style="margin-top:12px">Date on pack</h4>${r('exp', 3, 'Within 3 days (incl. today)')}${r('exp', 7, 'Within 7 days (incl. today)')}${r('exp', 'all', 'Any')}
    <h4 style="margin-top:12px">Price (RM)</h4><div class="pricefields"><label><span>Min</span><input type="number" min="0" step="0.5" data-f="min" value="${F.min}" aria-label="Minimum price"></label>–<label><span>Max</span><input type="number" min="0" step="0.5" data-f="max" value="${F.max}" aria-label="Maximum price"></label></div>
    <div class="pills">${pr.map(([a, b, t]) => `<button class="pill ${F.min === a && F.max === b ? 'on' : ''}" data-act="price" data-min="${a}" data-max="${b}">${t}</button>`).join('')}</div>`, { open: !!moreOpen, cls: 'flat' })}
  <div class="fgrp mobile-only"><button class="btn block" data-act="closefilters">Show ${filtered().length} results</button></div>`
}
function resultsHtml() {
  const xs = filtered(), loc = buyerLoc(), tags = []
  if (F.q) tags.push(['q', `“${esc(F.q)}”`])
  F.cats.forEach((c) => tags.push(['cat:' + c, catLabel(c)]))
  tags.push(['dist', F.dist === 'all' ? 'Any distance' : `Within ~${F.dist} km`])
  if (F.min !== '' || F.max !== '') tags.push(['price', F.min !== '' && F.max !== '' ? `RM${F.min} – RM${F.max}` : F.min !== '' ? `From RM${F.min}` : `Up to RM${F.max}`])
  if (F.exp !== 'all') tags.push(['exp', `Date within ${F.exp} days`])
  F.types.forEach((t) => tags.push(['type:' + t, dateWord(t)]))
  if (F.collect !== 'all') tags.push(['collect', F.collect === 'today' ? 'Collect today' : 'Collect within 2 days'])
  const sorts = [['near', 'Nearest first (approx.)'], ['collect', 'Collect soonest'], ['low', 'Lowest price'], ['disc', 'Highest discount'], ['new', 'Newest listings'], ['exp', 'Date soonest']]
  const emp = empty('basket', 'No listings match right now.', `Nothing ${F.dist === 'all' ? '' : `within ~${F.dist} km of ${loc.short} `}matches these filters. Retailers in the pilot post surplus throughout the day.`,
    `${F.dist !== 'all' && F.dist < 10 ? `<button class="btn" data-act="setdist" data-v="10">Widen to ~10 km</button>` : ''}${F.dist !== 'all' ? `<button class="btn ${F.dist >= 10 ? '' : 'sec'}" data-act="setdist" data-v="all">Show all distances</button>` : ''}<button class="btn sec" data-act="freset">Reset filters</button>`)
  return `<div class="toolbar"><div class="count">${plural(xs.length, 'listing')} <span class="mute">near ${loc.short}</span></div>
    <button class="btn sec sm filter-toggle" data-act="openfilters">${ic('filter', 'sm')}Filters</button>
    <label class="mute sm" for="sort">Sort by</label><select class="sel" id="sort" data-f="sort">${sorts.map(([v, t]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div class="tags">${tags.map(([k, t]) => `<span class="tag">${t}${k === 'dist' && F.dist === 5 ? '' : `<button data-act="untag" data-k="${k}" aria-label="Remove filter">${ic('x', 'xs')}</button>`}</span>`).join('')}${tags.length > 1 || F.dist !== 5 ? `<button class="link sm" data-act="freset">Reset filters</button>` : ''}</div>
  ${xs.length ? `<div class="grid">${xs.map((l) => card(l)).join('')}</div>` : emp}`
}
export function resetBrowse() { F = DEF_F(); listMode = false; const q = $('#q'); if (q) q.value = '' }
const isHome = () => !listMode && !F.q && !F.cats.length && F.min === '' && F.max === '' && F.exp === 'all' && F.sort === 'near' && !F.types.length && F.collect === 'all'
const distWord = () => (F.dist === 'all' ? 'any distance' : `~${F.dist} km`)

// One slim line: the most urgent task and a link to Today. The full list lives on Today, not here.
function actionStrip() {
  const xs = todayActions()
  if (!xs.length) return ''
  const a = xs[0]
  return `<section class="strip-act"><div class="wrap"><span class="kicker">Needs you today</span><a class="sa ${a.tone}" href="${a.href}">${ic(a.icon, 'sm')}<span><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></span>${ic('cr', 'xs')}</a>${xs.length > 1 ? `<a class="link sm" href="#/dashboard">+${xs.length - 1} more on Today</a>` : ''}</div></section>`
}
function homeHtml() {
  const loc = buyerLoc()
  const pool = nearPool()
  if (!pool.length) {
    return `${actionStrip()}<div class="wrap" style="padding-top:28px">${empty('basket', 'No listings found nearby.', `Nothing within ${distWord()} of ${loc.short} right now. Retailers in the pilot post surplus throughout the day.`,
      `${F.dist !== 'all' && F.dist < 10 ? `<button class="btn" data-act="setdist" data-v="10">Widen to ~10 km</button>` : ''}<button class="btn ${F.dist === 'all' ? '' : 'sec'}" data-act="setdist" data-v="all">Show all distances</button>`)}</div>`
  }
  const near = [...pool].sort((a, b) => dist(a) - dist(b))
  // One calm intro, then the listings. Pickup rules sit in a collapsed section; the safety note stays visible.
  return `${actionStrip()}<section class="hero compact"><div class="wrap hero-in">
      <div class="hero-t"><span class="eyebrow">${ic('leaf', 'xs')}Rescue · pilot with sample sellers</span>
        <h1>Sealed pantry food, collected near you.</h1>
        <p>Reserve online, collect in person, pay at pickup. ${pool.length} ${pool.length === 1 ? 'listing' : 'listings'} within ${distWord()} (approx.).</p></div>
    </div></section>
  <section class="band"><div class="wrap">
    <div class="sec-h"><div><h2>Near ${esc(loc.short)}</h2><p>${ic('pin', 'xs')}Nearest first · distances are approximate</p></div><span class="sec-links"><button class="link" data-act="seeall" data-sort="collect">Collect soonest first</button><button class="link" data-act="seeall">See all ${plural(pool.length, 'listing')} ${ic('arrow', 'xs')}</button></span></div>
    <div class="grid">${near.slice(0, 8).map((l) => card(l)).join('')}</div></div></section>
  <section class="band alt"><div class="wrap">
    ${disclose('How pickup works', `<ol class="how"><li><b>1</b><div><h3>Reserve</h3><p>Choose a quantity. Nothing is charged online.</p></div></li><li><b>2</b><div><h3>Seller accepts</h3><p>Within ${POLICY.respondH} hours, or the request lapses and units are released.</p></div></li><li><b>3</b><div><h3>Collect &amp; pay</h3><p>Before the deadline, show your 4-digit code and pay the seller in person.</p></div></li></ol>`, { cls: 'flat' })}
    <p class="rescue-note">${ic('shield', 'xs')}Sellers declare the food is sealed and room-temperature safe. FreshSave doesn't inspect it – check the pack at pickup.</p></div></section>`
}
function pageMarket() {
  if (isHome()) return `<div id="home">${homeHtml()}</div>`
  return `<div class="wrap"><section class="browse">
    <aside class="filters" id="filters" aria-label="Filters">${filtersHtml()}</aside><div class="scrim" id="scrim" data-act="closefilters"></div>
    <div id="results">${resultsHtml()}</div>
  </section></div>`
}
export function refresh(side) {
  if (route().parts[0] === 'market' && (isHome() || !$('#results'))) return void app.render()
  const r = $('#results')
  if (!r) return
  r.innerHTML = resultsHtml()
  if (side) $('#filters').innerHTML = filtersHtml()
  else { const b = $('#filters .mobile-only .btn'); if (b) b.textContent = `Show ${filtered().length} results` }
  const d = $('#hdr-dist'); if (d) d.value = String(F.dist)
}

/* ---------------- Location (buyer location is temporary, filtering only) ---------------- */
export function locModal() {
  const cur = buyerLoc().id
  openModal(`<h3>Choose your area</h3><p class="mute">Used only to sort and filter listings during this session. Distances are <b>estimates</b> between sample neighbourhood points, not between you and the shop. Sellers' pickup addresses never change.</p>
  <button class="btn sec block" style="margin-top:14px" data-act="geo">${ic('target', 'sm')}Find the nearest area to me</button>
  <div class="loclist">${LOCATIONS.map((l) => `<button class="${l.id === cur ? 'on' : ''}" data-act="setloc" data-id="${l.id}"><b>${l.short}</b><small>${l.name}</small></button>`).join('')}</div>
  <div class="macts"><button class="btn sec" data-act="mclose">Close</button></div>`, 'wide')
}
function setLoc(id, msg) { S.buyerLoc = id; save(); closeModal(); toast(msg || `Showing listings near ${buyerLoc().short}`, 'pin'); app.refreshChrome(); app.render() }
function useGeo() {
  closeModal()
  if (!navigator.geolocation) { toast('Location unavailable – choose an area', 'alert'); return locModal() }
  toast('Checking your location once…', 'target')
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    let best = LOCATIONS[0], bd = Infinity
    LOCATIONS.forEach((l) => { const d = Math.hypot(l.ll[0] - coords.latitude, l.ll[1] - coords.longitude); if (d < bd) { bd = d; best = l } })
    setLoc(best.id, `Nearest sample area: ${best.short} (your exact position is not used or stored)`)
  }, () => { toast("Couldn't access your location – choose an area", 'alert'); locModal() }, { timeout: 8000, maximumAge: 600000 })
}

/* ---------------- Product detail ---------------- */
const STATE_MSG = { awaiting: 'This listing is not available yet.', reserved: 'All units are currently reserved. If a reservation lapses, units may come back.', ended: 'The collection window for this listing has ended.', completed: 'All units have been handed over.', closed: 'This listing has been closed by the seller.', removed: 'This listing has been removed.' }
function pageItem(id) {
  const l = getL(id)
  if (!l || l.status === 'removed') return empty('info', 'Listing not available', 'It may have been removed.', '<a class="btn" href="#/market">Back to marketplace</a>')
  if (lastItem !== id) { gal = 0; qty = 1; lastItem = id }
  const s = getSeller(l.seller), im = imgs(l), g = Math.min(gal, im.length - 1), d = daysLeft(l)
  const mine = l.seller === me().sellerId, k = lifecycle(l), a = avail(l)
  const myRes = S.reservations.filter((r) => r.buyerId === me().id && r.listingId === l.id && OPEN.includes(r.status))
  const live = k === 'live'
  qty = Math.min(Math.max(1, qty), Math.max(1, a))
  const err = live && !mine ? reserveError(l, qty) : ''
  const more = S.listings.filter((x) => x.seller === l.seller && x.id !== l.id && isLive(x)).slice(0, 4)
  const similar = browsable().filter((x) => x.cat === l.cat && x.id !== l.id && x.seller !== l.seller).sort((a2, b2) => dist(a2) - dist(b2)).slice(0, 4)
  const have = !isRetailer() && S.inventory.find((i) => i.owner === me().id && i.status === 'active' && l.name.toLowerCase().split(/\s+/).slice(0, 2).join(' ') === i.name.toLowerCase().split(/\s+/).slice(0, 2).join(' '))
  const dl = deadlineTs(l)
  const resBox = mine
    ? `<div class="note warn">${ic('info', 'sm')}<span>This is your listing (${a} available, ${ledger(l).held} held). Manage it in <a class="link" href="#/listings">Listings</a>.</span></div>`
    : !live ? `<div class="note warn">${ic('info', 'sm')}<span>${STATE_MSG[k] || 'Not available.'}</span></div>`
    : `${have ? `<div class="note">${ic('box', 'sm')}<span>You already track <b>${esc(have.name)}</b> in My food (${have.qty} left, ${expLong(have.expiry).toLowerCase()}).</span></div>` : ''}
        <div class="resv-row"><div><b>Quantity</b><div class="mute sm">${a} available</div></div>
        <div class="qty"><button data-act="qty" data-d="-1" aria-label="Decrease quantity">${ic('minus', 'sm')}</button><b id="qtyv" aria-live="polite">${qty}</b><button data-act="qty" data-d="1" aria-label="Increase quantity">${ic('plus', 'sm')}</button></div></div>
        <dl class="deflist tight"><dt>Collect by</dt><dd><b>${whenShort(dl)}</b><br><span class="mute sm">${fmtTime(l.pickFrom)}–${fmtTime(l.pickTo)} daily · ${timeLeft(dl)}</span></dd><dt>Pickup</dt><dd><b>${esc(s.name)}</b><br>${esc(s.area)}</dd><dt>Instructions</dt><dd>${esc(l.instr)}</dd></dl>
        <div class="total"><span>Total <span class="mute sm">· pay in person at pickup</span></span><b id="totv">${rm(l.price * qty)}</b></div>
        ${err ? `<div class="note warn">${ic('alert', 'sm')}<span>${esc(err)}</span></div>` : ''}
        <button class="btn block sage" data-act="reserve" data-id="${l.id}" ${err ? 'disabled' : ''}>Reserve</button>
        <p class="mute sm center" style="margin-top:8px">Free to request. The seller has ${POLICY.respondH} hours to accept. No online payment or delivery.</p>`
  const decl = ELIGIBILITY.find((e) => e.id === l.pack)
  return `<div class="crumbs"><a href="#/market">Rescue</a>${ic('cr', 'xs')}<a href="#/market" data-act="cat" data-id="${l.cat}">${catLabel(l.cat)}</a>${ic('cr', 'xs')}<span>${esc(l.name)}</span></div>
  <div class="detail">
    <div>
      <div class="gal-main"><img src="${im[g]}" alt="${esc(l.name)}">
        ${im.length > 1 ? `<button class="gal-nav l" data-act="gal" data-i="${(g - 1 + im.length) % im.length}" aria-label="Previous image">${ic('cl')}</button><button class="gal-nav r" data-act="gal" data-i="${(g + 1) % im.length}" aria-label="Next image">${ic('cr')}</button>` : ''}
        ${disc(l) ? `<span class="badge lg">-${disc(l)}%</span>` : ''}${illustrative(l) ? '<span class="illus lg">Illustrative photo – not the actual item</span>' : ''}<span class="gal-count">${g + 1} / ${im.length}</span></div>
      ${im.length > 1 ? `<div class="thumbs">${im.map((src, i) => `<button class="${i === g ? 'on' : ''}" data-act="gal" data-i="${i}" aria-label="Image ${i + 1}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
      <div class="box" style="margin-top:18px"><h3>Description</h3><p class="char">${esc(l.desc)}</p>
        <dl class="deflist" style="margin-bottom:0"><dt>Category</dt><dd>${catLabel(l.cat)}</dd><dt>Listed</dt><dd>${ago(l.postedAt)}</dd></dl></div>
      <div class="box safety"><h3>${ic('shield', 'sm')}Date, storage &amp; safety</h3>
        <div class="datecard ${l.expiryType === 'use-by' ? 'use' : ''}"><span class="dtype ${l.expiryType === 'use-by' ? 'use' : ''}">${dateWord(l.expiryType)}</span><b class="${d <= 1 ? 'hot' : ''}">${fmtDate(l.expiry)}</b><span class="mute">· ${expLong(l.expiry)}</span>
          <p>${l.expiryType === 'use-by' ? '<b>Use by</b> is a safety date: do not eat the food after it. This item must be collected at least a day before.' : '<b>Best before</b> is a quality date: the food is usually still safe shortly after, but it may not be at its best.'}</p></div>
        <dl class="deflist" style="margin-bottom:0"><dt>Seller declared</dt><dd>${esc(decl?.label || 'Sealed packaged food')} ${sp('Not verified', 'y')}</dd></dl>
        <div class="note">${ic('info', 'sm')}<span>FreshSave does not inspect, test or certify food. The seller is responsible for what they hand over; you decide at pickup. Check the seal, the printed date and type, and the allergen label, and decline anything that looks different.</span></div></div>
    </div>
    <div>
      <h1 class="d-title">${esc(l.name)}</h1>
      <div class="d-price"><b>${rm(l.price)}</b><s>${rm(l.orig)}</s>${disc(l) ? `<em>-${disc(l)}%</em>` : ''}</div>
      <div class="facts"><div><small>${dateWord(l.expiryType)}</small><b class="${d <= 1 ? 'hot' : ''}">${expShort(l.expiry)}${d >= 0 && d <= 1 ? ', ' + fmtShort(l.expiry) : ''}</b></div><div><small>Available</small><b>${plural(a, 'unit')}</b></div><div><small>Collect by</small><b>${whenShort(dl)}</b></div></div>
      ${myRes.map((r) => `<div class="note" style="margin:0 0 14px">${ic('check', 'sm')}<span>You reserved ${r.qty} · <b>${resLabel(r)}</b> · <a class="link" href="#/reservation/${r.id}">View reservation</a></span></div>`).join('')}
      <div class="box"><h3>Reserve for pickup</h3>${resBox}</div>
      <div class="box"><h3>Seller</h3>
        <div class="seller">${avatar(s)}<div class="who"><b>${esc(s.name)}${sellerTag(s)}</b><span class="mute sm">${s.kind !== 'Individual' ? esc(s.kind) + ' · ' : ''}${esc(s.area)}</span><br><span class="mute sm">${ic('pin', 'xs')} ${km(l)} from ${buyerLoc().short} (approx.) · ${s.hours}</span></div></div>
        <div class="row-acts"><a class="btn sec sm" href="#/seller/${s.id}">${ic('store', 'sm')}Seller profile</a>${mine ? '' : `<button class="btn sec sm" data-act="chat" data-s="${s.id}" data-l="${l.id}">${ic('chat', 'sm')}Message (simulated)</button>`}</div></div>
    </div>
  </div>
  ${more.length ? `<section class="sect"><h2>More from ${esc(s.name)} <a class="link sm" href="#/seller/${s.id}">View all</a></h2><div class="grid">${more.map((x) => card(x)).join('')}</div></section>` : ''}
  ${similar.length ? `<section class="sect"><h2>Similar nearby</h2><div class="grid">${similar.map((x) => card(x)).join('')}</div></section>` : ''}`
}
function pageSeller(id) {
  const s = getSeller(id)
  if (!s) return empty('info', 'Seller not found', '', '<a class="btn" href="#/market">Back to marketplace</a>')
  const xs = S.listings.filter((l) => l.seller === id && isLive(l))
  // Only code-checked, non-sample handovers count; sample/simulated/disputed records are excluded.
  const done = S.reservations.filter((r) => r.status === 'completed' && !r.sample && !r.disputed && r.handover?.method === 'code' && r.terms.sellerId === id).length
  return `<div class="crumbs"><a href="#/market">Rescue</a>${ic('cr', 'xs')}<span>${esc(s.name)}</span></div>
  <div class="box sellerhead"><div class="seller">${avatar(s, 'lg')}
    <div class="who"><h1>${esc(s.name)}${sellerTag(s)}</h1><div class="mute">${ic('pin', 'xs')} ${s.role === 'individual' ? 'Pickup point shared on reservation' : esc(s.area)}</div><div class="mute sm">${s.kind !== 'Individual' ? esc(s.kind) + ' · ' : ''}${s.hours}${s.since && !s.sample ? ` · account since ${s.since}` : ''}</div></div>
    ${id === me().sellerId ? `<a class="btn sec" href="#/listings">Manage my listings</a>` : `<button class="btn sec" data-act="chat" data-s="${id}">${ic('chat', 'sm')}Message (simulated)</button>`}</div>
    <div class="kv"><div><small>Approx. distance from you</small><b>≈${distTo(id)} km</b></div><div><small>Live listings</small><b>${xs.length}</b></div><div><small>Code-checked handovers</small><b>${done}</b></div><div><small>Verification</small><b>${s.sample ? 'Fictional sample' : 'None'}</b></div></div>
    <p class="mute sm" style="margin-top:12px">${s.sample ? 'This seller is fictional sample data. ' : 'This seller has not been verified by FreshSave. '}Handover counts include only reservations completed in this browser with a matching pickup code.</p></div>
  <section class="sect"><h2>Available listings</h2>${xs.length ? `<div class="grid">${xs.map((l) => card(l)).join('')}</div>` : empty('basket', 'No live listings right now', 'Check back later.')}</section>`
}

/* ---------------- Contact seller (simulation) ---------------- */
let chat = null
const tkey = (sid) => `${me().id}:${sid}`
export function openChat(sid, lid) {
  const k = tkey(sid)
  if (!S.threads[k]) S.threads[k] = { sellerId: sid, listingId: lid || null, msgs: [], unread: 0 }
  if (lid) S.threads[k].listingId = lid
  S.threads[k].unread = 0
  chat = sid
  save(); app.refreshChrome(); renderDrawer()
  $('#drawer').classList.add('open')
  setTimeout(() => $('#cmsg')?.focus(), 30)
}
export function openInbox() { chat = null; renderDrawer(); $('#drawer').classList.add('open') }
const SIM = `<div class="simnote">${ic('info', 'xs')}<span>Simulated chat: messages stay in this browser and replies are automatic demo text – <b>no seller reads them</b>. For real pickups use the details on the reservation.</span></div>`
function renderDrawer() {
  const dr = $('#drawer')
  if (!chat) {
    const ts = Object.entries(S.threads).filter(([k, t]) => k.startsWith(me().id + ':') && t.msgs.length)
    dr.innerHTML = `<div class="dh"><div class="t"><b>Messages (simulated)</b><span class="mute sm">Demo only</span></div><button class="hbtn" data-act="dclose" aria-label="Close messages">${ic('x')}</button></div>${SIM}
    <div style="flex:1;overflow:auto">${ts.length ? ts.map(([, t]) => { const s = getSeller(t.sellerId), last = t.msgs[t.msgs.length - 1]; return `<button class="thread" data-act="chat" data-s="${s.id}">${avatar(s)}<div style="flex:1;min-width:0"><b>${esc(s.name)}</b><div class="mute sm ell">${last.from === 'me' ? 'You: ' : ''}${esc(last.text)}</div></div><small class="mute">${ago(last.at)}</small></button>` }).join('') : `<div class="mute" style="padding:40px 20px;text-align:center">No conversations yet. “Message” on a listing opens a simulated chat.</div>`}</div>`
    return
  }
  const s = getSeller(chat), t = S.threads[tkey(chat)], l = t.listingId && getL(t.listingId)
  const res = l && S.reservations.find((r) => r.buyerId === me().id && r.listingId === l.id && OPEN.includes(r.status))
  dr.innerHTML = `<div class="dh"><button class="hbtn" data-act="inbox" aria-label="Back to conversations">${ic('cl')}</button>${avatar(s, '')}<div class="t"><b>${esc(s.name)}</b><span class="mute sm">Simulated conversation</span></div><button class="hbtn" data-act="dclose" aria-label="Close messages">${ic('x')}</button></div>${SIM}
  ${l ? `<a class="chatctx" href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt=""><div style="flex:1;min-width:0"><b class="ell" style="display:block;font-weight:500">${esc(l.name)}</b><span>${rm(l.price)} · ${avail(l)} available</span></div>${res ? `<span class="sp ${R_CLS[res.status]}">${R_LABEL[res.status]}</span>` : ''}</a>` : ''}
  <div class="msgs" id="msgs">${t.msgs.length ? t.msgs.map((m) => `<div class="msg ${m.from === 'me' ? 'me' : ''}">${esc(m.text)}<small>${m.from === 'me' ? '' : 'Automatic demo reply · '}${new Date(m.at).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</small></div>`).join('') : `<div class="mute sm" style="text-align:center;margin:auto">Try a message to see how the chat would look.</div>`}</div>
  <div class="quick">${['Is this still available?', 'What time can I collect?', "I'm on my way to collect."].map((q) => `<button class="pill" data-act="quick" data-t="${esc(q)}">${esc(q)}</button>`).join('')}</div>
  <form class="cform" id="cform"><input id="cmsg" placeholder="Write a message…" autocomplete="off" aria-label="Message"><button class="btn" type="submit" aria-label="Send">${ic('send', 'sm')}</button></form>`
  const ms = $('#msgs'); ms.scrollTop = ms.scrollHeight
}
const AUTO = ['Demo reply: thanks for your message.', 'Demo reply: collection details are on your reservation.', 'Demo reply: noted.', 'Demo reply: see you at pickup.']
function sendMsg(text) {
  text = text.trim()
  if (!text || !chat) return
  const sid = chat, t = S.threads[tkey(sid)]
  t.msgs.push({ from: 'me', text, at: Date.now() })
  save(); renderDrawer()
  setTimeout(() => {
    t.msgs.push({ from: 'them', text: AUTO[(t.msgs.length / 2 | 0) % AUTO.length], at: Date.now() })
    if (chat !== sid || !$('#drawer').classList.contains('open')) t.unread = (t.unread || 0) + 1
    save(); app.refreshChrome()
    if (chat === sid) renderDrawer()
  }, 1400)
}

/* ---------------- Exports ---------------- */
export const routes = { market: pageMarket, item: (p) => pageItem(p[1]), seller: (p) => pageSeller(p[1]) }
export const actions = {
  loc: () => locModal(),
  setloc: (el) => setLoc(el.dataset.id),
  geo: () => useGeo(),
  cat: (el, e) => { e.preventDefault(); F.cats = el.dataset.id === 'all' ? [] : [el.dataset.id]; if (el.dataset.id === 'all') listMode = false; $('#sdrop').classList.remove('open'); toMarket() },
  dosearch: (el) => doSearch(el.dataset.q),
  clearrecent: () => { S.recent = []; save(); renderDrop() },
  goto: (el) => { $('#sdrop').classList.remove('open'); location.hash = el.dataset.href },
  freset: () => { const hadQ = F.q; F = DEF_F(); if (hadQ) $('#q').value = ''; refresh(true); app.refreshChrome() },
  setdist: (el) => { F.dist = el.dataset.v === 'all' ? 'all' : +el.dataset.v; refresh(true) },
  seeall: (el) => { F = { ...DEF_F(), dist: F.dist, sort: el.dataset.sort || 'near' }; listMode = true; app.render(); app.refreshChrome(); window.scrollTo(0, 0) },
  nearall: () => { F = { ...DEF_F(), sort: 'exp' }; listMode = true; app.render(); app.refreshChrome(); window.scrollTo(0, 0) },
  price: (el) => { const same = F.min === el.dataset.min && F.max === el.dataset.max; F.min = same ? '' : el.dataset.min; F.max = same ? '' : el.dataset.max; refresh(true) },
  untag: (el) => { const k = el.dataset.k; if (k === 'q') { F.q = ''; $('#q').value = '' } else if (k.startsWith('cat:')) F.cats = F.cats.filter((c) => c !== k.slice(4)); else if (k.startsWith('type:')) F.types = F.types.filter((c) => c !== k.slice(5)); else if (k === 'dist') F.dist = 5; else if (k === 'price') { F.min = ''; F.max = '' } else if (k === 'exp') F.exp = 'all'; else if (k === 'collect') F.collect = 'all'; refresh(true); app.refreshChrome() },
  openfilters: () => { $('#filters').classList.add('open'); $('#scrim').classList.add('open') },
  closefilters: () => { $('#filters')?.classList.remove('open'); $('#scrim')?.classList.remove('open') },
  gal: (el) => { gal = +el.dataset.i; app.render() },
  qty: (el) => { const l = getL(route().parts[1]); qty = Math.min(avail(l), Math.max(1, qty + +el.dataset.d)); app.render(); $(`[data-act=qty][data-d="${el.dataset.d}"]`)?.focus() },
  reserve: (el) => {
    const l = getL(el.dataset.id), n = qty, s = getSeller(l.seller)
    const err = reserveError(l, n)
    if (err) { toast(err, 'alert'); return app.render() }
    confirmDlg({ title: 'Request this reservation?', ok: 'Request reservation', cls: 'sage',
      body: `<div class="srow" style="margin:12px 0"><img src="${imgs(l)[0]}" alt=""><div><b>${esc(l.name)}</b><div class="mute sm">${n} x ${rm(l.price)} · ${esc(s.name)}</div></div></div>
      <dl class="deflist tight"><dt>Total</dt><dd><b>${rm(l.price * n)}</b> – paid in person</dd><dt>Date</dt><dd>${dateWord(l.expiryType)} ${fmtDate(l.expiry)}</dd><dt>Collect by</dt><dd>${whenShort(deadlineTs(l))}</dd><dt>Pickup</dt><dd>${esc(s.area)}</dd></dl>
      <ul class="plainlist"><li>The seller has ${POLICY.respondH} hours to accept. If they don't, the request expires – nothing is owed.</li><li>Once accepted you get a 4-digit pickup code. Units are held until the collect-by time, then released.</li><li>The price and details above are locked for this reservation.</li><li>The seller's food declarations are unverified – check the pack at pickup.</li></ul>`,
      onOk: () => { const res = reserve(l, n); if (res.error) { toast(res.error, 'alert'); return app.render() } qty = 1; app.refreshChrome(); go(`#/reservation/${res.r.id}`) } })
  },
  chat: (el) => openChat(el.dataset.s, el.dataset.l),
  inbox: () => openInbox(),
  dclose: () => { $('#drawer').classList.remove('open'); chat = null },
  quick: (el) => sendMsg(el.dataset.t),
}
export function change(e) {
  const t = e.target, f = t.dataset.f
  if (!f) {
    if (t.id === 'hdr-dist') { F.dist = t.value === 'all' ? 'all' : +t.value; if (route().parts[0] === 'market') refresh(true); else location.hash = '#/market'; return true }
    return false
  }
  if (f === 'dist') F.dist = t.value === 'all' ? 'all' : +t.value
  else if (f === 'exp') F.exp = t.value
  else if (f === 'collect') F.collect = t.value
  else if (f === 'sort') F.sort = t.value
  else if (f === 'cats') { F.cats = t.checked ? [...F.cats, t.value] : F.cats.filter((c) => c !== t.value); app.refreshChrome() }
  else if (f === 'types') F.types = t.checked ? [...F.types, t.value] : F.types.filter((c) => c !== t.value)
  else return true
  refresh(false)
  return true
}
export function input(e) {
  const t = e.target
  if (t.id === 'q') { renderDrop(); return true }
  if (t.dataset.f === 'min' || t.dataset.f === 'max') { F[t.dataset.f] = t.value; refresh(false); $$pills(); return true }
  return false
}
const $$pills = () => document.querySelectorAll('#filters [data-act=price]').forEach((b) => b.classList.toggle('on', F.min === b.dataset.min && F.max === b.dataset.max))
export function submit(e) {
  if (e.target.id === 'sform') { doSearch($('#q').value); return true }
  if (e.target.id === 'cform') { sendMsg($('#cmsg').value); return true }
  return false
}
export function keydown(e) {
  if (route().parts[0] !== 'item' || $('#ov').classList.contains('open') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  const l = getL(route().parts[1]); if (!l) return
  const n = imgs(l).length; gal = (Math.min(gal, n - 1) + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; app.render()
}
