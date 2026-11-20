// Seller listing creation, Listings management and the physical Clearance Basket workflow.
import {
  S, save, $, esc, ic, rm, catLabel, catOptions, toast, go, app, me, isRetailer, mySeller, getL, getB, imgs, thumb, disc, daysLeft, uid,
  todayIso, today0, iso, addDays, fmtDate, fmtDT, fmtShort, ago, card, sp, pageHead, empty, steps, confirmDlg, logAct, readImages,
  OPEN, FORMS, HOOKS, focusErr, fld, inp, sel, ta, chk, rmInp, eligFields, eligResult, eligibility, expTypeSel, plural, RESCUE_CATS, ELIGIBILITY,
  ledger, avail, lifecycle, LIFE, resFor, closeListing, listingLocks, batchListable, batchHanded, batchOnOffer, dateWord, whenShort, fmtTime, deadlineTs,
  defaultPickupUntil, lastPickupDay, pickupErrors, getSeller, POLICY, resLabel, resCls, moreMenu, disclose,
} from '../core.js'
import { CAT_KIND } from '../data.js'

const DEF_INSTR = 'Ask at the cashier for the FreshSave Clearance Basket and show your pickup code. Pay at the counter.'
const live = (l) => ['awaiting', 'live', 'reserved', 'ended'].includes(lifecycle(l))

/* Units bar: available | held | handed over | returned – the same four numbers everywhere. */
export function unitBar(l) {
  const g = ledger(l), t = Math.max(1, g.total)
  const seg = (n, c) => (n ? `<i class="${c}" style="flex:${n}"></i>` : '')
  return `<div class="units"><div class="ubar" role="img" aria-label="${g.avail} available, ${g.held} held, ${g.handed} handed over, ${g.withdrawn} returned of ${g.total} listed">${seg(g.avail, 'a')}${seg(g.held, 'h')}${seg(g.handed, 'd')}${seg(g.withdrawn, 'w')}</div>
  <span class="ulg"><b>${g.avail}</b> available · <b>${g.held}</b> held · <b>${g.handed}</b> handed over${g.withdrawn ? ` · ${g.withdrawn} returned` : ''}<span class="mute"> of ${g.total}</span></span></div>`
}

/* ---------------- Create / edit listing (retailers) ---------------- */
function newWiz(l, from) {
  if (l && !from) return { step: 0, edit: l.id, photos: [...(l.photos || [])], name: l.name, cat: l.cat, desc: l.desc, pack: l.pack || '', c1: true, c2: true, c3: true, orig: String(l.orig), price: String(l.price), qty: String(l.total), expiry: l.expiry, expiryType: l.expiryType || 'best-before', pickupUntil: l.pickupUntil, pickFrom: l.pickFrom || '10:00', pickTo: l.pickTo || '21:00', instr: l.instr, extra: false, err: {} }
  const s = mySeller(), base = { step: 0, photos: [], name: '', cat: '', desc: '', pack: '', c1: false, c2: false, c3: false, orig: '', price: '', qty: '1', expiry: '', expiryType: 'best-before', pickupUntil: '', pickFrom: '10:00', pickTo: '21:00', instr: s.defaultInstr || DEF_INSTR, extra: false, err: {} }
  if (l) return { ...base, from: l.id, photos: [...(l.photos || [])], name: l.name, cat: l.cat, desc: l.desc, pack: l.pack || '', orig: String(l.orig), price: String(l.price), pickFrom: l.pickFrom || '10:00', pickTo: l.pickTo || '21:00', instr: l.instr, expiryType: l.expiryType || 'best-before' }
  return base
}
const wzListing = () => { const w = FORMS.wz, l = w.edit && getL(w.edit); return { id: 'preview', name: w.name || 'Product name', cat: w.cat || 'pantry', kind: l?.kind || CAT_KIND[w.cat] || 'rice', seller: me().sellerId, orig: +w.orig || 0, price: +w.price || 0, total: +w.qty || 0, expiry: w.expiry || todayIso(), expiryType: w.expiryType, pickupUntil: w.pickupUntil, pickTo: w.pickTo, photos: w.photos } }
const maxTotal = (l) => { const b = getB(l.batchId); return b ? batchListable(b, l.id) + (l.withdrawn || 0) + ledger(l).handed : Infinity }
function pageSell(id, q) {
  if (!isRetailer()) return `${pageHead('Listing food', '', '', 'Rescue')}${empty('shield', 'Listing is for participating retailers in this pilot', "Household food is tracked in Track, but it can't be listed for resale here: its storage and handling can't be checked. Plan to use it in time, or share it directly with family and neighbours.", '<a class="btn" href="#/inventory">My food</a><a class="btn sec" href="#/market">Find food</a>')}`
  const from = q?.get('from')
  if (id) {
    const l = getL(id)
    if (!l || l.seller !== me().sellerId || !live(l)) return empty('info', 'Listing not found or already finished', '', '<a class="btn" href="#/listings">Listings</a>')
    if (!FORMS.wz || FORMS.wz.edit !== id) FORMS.wz = newWiz(l)
  } else if (from) { const l = getL(from); if (!FORMS.wz || FORMS.wz.from !== from) FORMS.wz = newWiz(l, true) }
  else if (!FORMS.wz || FORMS.wz.edit || FORMS.wz.from) FORMS.wz = newWiz()
  const w = FORMS.wz, s = mySeller(), el = w.edit && getL(w.edit), lk = el && listingLocks(el), lock = lk?.product ? 'disabled' : ''
  const names = ['Product', 'Price and units', 'Date and collection', 'Review']
  let body
  if (w.step === 0) body = `<h2>Product information</h2>${lk?.product ? `<p class="note warn">${ic('lock', 'sm')}<span>${plural(lk.open, 'buyer')} currently hold units, so the product details and date are locked. You can still change price (new reservations only), units, pickup times and instructions.</span></p>` : '<p class="mute">Photograph the actual item you will hand over.</p>'}
    <div class="fld"><label class="l">Product photos <span class="mute" style="font-weight:400">(up to 4 – the first is the cover)</span></label>
      <div class="upl">${w.photos.map((p, i) => `<div class="slot"><img src="${p}" alt="Upload ${i + 1}"><button class="x" type="button" data-act="wzrmphoto" data-i="${i}" aria-label="Remove image">${ic('x', 'xs')}</button></div>`).join('')}
      ${w.photos.length < 4 ? `<label class="slot"><input type="file" accept="image/*" multiple id="wz-photos" hidden><span>${ic('upload')}<br>Upload image</span></label>` : ''}</div>
      <div class="hint">Without a photo, buyers see a generic picture labelled “Illustrative photo”. A photo of the real pack builds trust.</div></div>
    ${fld('wz', 'name', 'Product name', inp('wz', 'name', 'text', `placeholder="e.g. Gardenia Original Classic Bread 400g" maxlength="80" ${lock}`), 'Include brand and pack size.')}
    ${fld('wz', 'cat', 'Category', sel('wz', 'cat', catOptions(w.cat, 'Select a category', RESCUE_CATS).replace('<select', '<select')).replace('<select', `<select ${lock}`), 'The pilot accepts pantry, bakery and drinks. Fresh, chilled, frozen, meat and egg products can be tracked but not listed.')}
    ${fld('wz', 'desc', 'Description', ta('wz', 'desc', 'maxlength="400" placeholder="Why is it surplus? Packaging and storage notes…"'))}
    <h3 style="margin-top:24px">Food rules</h3><p class="mute sm">Only sealed, packaged food that is safe at room temperature can be listed. Your declarations are not verified by FreshSave.</p>
    ${eligFields('wz')}`
  else if (w.step === 1) {
    const mt = maxTotal(el || {}), more = el && +w.qty > el.total
    body = `<h2>Price and units</h2><p class="mute">Offer only units you have physically counted and can set aside.</p>
    ${lk?.open ? `<p class="note">${ic('info', 'sm')}<span>${plural(lk.open, 'open reservation')} keep their agreed price (${[...new Set(resFor(el.id).filter((r) => OPEN.includes(r.status)).map((r) => rm(r.terms.price)))].join(', ')}). A new price applies to new reservations only.</span></p>` : ''}
    <div class="cols">${fld('wz', 'orig', 'Original price', rmInp('wz', 'orig'))}${fld('wz', 'price', 'Rescue price', rmInp('wz', 'price'))}</div>
    <div class="pills"><span class="mute sm">Quick price:</span>${[30, 50, 70].map((p) => `<button type="button" class="pill" data-act="wzdisc" data-p="${p}">-${p}%</button>`).join('')}</div>
    <div class="calc"><div><b style="font-size:13px;display:block">Discount (calculated)</b><span class="mute sm" id="wz-calcsub"></span></div><b id="wz-calc">–</b></div>
    ${fld('wz', 'qty', el ? 'Total units on this listing' : 'Units to offer', inp('wz', 'qty', 'number', `min="${el ? lk.minTotal : 1}" ${isFinite(mt) ? `max="${mt}"` : ''} step="1" style="max-width:180px"`), el ? `Now: ${ledger(el).avail} available · ${ledger(el).held} held · ${ledger(el).handed} handed over. Minimum ${lk.minTotal}${isFinite(mt) ? `, maximum ${mt} (batch limit)` : ''}.` : 'Units you have counted on the shelf. A batch record is created so every unit is accounted for.')}
    ${more ? `<div class="fld"><label class="chk ${w.err.extra ? 'err' : ''}"><input type="checkbox" data-b="wz.extra" ${w.extra ? 'checked' : ''}>I counted and set aside the ${+w.qty - el.total} extra unit(s)</label><div class="e" style="display:${w.err.extra ? 'block' : 'none'}">${esc(w.err.extra || '')}</div></div>` : ''}`
  } else if (w.step === 2) body = `<h2>Date and collection</h2><p class="mute">Buyers collect from your fixed pickup location.</p>
    <div class="fld"><label class="l">Which date is printed on the pack?</label>${expTypeSel('wz').replaceAll('<input type="radio"', lock ? '<input disabled type="radio"' : '<input type="radio"')}</div>
    ${fld('wz', 'expiry', 'Date on the pack', inp('wz', 'expiry', 'date', `min="${todayIso()}" style="max-width:220px" ${lock}`), 'Must be today or later – food past its printed date is never listed.')}
    <fieldset class="decl">${chk('wz', 'c3', 'The printed date is legible and matches the date and type I entered')}</fieldset>
    <h3 style="margin-top:22px">Collection</h3>
    ${fld('wz', 'pickupUntil', 'Last collection day', inp('wz', 'pickupUntil', 'date', `min="${todayIso()}" ${w.expiry ? `max="${lastPickupDay(w.expiry, w.expiryType)}"` : ''} style="max-width:220px"`), w.expiryType === 'use-by' ? 'Use-by food must be collected at least a day before the date.' : 'On or before the date on the pack.')}
    ${disclose(`Hours, location and instructions <span class="mute" id="wz-pickline">· ${fmtTime(w.pickFrom)}–${fmtTime(w.pickTo)} daily</span>`, `<div class="cols" style="gap:0 10px">${fld('wz', 'pickFrom', 'Open from', inp('wz', 'pickFrom', 'time'))}${fld('wz', 'pickTo', 'Collect until', inp('wz', 'pickTo', 'time'))}</div>
    <div class="fld"><label class="l">Pickup location</label><div class="fixed">${ic('pin', 'sm')}<span><b>${esc(s.name)}</b><br>${esc(s.area)}</span></div><div class="hint">Fixed to your registered store address. Change it in <a class="link" href="#/profile">Profile &amp; settings</a>.</div></div>
    ${fld('wz', 'instr', 'Pickup instructions', ta('wz', 'instr'))}`, { open: !!(w.err.pickTo || w.err.instr) })}`
  else {
    const pl = wzListing()
    body = `<h2>Review and publish</h2><p class="mute">This is how buyers will see your listing.</p>
    <div class="prevgrid"><div style="pointer-events:none">${card(pl, { static: true })}</div>
    <div class="revlist">${[['Product', esc(pl.name)], ['Category', catLabel(pl.cat)], ['Description', esc(w.desc)], ['Price', `${rm(pl.price)} <s class="mute">${rm(pl.orig)}</s> (-${disc(pl)}%)`], ['Units', pl.total], ['Date on pack', `${dateWord(w.expiryType)} ${fmtDate(pl.expiry)}`], ['Collect', `by ${fmtDate(w.pickupUntil)}, ${fmtTime(w.pickFrom)}–${fmtTime(w.pickTo)}`], ['Pickup', esc(s.area)], ['Instructions', esc(w.instr)]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div></div>
    ${eligResult({ ...w })}
    ${!w.edit ? `<div class="note warn">${ic('basket', 'sm')}<span>After publishing, move the units to your Clearance Basket and confirm. The listing becomes visible to buyers only then.</span></div>` : ''}`
  }
  setTimeout(() => HOOKS.wz('init'))
  return `<div class="crumbs"><a href="#/listings">Listings</a>${ic('cr', 'xs')}<span>${w.edit ? 'Edit listing' : 'Create listing'}</span></div>
  <h1 class="sr-only">${w.edit ? 'Edit listing' : 'Create listing'}</h1>
  <div class="wiz">
    <div class="wsteps">${names.map((n, i) => `<div class="${i === w.step ? 'cur' : i < w.step ? 'done' : ''}"><b>${i < w.step ? ic('check', 'xs') : i + 1}</b><span>${n}</span></div>`).join('')}</div>
    <form class="form" id="f-wz" novalidate>${body}
      <div class="wnav">${w.step ? `<button type="button" class="btn sec" data-act="wzback">${ic('cl', 'sm')}Back</button>` : `<a class="btn sec" href="#/listings" data-act="wzcancel">Cancel</a>`}
      ${w.step < 3 ? `<button type="submit" class="btn">Continue${ic('cr', 'sm')}</button>` : `<button type="submit" class="btn sage">${w.edit ? 'Save changes' : 'Publish listing'}</button>`}</div></form>
    <div class="side-prev"><h4>Listing preview</h4><div id="wz-prev"></div><div class="note" style="margin-top:12px">${ic('info', 'sm')}<span>Listings with a photo of the real pack and a clear collection window are easiest for buyers to trust.</span></div></div>
  </div>`
}
HOOKS.wz = (k) => {
  const w = FORMS.wz; if (!w) return
  const p = $('#wz-prev'); if (p) p.innerHTML = card(wzListing(), { static: true })
  const c = $('#wz-calc')
  if (c) { const o = +w.orig, pr = +w.price; c.textContent = o > 0 && pr > 0 && pr < o ? `-${Math.round((1 - pr / o) * 100)}%` : '–'; $('#wz-calcsub').textContent = o > 0 && pr >= o && pr ? 'Rescue price must be lower than the original price' : o > 0 && pr > 0 ? `Buyers pay ${rm(o - pr)} less per unit` : 'Enter both prices to calculate' }
  const pl = $('#wz-pickline'); if (pl) pl.textContent = `· ${fmtTime(w.pickFrom)}–${fmtTime(w.pickTo)} daily`
  const el = $('#wz-elig'); if (el && ['pack', 'c1', 'c2', 'init'].includes(k)) el.innerHTML = eligResult({ ...w, expiry: null, c3: true })
  if (k === 'expiryType' || k === 'expiry') { const d = $('#wz-pickupUntil'); if (d && w.expiry) { d.max = lastPickupDay(w.expiry, w.expiryType); if (!w.pickupUntil || w.pickupUntil > d.max) { w.pickupUntil = defaultPickupUntil(w.expiry, w.expiryType); d.value = w.pickupUntil } } }
}
const dupOf = (w) => S.listings.find((l) => l.seller === me().sellerId && l.id !== w.edit && l.name.trim().toLowerCase() === w.name.trim().toLowerCase() && l.expiry === w.expiry && live(l))
function validate() {
  const w = FORMS.wz, e = {}, el = w.edit && getL(w.edit)
  if (w.step === 0) {
    if (w.name.trim().length < 3) e.name = 'Enter a product name (at least 3 characters).'
    if (!w.cat) e.cat = 'Choose a category.'
    if (w.desc.trim().length < 10) e.desc = 'Add a short description (at least 10 characters).'
    if (!w.pack) e.pack = 'Select the food type and storage.'
    const r = eligibility({ ...w, expiry: null, c3: true })
    if (!r.ok && !Object.keys(e).length) e._elig = true
  } else if (w.step === 1) {
    if (!(+w.orig > 0)) e.orig = 'Enter the original price.'
    if (!(+w.price > 0)) e.price = 'Enter a rescue price.'
    else if (+w.price >= +w.orig) e.price = 'Rescue price must be lower than the original price.'
    const n = +w.qty
    if (!(Number.isInteger(n) && n >= 1)) e.qty = 'Enter a whole number of at least 1.'
    else if (el) {
      const lk = listingLocks(el), mt = maxTotal(el)
      if (n < lk.minTotal) e.qty = `At least ${lk.minTotal} – that many units are already reserved, handed over or returned.`
      else if (n > mt) e.qty = `At most ${mt} – the batch only has that many units not already allocated.`
      else if (n > el.total && !w.extra) e.extra = 'Confirm you counted and set aside the extra units.'
    }
  } else if (w.step === 2) {
    if (!w.expiry || daysLeft({ expiry: w.expiry }) < 0) e.expiry = "Choose today or a future date – food past its printed date can't be listed."
    else if (dupOf(w)) e.expiry = 'You already have a live listing of this product with this date. Edit that one instead of listing the same units twice.'
    if (!w.c3) e.c3 = true
    Object.assign(e, pickupErrors(w))
    if (!w.instr.trim()) e.instr = 'Add pickup instructions for buyers.'
  } else if (!eligibility(w).ok) e._elig = true
  w.err = e
  if (e._elig) toast(eligibility(w).rejected ? 'This item is not eligible for the pilot' : 'Complete the food-rule declarations', 'alert')
  return !Object.keys(e).length
}
function publish() {
  const w = FORMS.wz, now = Date.now()
  const data = { name: w.name.trim(), cat: w.cat, desc: w.desc.trim(), pack: w.pack, orig: +(+w.orig).toFixed(2), price: +(+w.price).toFixed(2), expiry: w.expiry, expiryType: w.expiryType, pickupUntil: w.pickupUntil, pickFrom: w.pickFrom, pickTo: w.pickTo, instr: w.instr.trim(), photos: w.photos }
  mySeller().defaultInstr = data.instr
  if (w.edit) {
    const l = getL(w.edit), lk = listingLocks(l)
    if (lk.product) { delete data.name; delete data.cat; delete data.pack; delete data.expiry; delete data.expiryType }
    Object.assign(l, data, { total: +w.qty })
    const b = getB(l.batchId); if (b && lk.open === 0 && lk.done === 0) Object.assign(b, { name: l.name, expiry: l.expiry, expiryType: l.expiryType, cat: l.cat })
    logAct('edit', `Edited listing ${l.name}`)
    delete FORMS.wz; save(); toast('Listing updated – existing reservations keep their agreed terms'); go('#/listings')
    return
  }
  // Direct listing: create a batch record so there is one unit ledger for everything a retailer lists.
  const b = { id: uid('b'), owner: me().id, name: data.name, cat: data.cat, kind: CAT_KIND[w.cat] || 'rice', qty: +w.qty, recorded: todayIso(), expiry: data.expiry, expiryType: data.expiryType, verify: 'listed', counted: +w.qty, verifiedAt: now, addedAt: now, source: 'direct', history: [], photo: w.photos[0]?.startsWith('data:') ? w.photos[0] : null }
  S.batches.unshift(b)
  const l = { id: uid('m'), ...data, total: +w.qty, withdrawn: 0, kind: b.kind, seller: me().sellerId, status: 'pending', moved: false, batchId: b.id, postedAt: now }
  S.listings.unshift(l)
  logAct('basket', `Published listing ${l.name} (${l.total} units)`)
  delete FORMS.wz; save(); app.refreshChrome()
  go(`#/basket/${l.id}?new=1`)
}

/* ---------------- Listings ---------------- */
const TABS = [['live', 'Live'], ['awaiting', 'Awaiting transfer'], ['ended', 'Needs action'], ['done', 'Completed & closed']]
const tabOf = (l) => { const k = lifecycle(l); return k === 'live' || k === 'reserved' ? 'live' : k === 'awaiting' ? 'awaiting' : k === 'ended' ? 'ended' : 'done' }
function groupsFor() {
  const mine = S.listings.filter((l) => l.seller === me().sellerId && l.status !== 'removed')
  return Object.fromEntries(TABS.map(([k]) => [k, mine.filter((l) => tabOf(l) === k)]))
}
function pageListings(parts, q) {
  if (!isRetailer()) return `${pageHead('Listings', '', '', 'Rescue')}${empty('shield', 'Listing is for participating retailers', "In this pilot only retailers can offer food. Household food stays in Track.", '<a class="btn" href="#/inventory">My food</a>')}`
  const g = groupsFor()
  // Open on the tab that needs you: units to move, then ended listings, then live ones.
  const tab = TABS.some(([k]) => k === q.get('tab')) ? q.get('tab') : g.awaiting.length ? 'awaiting' : g.ended.length ? 'ended' : 'live'
  const xs = g[tab] || []
  const row = (l) => {
    const k = lifecycle(l), [st, c] = LIFE[k], d = daysLeft(l), rs = resFor(l.id), open = rs.filter((r) => OPEN.includes(r.status)), g2 = ledger(l), pend = rs.filter((r) => r.status === 'pending').length
    const edit = ['awaiting', 'live', 'reserved', 'ended'].includes(k)
    const resHref = `#/reservations?view=seller&tab=${pend ? 'pending' : open.length ? 'confirmed' : 'completed'}`
    const primary = k === 'awaiting' ? `<button class="ibtn go" data-act="moved" data-id="${l.id}">${ic('basket', 'xs')}Confirm moved</button>`
      : k === 'ended' && !open.length ? `<button class="ibtn go" data-act="lreturn" data-id="${l.id}">${ic('basket', 'xs')}Return to shelf</button>`
      : edit ? `<a class="ibtn" href="#/sell/${l.id}">${ic('edit', 'xs')}Edit</a>` : `<a class="ibtn" href="#/sell?from=${l.id}">${ic('refresh', 'xs')}Relist</a>`
    const menu = moreMenu(`${primary.includes('#/sell/') ? '' : edit ? `<a href="#/sell/${l.id}">${ic('edit', 'sm')}Edit</a>` : ''}<a href="${resHref}">${ic('receipt', 'sm')}Reservations (${open.length} open)</a><a href="#/basket/${l.id}">${ic('basket', 'sm')}Clearance Basket</a>${edit && k !== 'ended' ? `<hr><button class="d" data-act="lremove" data-id="${l.id}">${ic('trash', 'sm')}Withdraw listing</button>` : ''}`)
    return `<tr><td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/item/${l.id}"><b>${esc(l.name)}</b></a><span class="mute sm"><b style="color:var(--ink)">${rm(l.price)}</b> <s>${rm(l.orig)}</s> · listed ${ago(l.postedAt)}</span></div></div></td>
    <td data-l="Units" class="ucell">${unitBar(l)}</td>
    <td data-l="Status"><div class="datecell">${sp(st, c)}<span class="dl ${d <= 1 ? 'hot' : ''}">${dateWord(l.expiryType)} ${fmtShort(l.expiry)} · collect by ${whenShort(deadlineTs(l))}</span>${k === 'ended' && g2.avail ? `<span class="dl">${g2.avail} unit${g2.avail === 1 ? '' : 's'} still in the basket</span>` : ''}${pend ? `<a class="link sm" href="${resHref}">${plural(pend, 'request')} to answer</a>` : ''}</div></td>
    <td data-l="" class="act-c"><div class="acts-cell tight">${primary}${menu}</div></td></tr>`
  }
  const msgs = { live: 'Nothing is live. Offer counted units from Stock, or create a listing.', awaiting: 'Nothing waiting. New listings wait here until you confirm the units are in the Clearance Basket.', ended: 'Nothing needs action. Listings whose collection window ended with units left appear here.', done: 'Finished listings appear here.' }
  const total = Object.values(g).reduce((a, x) => a + x.length, 0)
  return `${pageHead('Listings', `${esc(mySeller().name)}`, `<a class="btn" href="#/sell" data-act="wznew">${ic('plus', 'sm')}New listing</a>`, 'Rescue')}
  <div class="tabs">${TABS.map(([k, t]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/listings?tab=${k}" ${tab === k ? 'aria-current="page"' : ''}>${t}<i>${g[k].length}</i></a>`).join('')}</div>
  ${tab === 'awaiting' && xs.length ? `<p class="hintline" style="margin-top:14px">${ic('basket', 'xs')}<span>Buyers cannot see these yet. Move the units to the Clearance Basket, then confirm.</span></p>` : tab === 'ended' && xs.length ? `<p class="hintline" style="margin-top:14px">${ic('alert', 'xs')}<span>Return unclaimed units to the shelf so they are not sold twice at the till.</span></p>` : ''}
  ${xs.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Units</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${xs.map(row).join('')}</tbody></table>`
    : `<div class="tabempty">${total ? msgs[tab] : empty('basket', 'No listings yet', 'Count the shelf for batches that are close to their date and offer the units. Every unit stays accounted for from shelf to handover.', '<a class="btn" href="#/batches">Open Stock</a><a class="btn sec" href="#/sell">Create listing</a>')}</div>`}
  <p class="hintline" style="margin-top:16px">${ic('basket', 'xs')}<span><a href="#/basket">Clearance Basket overview</a> · <a href="#/market">View marketplace as a buyer</a></span></p>`
}

/* ---------------- Clearance Basket (state derived from real events, not a free dropdown) ---------------- */
function basketState(l) {
  const k = lifecycle(l), g = ledger(l)
  if (k === 'awaiting') return ['Awaiting physical transfer', 'y', 0]
  if (k === 'ended') return [g.avail || g.held ? 'Return to shelf' : 'Finished', 'o', 1]
  if (k === 'closed' || k === 'removed') return [g.handed ? 'Closed – rest returned to shelf' : 'Returned to shelf', '', 2]
  if (k === 'completed') return ['All handed over', '', 2]
  return g.held ? ['Reserved units set aside', 'g', 1] : ['In Clearance Basket', 'g', 1]
}
function pageBasketAll() {
  const mine = S.listings.filter((l) => l.seller === me().sellerId && l.status !== 'removed' && !(['completed', 'closed'].includes(lifecycle(l)) && daysLeft(l) < -7))
  const cnt = (f) => mine.filter(f).length
  const inBasket = (l) => ['live', 'reserved'].includes(lifecycle(l))
  return `${pageHead('Clearance Basket', 'The physical crate or shelf where listed units wait apart from regular stock.', '', 'Rescue')}
  <p class="hintline">${ic('info', 'xs')}<span>FreshSave can't see your shelves. Statuses follow what you confirm and what happens to reservations, and only a code-checked handover moves units out of the basket.</span></p>
  <p class="snapline">${[['awaiting transfer', cnt((l) => lifecycle(l) === 'awaiting')], ['units in basket', mine.filter(inBasket).reduce((a, l) => a + ledger(l).avail, 0)], ['units held for pickup', mine.filter(inBasket).reduce((a, l) => a + ledger(l).held, 0)], ['to return to shelf', cnt((l) => lifecycle(l) === 'ended')]].map(([s2, n]) => `<span><b>${n}</b> ${s2}</span>`).join('')}</p>
  ${mine.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Units</th><th>Date &amp; window</th><th>Basket status</th><th></th></tr></thead><tbody>${mine.map((l) => { const [st, c] = basketState(l); const k = lifecycle(l); return `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/basket/${l.id}"><b>${esc(l.name)}</b></a></div></div></td>
    <td data-l="Units" class="ucell">${unitBar(l)}</td><td data-l="Date & window"><div><span class="dtype ${l.expiryType === 'use-by' ? 'use' : ''}">${dateWord(l.expiryType)}</span> ${fmtShort(l.expiry)}<div class="mute sm">Collect by ${whenShort(deadlineTs(l))}</div></div></td>
    <td data-l="Basket status">${sp(st, c)}</td>
    <td data-l="">${k === 'awaiting' ? `<button class="btn sm sage" data-act="moved" data-id="${l.id}">Confirm moved</button>` : k === 'ended' && !resFor(l.id).some((r) => OPEN.includes(r.status)) ? `<button class="btn sm sage" data-act="lreturn" data-id="${l.id}">Return to shelf</button>` : `<a class="ibtn" href="#/basket/${l.id}">Details</a>`}</td></tr>` }).join('')}</tbody></table>`
    : empty('basket', 'Your Clearance Basket is empty', 'Units appear here after you publish a listing and confirm the move.', '<a class="btn" href="#/batches">Open Stock</a>')}`
}
function pageBasket(id, isNew) {
  const l = getL(id)
  if (!l || l.seller !== me().sellerId) return empty('info', 'Listing not found', '', '<a class="btn" href="#/basket">Clearance Basket</a>')
  const k = lifecycle(l), [st, c, idx] = basketState(l), b = l.batchId && getB(l.batchId), g = ledger(l)
  const held = resFor(l.id).filter((r) => OPEN.includes(r.status)), open = held.length > 0
  return `<div class="confirm"><div class="crumbs"><a href="#/basket">Clearance Basket</a>${ic('cr', 'xs')}<span>${esc(l.name)}</span></div>
  ${isNew ? `<div class="okbar"><span class="c">${ic('check')}</span><div><b style="font-size:18px">Listing created</b><div class="mute">One more step: physically move the units, then confirm below. Buyers can see the listing only after you confirm.</div></div></div>` : ''}
  <div class="basket"><div class="basket-h">${ic('basket')}<div><h1>${k === 'awaiting' ? 'Move these units to your Clearance Basket.' : k === 'ended' ? 'The collection window has ended.' : 'Keep these units set aside.'}</h1><div class="mute sm">${k === 'ended' ? 'Return unclaimed units to the shelf so they are not sold twice at the till.' : 'Keep them apart from shelf stock so they are not sold twice at the cashier.'}</div></div></div>
    <div class="basket-b"><img src="${imgs(l)[0]}" alt="">
      <dl><dt>Product</dt><dd><b>${esc(l.name)}</b></dd><dt>Units</dt><dd>${unitBar(l)}</dd><dt>Date on pack</dt><dd><span class="dtype ${l.expiryType === 'use-by' ? 'use' : ''}">${dateWord(l.expiryType)}</span> ${fmtDate(l.expiry)}</dd><dt>Collect</dt><dd>by ${whenShort(deadlineTs(l))}</dd><dt>Rescue price</dt><dd>${rm(l.price)} <s class="mute">${rm(l.orig)}</s></dd><dt>Status</dt><dd>${sp(st, c)}</dd>${b ? `<dt>From batch</dt><dd><a class="link" href="#/batch/${b.id}">${esc(b.name)}</a> <span class="mute">(received ${b.qty})</span></dd>` : ''}</dl>
      <div class="basket-acts">${k === 'awaiting' ? `<button class="btn sage" data-act="moved" data-id="${l.id}">${ic('check', 'sm')}Confirm moved to Clearance Basket</button><span class="mute sm">The listing becomes visible to buyers after you confirm.</span>` : ''}
        ${k === 'ended' ? (open ? `<span class="mute sm">${plural(held.length, 'reservation')} still open – they expire automatically at their collect-by time.</span>` : g.avail ? `<button class="btn sage" data-act="lreturn" data-id="${l.id}">${ic('check', 'sm')}Return ${plural(g.avail, 'unit')} to shelf &amp; close</button>` : '') : ''}
        <a class="btn sec" href="#/item/${l.id}">View listing</a><a class="btn sec" href="#/listings">Listings</a><a class="link sm" href="#/reservations?view=seller&tab=confirmed">Handovers ${ic('arrow', 'xs')}</a></div></div>
    ${held.length ? `<div class="setaside"><h3>${ic('key', 'sm')}Set aside for these buyers</h3><ul class="alist">${held.map((r) => `<li>${ic('receipt', 'sm')}<span><b>${r.qty} x</b> – ref <b class="mono">${r.ref}</b> · ${esc(r.buyerName)}${r.status === 'pending' ? ' <span class="mute">(awaiting your reply)</span>' : ''}</span><small>${r.status === 'pending' ? `reply by ${whenShort(r.respondBy)}` : `collect by ${whenShort(r.collectBy)}`}</small></li>`).join('')}</ul></div>` : ''}
    <div class="track">${steps(['Awaiting transfer', 'In Clearance Basket', 'Finished'], idx)}</div>
    <p class="mute sm" style="padding:0 20px 18px">You confirm the move and the return. Handover is recorded only when you enter the buyer's pickup code on the reservation.</p></div></div>`
}

export const routes = { sell: (p, q) => pageSell(p[1], q), listings: pageListings, basket: (p, q) => (p[1] ? pageBasket(p[1], q.get('new')) : pageBasketAll()) }
export const actions = {
  wznew: () => { delete FORMS.wz },
  wzcancel: () => { delete FORMS.wz },
  wzback: () => { FORMS.wz.step--; FORMS.wz.err = {}; app.render() },
  wzrmphoto: (el) => { FORMS.wz.photos.splice(+el.dataset.i, 1); app.render() },
  wzdisc: (el) => { const w = FORMS.wz, o = +w.orig; if (!(o > 0)) { toast('Enter the original price first', 'alert'); return $('#wz-orig')?.focus() } w.price = (Math.round(o * (1 - +el.dataset.p / 100) * 10) / 10).toFixed(2); $('#wz-price').value = w.price; HOOKS.wz('price') },
  moved: (el) => { const l = getL(el.dataset.id); confirmDlg({ title: 'Confirm units moved?', ok: 'Confirm moved', cls: 'sage', body: `<p>Confirm that <b>${ledger(l).avail} x ${esc(l.name)}</b> are physically in your FreshSave Clearance Basket, sealed, with the printed date visible.</p>`, onOk: () => { l.status = 'active'; l.moved = true; logAct('basket', `Moved ${l.name} to the Clearance Basket`); save(); toast('Moved to Clearance Basket – listing is now live'); app.refreshChrome(); app.render() } }) },
  lreturn: (el) => { const l = getL(el.dataset.id), n = ledger(l).avail; confirmDlg({ title: 'Return units to the shelf?', ok: 'Return & close', cls: 'sage', body: `<p>You are returning <b>${plural(n, 'unit')}</b> of <b>${esc(l.name)}</b> from the Clearance Basket to normal stock. The listing closes; handed-over units stay on record.</p>`, onOk: () => { const e = closeListing(l); if (e) return toast(e, 'alert'); logAct('basket', `Returned ${n} x ${l.name} to the shelf`); toast('Units returned – listing closed'); app.refreshChrome(); app.render() } }) },
  lremove: (el) => { const l = getL(el.dataset.id); const open = resFor(l.id).filter((r) => OPEN.includes(r.status))
    confirmDlg({ title: 'Withdraw this listing?', ok: 'Withdraw listing', cls: 'danger', body: `<p><b>${esc(l.name)}</b> disappears from the marketplace and its unsold units return to the shelf.${open.length ? ` <b>${plural(open.length, 'open reservation')}</b> will be cancelled and the buyers notified.` : ''} Handovers already recorded are kept.</p>`,
      onOk: () => { closeListing(l, { cancelOpen: true }); logAct('trash', `Withdrew listing ${l.name}`); toast('Listing withdrawn'); app.refreshChrome(); app.render() } }) },
}
export function change(e) {
  const t = e.target
  if (t.id === 'wz-photos' && t.files.length) { readImages(t.files, 4 - FORMS.wz.photos.length).then((xs) => { FORMS.wz.photos.push(...xs); app.render() }); return true }
  return false
}
export function submit(e) {
  if (e.target.id !== 'f-wz') return false
  if (!validate()) { app.render(); focusErr(); return true }
  if (FORMS.wz.step < 3) { FORMS.wz.step++; FORMS.wz.err = {}; app.render(); window.scrollTo(0, 0) }
  else publish()
  return true
}
