// Module B – marketplace browsing, search, filters, product detail, seller profile and contact panel.
import {
  S, save, $, esc, ic, rm, catLabel, CATEGORIES, LOCATIONS, toast, go, app, route, me, getL, getSeller, buyerLoc, dist, distTo, disc,
  daysLeft, imgs, isLive, browsable, expShort, expLong, fmtDate, fmtShort, ago, card, mini, avatar, empty, openModal, closeModal, confirmDlg,
  R_LABEL, R_CLS, OPEN, reservedQty, sellerUser, plural,
} from '../core.js'
import { createReservation } from './reservations.js'
import { photo, CAT_KIND, ELIGIBILITY } from '../data.js'

export const DEF_F = () => ({ q: '', cats: [], dist: 5, min: '', max: '', exp: 'all', sort: 'near' })
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
export function renderDrop() {
  const v = $('#q').value.trim(), dd = $('#sdrop')
  let h = ''
  if (!v) {
    if (S.recent.length) h += `<h6>Recent searches <button data-act="clearrecent">Clear</button></h6>` + S.recent.map((r) => `<button class="row" data-act="dosearch" data-q="${esc(r)}">${ic('history', 'sm')}${esc(r)}</button>`).join('')
    h += `<h6>Search by category</h6>` + CATEGORIES.slice(1).map((c) => `<button class="row" data-act="cat" data-id="${c.id}">${ic(c.icon, 'sm')}${c.label}<small>${browsable().filter((l) => l.cat === c.id).length} listings</small></button>`).join('')
  } else {
    const ps = browsable().filter((l) => matches(l, v)).slice(0, 5)
    const cs = CATEGORIES.slice(1).filter((c) => c.label.toLowerCase().includes(v.toLowerCase()))
    h += `<button class="row" data-act="dosearch" data-q="${esc(v)}">${ic('search', 'sm')}Search “${esc(v)}”</button>`
    if (cs.length) h += `<h6>Categories</h6>` + cs.map((c) => `<button class="row" data-act="cat" data-id="${c.id}">${ic(c.icon, 'sm')}${c.label}</button>`).join('')
    if (ps.length) h += `<h6>Products</h6>` + ps.map((l) => `<button class="row" data-act="goto" data-href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt="">${esc(l.name)}<small>${rm(l.price)} · ${dist(l)} km</small></button>`).join('')
    if (!ps.length && !cs.length) h += `<div class="mute sm" style="padding:8px 14px 10px">No matching listings – press Enter to search everything.</div>`
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
  toMarket()
}
function toMarket() {
  if (route().parts[0] !== 'market') location.hash = '#/market'
  else { refresh(true); app.refreshChrome(); window.scrollTo(0, 0) }
}

/* ---------------- Browse ---------------- */
function filtered() {
  let xs = browsable().filter((l) => matches(l, F.q))
  if (F.cats.length) xs = xs.filter((l) => F.cats.includes(l.cat))
  if (F.dist !== 'all') xs = xs.filter((l) => dist(l) <= F.dist)
  if (F.min !== '') xs = xs.filter((l) => l.price >= +F.min)
  if (F.max !== '') xs = xs.filter((l) => l.price <= +F.max)
  if (F.exp !== 'all') xs = xs.filter((l) => daysLeft(l) <= +F.exp)
  const s = { near: (a, b) => dist(a) - dist(b), low: (a, b) => a.price - b.price, disc: (a, b) => disc(b) - disc(a), new: (a, b) => b.postedAt - a.postedAt, exp: (a, b) => daysLeft(a) - daysLeft(b) || dist(a) - dist(b) }[F.sort]
  return xs.sort(s)
}
function filtersHtml() {
  const loc = buyerLoc()
  const r = (name, val, label) => `<label class="rad"><input type="radio" name="f-${name}" data-f="${name}" value="${val}" ${String(F[name]) === String(val) ? 'checked' : ''}>${label}</label>`
  const pr = [['', '5', 'Under RM5'], ['5', '10', 'RM5 – RM10'], ['10', '20', 'RM10 – RM20'], ['20', '', 'RM20+']]
  return `<div class="fgrp fhead"><b>Filters</b><button class="link sm" data-act="freset">Reset filters</button><button class="hbtn mobile-only" data-act="closefilters" aria-label="Close filters">${ic('x')}</button></div>
  <div class="fgrp"><h4>Your location</h4><div class="locline">${ic('pin', 'sm')}<span>${loc.name}</span></div>
    <div class="pills"><button class="pill" data-act="loc">Change</button><button class="pill" data-act="geo">${ic('target', 'xs')} Use current location</button></div></div>
  <div class="fgrp"><h4>Distance</h4>${r('dist', 2, 'Within 2 km')}${r('dist', 5, 'Within 5 km')}${r('dist', 10, 'Within 10 km')}${r('dist', 'all', 'Show all')}</div>
  <div class="fgrp"><h4>Category</h4>${CATEGORIES.slice(1).map((c) => `<label class="chk"><input type="checkbox" data-f="cats" value="${c.id}" ${F.cats.includes(c.id) ? 'checked' : ''}>${ic(c.icon, 'sm')}${c.label}</label>`).join('')}</div>
  <div class="fgrp"><h4>Price (RM)</h4><div class="pricefields"><label><span>Min</span><input type="number" min="0" step="0.5" data-f="min" value="${F.min}" aria-label="Minimum price"></label>–<label><span>Max</span><input type="number" min="0" step="0.5" data-f="max" value="${F.max}" aria-label="Maximum price"></label></div>
    <div class="pills">${pr.map(([a, b, t]) => `<button class="pill ${F.min === a && F.max === b ? 'on' : ''}" data-act="price" data-min="${a}" data-max="${b}">${t}</button>`).join('')}</div></div>
  <div class="fgrp"><h4>Expiry</h4>${r('exp', 3, 'Expiry within 3 days')}${r('exp', 7, 'Expiry within 7 days')}${r('exp', 'all', 'All available')}</div>
  <div class="fgrp mobile-only"><button class="btn block" data-act="closefilters">Show ${filtered().length} results</button></div>`
}
function resultsHtml() {
  const xs = filtered(), loc = buyerLoc(), tags = []
  if (F.q) tags.push(['q', `“${esc(F.q)}”`])
  F.cats.forEach((c) => tags.push(['cat:' + c, catLabel(c)]))
  tags.push(['dist', F.dist === 'all' ? 'Any distance' : `Within ${F.dist} km`])
  if (F.min !== '' || F.max !== '') tags.push(['price', F.min !== '' && F.max !== '' ? `RM${F.min} – RM${F.max}` : F.min !== '' ? `From RM${F.min}` : `Up to RM${F.max}`])
  if (F.exp !== 'all') tags.push(['exp', `Expiry within ${F.exp} days`])
  const sorts = [['near', 'Nearest first'], ['low', 'Lowest price'], ['disc', 'Highest discount'], ['new', 'Newest listings'], ['exp', 'Expiring soon']]
  const emp = empty('basket', 'No food rescue listings found nearby.', `Nothing ${F.dist === 'all' ? '' : `within ${F.dist} km of ${loc.short} `}matches your search right now. Sellers post new surplus food throughout the day.`,
    `${F.dist !== 'all' && F.dist < 10 ? `<button class="btn" data-act="setdist" data-v="10">Expand to 10 km</button>` : ''}${F.dist !== 'all' ? `<button class="btn ${F.dist >= 10 ? '' : 'sec'}" data-act="setdist" data-v="all">Show all distances</button>` : ''}<button class="btn sec" data-act="freset">Reset filters</button>`)
  return `<div class="toolbar"><div class="count">${plural(xs.length, 'listing')} <span class="mute">near ${loc.short}</span></div>
    <button class="btn sec sm filter-toggle" data-act="openfilters">${ic('filter', 'sm')}Filters</button>
    <label class="mute sm" for="sort">Sort by</label><select class="sel" id="sort" data-f="sort">${sorts.map(([v, t]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  <div class="tags">${tags.map(([k, t]) => `<span class="tag">${t}${k === 'dist' && F.dist === 5 ? '' : `<button data-act="untag" data-k="${k}" aria-label="Remove filter">${ic('x', 'xs')}</button>`}</span>`).join('')}${tags.length > 1 || F.dist !== 5 ? `<button class="link sm" data-act="freset">Reset filters</button>` : ''}</div>
  ${xs.length ? `<div class="grid">${xs.map((l) => card(l)).join('')}</div>` : emp}`
}
export function resetBrowse() { F = DEF_F(); listMode = false; const q = $('#q'); if (q) q.value = '' }
const isHome = () => !listMode && !F.q && !F.cats.length && F.min === '' && F.max === '' && F.exp === 'all' && F.sort === 'near'
const distWord = () => (F.dist === 'all' ? 'any distance' : `${F.dist} km`)

function homeHtml() {
  const loc = buyerLoc()
  const pool = browsable().filter((l) => F.dist === 'all' || dist(l) <= F.dist)
  if (!pool.length) {
    return `<div class="wrap" style="padding-top:28px">${empty('basket', 'No food rescue listings found nearby.', `Nothing within ${distWord()} of ${loc.short} right now. Sellers post new surplus food throughout the day.`,
      `${F.dist !== 'all' && F.dist < 10 ? `<button class="btn" data-act="setdist" data-v="10">Expand to 10 km</button>` : ''}<button class="btn ${F.dist === 'all' ? '' : 'sec'}" data-act="setdist" data-v="all">Show all distances</button>`)}</div>`
  }
  const near = [...pool].sort((a, b) => dist(a) - dist(b))
  const soon = pool.filter((l) => daysLeft(l) <= 2).sort((a, b) => daysLeft(a) - daysLeft(b) || dist(a) - dist(b)).slice(0, 6)
  const recent = [...pool].sort((a, b) => b.postedAt - a.postedAt).slice(0, 8)
  const top = pool.reduce((m, l) => Math.max(m, disc(l)), 0)
  const heroImgs = near.slice(0, 3).map((l) => imgs(l)[0])
  const tiles = CATEGORIES.slice(1).map((c) => {
    const xs = browsable().filter((l) => l.cat === c.id)
    return `<a class="ctile" href="#/market" data-act="cat" data-id="${c.id}"><img src="${xs[0] ? imgs(xs[0])[0] : photo(CAT_KIND[c.id], 0, 400)}" alt="" loading="lazy"><span><b>${c.label}</b><small>${plural(xs.length, 'listing')}</small></span></a>`
  }).join('')
  return `<section class="hero"><div class="wrap hero-in">
      <div class="hero-t"><span class="eyebrow">${ic('leaf', 'xs')}Food rescue marketplace</span>
        <h1>Good food, rescued at a better price.</h1>
        <p>Reserve discounted surplus food from shops and neighbours near ${esc(loc.short)}. Pay in person and collect from the seller's pickup location.</p>
        <div class="hero-acts"><button class="btn lg light" data-act="seeall">Browse Fresh Deals</button><a class="btn lg ghost" href="#/scan">${ic('camera', 'sm')}Scan my food</a></div>
        <ul class="hero-facts"><li><b>${pool.length}</b> deals within ${distWord()}</li>${top ? `<li>Up to <b>-${top}%</b> off</li>` : ''}<li>No delivery · Pay at pickup</li></ul></div>
      <div class="hero-img">${heroImgs.map((src, i) => `<img src="${src}" alt="" class="h${i}">`).join('')}${top ? `<span class="hero-badge">-${top}%</span>` : ''}</div>
    </div></section>
  <section class="band"><div class="wrap">
    <div class="sec-h"><div><h2>Fresh Deals Near You</h2><p>${ic('pin', 'xs')}Sorted by distance from ${esc(loc.short)}</p></div><button class="link" data-act="seeall">See all ${plural(pool.length, 'listing')} ${ic('arrow', 'xs')}</button></div>
    <div class="grid">${near.slice(0, 8).map((l) => card(l)).join('')}</div></div></section>
  ${soon.length ? `<section class="band alt"><div class="wrap">
    <div class="sec-h"><div><h2><span class="flame">${ic('clock', 'sm')}</span>Expiring Soon, Save More</h2><p>Within 2 days of expiry, so the freshest price cuts are here</p></div><button class="link" data-act="seeall" data-sort="exp">See all ${ic('arrow', 'xs')}</button></div>
    <div class="rail">${soon.map((l) => card(l)).join('')}</div></div></section>` : ''}
  <section class="band"><div class="wrap">
    <div class="sec-h"><div><h2>Popular Categories</h2></div></div>
    <div class="ctiles">${tiles}</div></div></section>
  <section class="band alt"><div class="wrap">
    <div class="sec-h"><div><h2>Recently Added</h2><p>The newest surplus food posted by sellers</p></div><button class="link" data-act="seeall" data-sort="new">See all ${ic('arrow', 'xs')}</button></div>
    <div class="grid">${recent.map((l) => card(l)).join('')}</div>
    <p class="rescue-note">${ic('leaf', 'xs')}Reserve online, pay in person and collect at the seller's pickup location. No delivery.</p></div></section>`
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
  openModal(`<h3>Choose your location</h3><p class="mute">Used only to filter listings by distance during this session. FreshSave doesn't track your location, and sellers' pickup locations never change.</p>
  <button class="btn sec block" style="margin-top:14px" data-act="geo">${ic('target', 'sm')}Use current location</button>
  <div class="loclist">${LOCATIONS.map((l) => `<button class="${l.id === cur ? 'on' : ''}" data-act="setloc" data-id="${l.id}"><b>${l.short}</b><small>${l.name}</small></button>`).join('')}</div>
  <div class="macts"><button class="btn sec" data-act="mclose">Close</button></div>`, 'wide')
}
function setLoc(id, msg) { S.buyerLoc = id; save(); closeModal(); toast(msg || `Showing listings near ${buyerLoc().short}`, 'pin'); app.refreshChrome(); app.render() }
function useGeo() {
  closeModal()
  if (!navigator.geolocation) { toast('Location unavailable – choose a neighbourhood', 'alert'); return locModal() }
  toast('Checking your location once…', 'target')
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    let best = LOCATIONS[0], bd = Infinity
    LOCATIONS.forEach((l) => { const d = Math.hypot(l.ll[0] - coords.latitude, l.ll[1] - coords.longitude); if (d < bd) { bd = d; best = l } })
    setLoc(best.id, `Using nearest neighbourhood: ${best.short}`)
  }, () => { toast("Couldn't access your location – choose a neighbourhood", 'alert'); locModal() }, { timeout: 8000, maximumAge: 600000 })
}

/* ---------------- Product detail ---------------- */
function pageItem(id) {
  const l = getL(id)
  if (!l || l.status === 'removed') return empty('info', 'Listing not available', 'It may have been removed or fully rescued.', '<a class="btn" href="#/market">Back to marketplace</a>')
  if (lastItem !== id) { gal = 0; qty = 1; lastItem = id }
  const s = getSeller(l.seller), im = imgs(l), g = Math.min(gal, im.length - 1), d = daysLeft(l)
  const mine = l.seller === me().sellerId
  const myRes = S.reservations.filter((r) => r.buyerId === me().id && r.listingId === l.id && OPEN.includes(r.status))
  const live = isLive(l) && l.qty > 0
  qty = Math.min(Math.max(1, qty), Math.max(1, l.qty))
  const more = S.listings.filter((x) => x.seller === l.seller && x.id !== l.id && isLive(x) && x.qty > 0).slice(0, 4)
  const similar = browsable().filter((x) => x.cat === l.cat && x.id !== l.id && x.seller !== l.seller).sort((a, b) => dist(a) - dist(b)).slice(0, 4)
  const resBox = mine
    ? `<div class="note warn">${ic('info', 'sm')}<span>This is your listing (${l.qty} available, ${reservedQty(l.id)} reserved). Manage it from <a class="link" href="#/listings">My Listings</a>.</span></div>`
    : !live ? `<div class="note warn">${ic('info', 'sm')}<span>${d < 0 ? 'This listing has expired.' : l.status !== 'active' ? 'This listing is not available for reservation yet.' : 'All units are currently reserved.'}</span></div>`
    : `<div class="resv-row"><div><b>Quantity</b><div class="mute sm">${l.qty} available</div></div>
        <div class="qty"><button data-act="qty" data-d="-1" aria-label="Decrease">${ic('minus', 'sm')}</button><b id="qtyv">${qty}</b><button data-act="qty" data-d="1" aria-label="Increase">${ic('plus', 'sm')}</button></div></div>
        <dl class="deflist tight"><dt>Pickup location</dt><dd><b>${esc(s.name)}</b><br>${esc(s.area)}</dd><dt>Pickup instructions</dt><dd>${esc(l.instr)}</dd></dl>
        <div class="total"><span>Total <span class="mute sm">· pay in person at pickup</span></span><b id="totv">${rm(l.price * qty)}</b></div>
        <button class="btn block sage" data-act="reserve" data-id="${l.id}">Reserve Now</button>
        <p class="mute sm center" style="margin-top:8px">No online payment or delivery. You pay the seller when you collect.</p>`
  return `<div class="crumbs"><a href="#/market">Marketplace</a>${ic('cr', 'xs')}<a href="#/market" data-act="cat" data-id="${l.cat}">${catLabel(l.cat)}</a>${ic('cr', 'xs')}<span>${esc(l.name)}</span></div>
  <div class="detail">
    <div>
      <div class="gal-main"><img src="${im[g]}" alt="${esc(l.name)}">
        ${im.length > 1 ? `<button class="gal-nav l" data-act="gal" data-i="${(g - 1 + im.length) % im.length}" aria-label="Previous image">${ic('cl')}</button><button class="gal-nav r" data-act="gal" data-i="${(g + 1) % im.length}" aria-label="Next image">${ic('cr')}</button>` : ''}
        ${disc(l) ? `<span class="badge lg">-${disc(l)}%</span>` : ''}<span class="gal-count">${g + 1} / ${im.length}</span></div>
      ${im.length > 1 ? `<div class="thumbs">${im.map((src, i) => `<button class="${i === g ? 'on' : ''}" data-act="gal" data-i="${i}" aria-label="Image ${i + 1}"><img src="${src}" alt=""></button>`).join('')}</div>` : ''}
      <div class="box" style="margin-top:18px"><h3>Description</h3><p class="char">${esc(l.desc)}</p>
        <dl class="deflist" style="margin-bottom:0"><dt>Category</dt><dd>${catLabel(l.cat)}</dd><dt>Expiry date</dt><dd>${fmtDate(l.expiry)}</dd><dt>Listed</dt><dd>${ago(l.postedAt)}</dd></dl></div>
      <div class="box safety"><h3>${ic('shield', 'sm')}Food safety &amp; expiry</h3>
        <dl class="deflist" style="margin-bottom:0"><dt>Condition</dt><dd>${esc(ELIGIBILITY.find((e) => e.id === l.pack)?.label || 'Packaged food')}</dd><dt>Expiry date</dt><dd><b class="${d <= 1 ? 'hot' : ''}">${fmtDate(l.expiry)}</b> · ${expLong(l.expiry)}</dd></dl>
        <div class="note">${ic('info', 'sm')}<span>Only sealed packaged food and sealed bakery products are listed. Check the packaging and printed date when you collect, and decline anything that looks damaged.</span></div></div>
    </div>
    <div>
      <h1 class="d-title">${esc(l.name)}</h1>
      <div class="d-price"><b>${rm(l.price)}</b><s>${rm(l.orig)}</s>${disc(l) ? `<em>-${disc(l)}%</em>` : ''}</div>
      <div class="facts"><div><small>Expires</small><b class="${d <= 1 ? 'hot' : ''}">${expShort(l.expiry)}${d >= 0 && d <= 1 ? ', ' + fmtShort(l.expiry) : ''}</b></div><div><small>Available</small><b>${plural(l.qty, 'unit')}</b></div><div><small>Distance</small><b>${dist(l)} km</b></div></div>
      ${myRes.map((r) => `<div class="note" style="margin:0 0 14px">${ic('check', 'sm')}<span>You reserved ${r.qty} · <b>${R_LABEL[r.status]}</b> · <a class="link" href="#/reservation/${r.id}">View reservation</a></span></div>`).join('')}
      <div class="box"><h3>Reserve for pickup</h3>${resBox}</div>
      <div class="box"><h3>Seller information</h3>
        <div class="seller">${avatar(s)}<div class="who"><b>${esc(s.name)}<span class="tagtype">${s.role === 'retailer' ? 'Retailer' : 'Individual'}</span></b><span class="mute sm">${s.kind !== 'Individual' ? esc(s.kind) + ' · ' : ''}${esc(s.area)}</span><br><span class="mute sm">${ic('pin', 'xs')} ${dist(l)} km from ${buyerLoc().short} · ${s.hours}</span></div></div>
        <div class="row-acts"><a class="btn sec sm" href="#/seller/${s.id}">${ic('store', 'sm')}View seller profile</a>${mine ? '' : `<button class="btn sec sm" data-act="chat" data-s="${s.id}" data-l="${l.id}">${ic('chat', 'sm')}Contact seller</button>`}</div></div>
    </div>
  </div>
  ${more.length ? `<section class="sect"><h2>Other listings from ${esc(s.name)} <a class="link sm" href="#/seller/${s.id}">View all</a></h2><div class="grid">${more.map((x) => card(x)).join('')}</div></section>` : ''}
  ${similar.length ? `<section class="sect"><h2>Similar food nearby</h2><div class="grid">${similar.map((x) => card(x)).join('')}</div></section>` : ''}`
}
function pageSeller(id) {
  const s = getSeller(id)
  if (!s) return empty('info', 'Seller not found', '', '<a class="btn" href="#/market">Back to marketplace</a>')
  const xs = S.listings.filter((l) => l.seller === id && isLive(l) && l.qty > 0)
  const done = S.reservations.filter((r) => r.status === 'completed' && getL(r.listingId)?.seller === id).length
  return `<div class="crumbs"><a href="#/market">Marketplace</a>${ic('cr', 'xs')}<span>${esc(s.name)}</span></div>
  <div class="box sellerhead"><div class="seller">${avatar(s, 'lg')}
    <div class="who"><h1>${esc(s.name)}<span class="tagtype">${s.role === 'retailer' ? 'Retailer' : 'Individual'}</span></h1><div class="mute">${ic('pin', 'xs')} ${esc(s.area)}</div><div class="mute sm">${s.kind !== 'Individual' ? esc(s.kind) + ' · ' : ''}${s.hours} · on FreshSave since ${s.since}</div></div>
    ${id === me().sellerId ? `<a class="btn sec" href="#/listings">Manage my listings</a>` : `<button class="btn sec" data-act="chat" data-s="${id}">${ic('chat', 'sm')}Contact seller</button>`}</div>
    <div class="kv"><div><small>Distance from you</small><b>${distTo(id)} km</b></div><div><small>Live listings</small><b>${xs.length}</b></div><div><small>Completed rescues on FreshSave</small><b>${done}</b></div><div><small>Pickup</small><b>Fixed location above</b></div></div></div>
  <section class="sect"><h2>Available listings</h2>${xs.length ? `<div class="grid">${xs.map((l) => card(l)).join('')}</div>` : empty('basket', 'No live listings right now', 'Check back later.')}</section>`
}

/* ---------------- Contact seller (simple conversation panel) ---------------- */
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
function renderDrawer() {
  const dr = $('#drawer')
  if (!chat) {
    const ts = Object.entries(S.threads).filter(([k, t]) => k.startsWith(me().id + ':') && t.msgs.length)
    dr.innerHTML = `<div class="dh"><div class="t"><b>Messages</b><span class="mute sm">Pickup arrangements with sellers</span></div><button class="hbtn" data-act="dclose" aria-label="Close">${ic('x')}</button></div>
    <div style="flex:1;overflow:auto">${ts.length ? ts.map(([, t]) => { const s = getSeller(t.sellerId), last = t.msgs[t.msgs.length - 1]; return `<button class="thread" data-act="chat" data-s="${s.id}">${avatar(s)}<div style="flex:1;min-width:0"><b>${esc(s.name)}</b><div class="mute sm ell">${last.from === 'me' ? 'You: ' : ''}${esc(last.text)}</div></div><small class="mute">${ago(last.at)}</small></button>` }).join('') : `<div class="mute" style="padding:40px 20px;text-align:center">No conversations yet. Use “Contact seller” on a listing to ask about pickup.</div>`}</div>`
    return
  }
  const s = getSeller(chat), t = S.threads[tkey(chat)], l = t.listingId && getL(t.listingId)
  const res = l && S.reservations.find((r) => r.buyerId === me().id && r.listingId === l.id && r.status !== 'cancelled')
  dr.innerHTML = `<div class="dh"><button class="hbtn" data-act="inbox" aria-label="Back">${ic('cl')}</button>${avatar(s, '')}<div class="t"><b>${esc(s.name)}</b><span class="mute sm">${s.role === 'retailer' ? 'Retailer' : 'Individual'} · ${esc(s.area)}</span></div><button class="hbtn" data-act="dclose" aria-label="Close">${ic('x')}</button></div>
  ${l ? `<a class="chatctx" href="#/item/${l.id}"><img src="${imgs(l)[0]}" alt=""><div style="flex:1;min-width:0"><b class="ell" style="display:block;font-weight:500">${esc(l.name)}</b><span>${rm(l.price)} · ${l.qty} available</span></div>${res ? `<span class="sp ${R_CLS[res.status]}">${R_LABEL[res.status]}</span>` : ''}</a>` : ''}
  <div class="msgs" id="msgs">${t.msgs.length ? t.msgs.map((m) => `<div class="msg ${m.from === 'me' ? 'me' : ''}">${esc(m.text)}<small>${new Date(m.at).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })}</small></div>`).join('') : `<div class="mute sm" style="text-align:center;margin:auto">Ask about pickup timing or the item's condition.</div>`}</div>
  <div class="quick">${['Is this still available?', 'What time can I collect?', "I'm on my way to collect."].map((q) => `<button class="pill" data-act="quick" data-t="${esc(q)}">${esc(q)}</button>`).join('')}</div>
  <form class="cform" id="cform"><input id="cmsg" placeholder="Write a message…" autocomplete="off" aria-label="Message"><button class="btn" type="submit" aria-label="Send">${ic('send', 'sm')}</button></form>
  <p class="mute sm" style="padding:0 16px 12px">Prototype: seller replies are simulated.</p>`
  const ms = $('#msgs'); ms.scrollTop = ms.scrollHeight
}
const AUTO = ['Hi! Yes, it is still available.', 'You can collect during our opening hours – just show your reservation code.', 'Noted, thank you.', 'See you soon!']
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
  untag: (el) => { const k = el.dataset.k; if (k === 'q') { F.q = ''; $('#q').value = '' } else if (k.startsWith('cat:')) F.cats = F.cats.filter((c) => c !== k.slice(4)); else if (k === 'dist') F.dist = 5; else if (k === 'price') { F.min = ''; F.max = '' } else if (k === 'exp') F.exp = 'all'; refresh(true); app.refreshChrome() },
  openfilters: () => { $('#filters').classList.add('open'); $('#scrim').classList.add('open') },
  closefilters: () => { $('#filters')?.classList.remove('open'); $('#scrim')?.classList.remove('open') },
  gal: (el) => { gal = +el.dataset.i; app.render() },
  qty: (el) => { const l = getL(route().parts[1]); qty = Math.min(l.qty, Math.max(1, qty + +el.dataset.d)); $('#qtyv').textContent = qty; $('#totv').textContent = rm(l.price * qty) },
  reserve: (el) => { const l = getL(el.dataset.id); const n = qty; const s = getSeller(l.seller)
    confirmDlg({ title: 'Confirm reservation', ok: 'Reserve now', cls: 'sage',
      body: `<div class="srow" style="margin:12px 0"><img src="${imgs(l)[0]}" alt=""><div><b>${esc(l.name)}</b><div class="mute sm">${n} x ${rm(l.price)} · ${esc(s.name)}</div></div></div>
      <dl class="deflist tight"><dt>Total</dt><dd><b>${rm(l.price * n)}</b> – paid in person at pickup</dd><dt>Pickup location</dt><dd>${esc(s.area)}</dd><dt>Expiry date</dt><dd>${fmtDate(l.expiry)}</dd></dl>
      <p class="mute sm">The seller will confirm your request. There is no delivery – you collect from the seller.</p>`,
      onOk: () => { const r = createReservation(l, n); qty = 1; go(`#/reservation/${r.id}`) } }) },
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
  else if (f === 'sort') F.sort = t.value
  else if (f === 'cats') { F.cats = t.checked ? [...F.cats, t.value] : F.cats.filter((c) => c !== t.value); app.refreshChrome() }
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
