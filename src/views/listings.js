// Seller listing creation, My Listings management and the physical Clearance Basket workflow.
import {
  S, save, $, esc, ic, rm, catLabel, catOptions, toast, go, app, me, isRetailer, mySeller, getL, getB, imgs, thumb, disc, daysLeft, uid,
  todayIso, iso, addDays, today0, fmtDate, fmtShort, ago, expLong, card, sp, pageHead, empty, steps, confirmDlg, notify, logAct, readImages,
  OPEN, CLEAR, CL_CLS, resFor, reservedQty, FORMS, HOOKS, fld, inp, sel, ta, rmInp, eligFields, eligResult, eligibility, plural,
} from '../core.js'
import { CAT_KIND } from '../data.js'

const listedQty = (l) => l.qty + resFor(l.id).filter((r) => r.status !== 'cancelled').reduce((a, r) => a + r.qty, 0)

/* ---------------- Create / edit listing ---------------- */
function newWiz(l) {
  if (l) return { step: 0, edit: l.id, photos: [...(l.photos || [])], name: l.name, cat: l.cat, desc: l.desc, pack: l.pack || '', c1: true, c2: true, orig: String(l.orig), price: String(l.price), qty: String(l.qty), expiry: l.expiry, instr: l.instr, ok: false, err: {} }
  return { step: 0, photos: [], name: '', cat: '', desc: '', pack: '', c1: false, c2: false, orig: '', price: '', qty: '1', expiry: iso(addDays(today0(), 2)), instr: isRetailer() ? 'Ask at the cashier for the FreshSave Clearance Basket and show your reservation code. Pay at the counter.' : 'Message me to arrange a pickup time. Pay in person on collection.', ok: false, err: {} }
}
const wzListing = () => { const w = FORMS.wz, l = w.edit && getL(w.edit); return { id: 'preview', name: w.name || 'Product name', cat: w.cat || 'others', kind: l?.kind || CAT_KIND[w.cat] || 'rice', seller: me().sellerId, orig: +w.orig || 0, price: +w.price || 0, qty: +w.qty || 0, expiry: w.expiry || todayIso(), photos: w.photos } }
function pageSell(id) {
  if (id) {
    const l = getL(id)
    if (!l || l.seller !== me().sellerId) return empty('info', 'Listing not found', '', '<a class="btn" href="#/listings">My Listings</a>')
    if (!FORMS.wz || FORMS.wz.edit !== id) FORMS.wz = newWiz(l)
  } else if (!FORMS.wz || FORMS.wz.edit) FORMS.wz = newWiz()
  const w = FORMS.wz, s = mySeller()
  const names = ['Product information', 'Price and quantity', 'Expiry and collection', 'Review and publish']
  let body
  if (w.step === 0) body = `<h2>Product information</h2><p class="mute">Clear photos of the actual item help buyers decide quickly.</p>
    <div class="fld"><label class="l">Product images <span class="mute" style="font-weight:400">(up to 4 – the first is the cover)</span></label>
      <div class="upl">${w.photos.map((p, i) => `<div class="slot"><img src="${p}" alt="Upload ${i + 1}"><button class="x" type="button" data-act="wzrmphoto" data-i="${i}" aria-label="Remove image">${ic('x', 'xs')}</button></div>`).join('')}
      ${w.photos.length < 4 ? `<label class="slot"><input type="file" accept="image/*" multiple id="wz-photos" hidden><span>${ic('upload')}<br>Upload image</span></label>` : ''}</div>
      <div class="hint">No photo yet? A standard category photo is shown until you add one.</div></div>
    ${fld('wz', 'name', 'Product name', inp('wz', 'name', 'text', 'placeholder="e.g. Gardenia Original Classic Bread 400g" maxlength="80"'), 'Include brand and pack size.')}
    ${fld('wz', 'cat', 'Category', sel('wz', 'cat', catOptions(w.cat)))}
    ${fld('wz', 'desc', 'Description', ta('wz', 'desc', 'maxlength="400" placeholder="Why is it surplus? Packaging and storage notes…"'))}
    <h3 style="margin-top:24px">Eligibility</h3><p class="mute sm">Only unopened packaged food, safely stored packaged goods and sealed bakery products can be listed.</p>
    ${eligFields('wz')}`
  else if (w.step === 1) body = `<h2>Price and quantity</h2><p class="mute">Enter the quantity you have physically checked and can hand over.</p>
    <div class="cols">${fld('wz', 'orig', 'Original price', rmInp('wz', 'orig'))}${fld('wz', 'price', 'Rescue price', rmInp('wz', 'price'))}</div>
    ${fld('wz', 'qty', 'Available quantity', inp('wz', 'qty', 'number', 'min="1" step="1" style="max-width:180px"'), 'Units you have verified are available.')}
    <div class="calc"><div><b style="font-size:13px;display:block">Discount (calculated)</b><span class="mute sm" id="wz-calcsub"></span></div><b id="wz-calc">–</b></div>`
  else if (w.step === 2) body = `<h2>Expiry and collection</h2><p class="mute">Buyers collect from your fixed pickup location.</p>
    ${fld('wz', 'expiry', 'Expiry date', inp('wz', 'expiry', 'date', `min="${todayIso()}" style="max-width:220px"`), 'Use the date printed on the package.')}
    <div class="fld"><label class="l">Pickup location</label><div class="fixed">${ic('pin', 'sm')}<span><b>${esc(s.name)}</b><br>${esc(s.area)}</span></div><div class="hint">Fixed to your registered ${isRetailer() ? 'store' : 'pickup'} address. Change it in <a class="link" href="#/profile">Profile & Settings</a>.</div></div>
    ${fld('wz', 'instr', 'Pickup instructions', ta('wz', 'instr'))}`
  else {
    const pl = wzListing()
    body = `<h2>Review and publish</h2><p class="mute">This is how buyers will see your listing.</p>
    <div class="prevgrid"><div style="pointer-events:none">${card(pl, { static: true })}</div>
    <div class="revlist">${[['Product', esc(pl.name)], ['Category', catLabel(pl.cat)], ['Description', esc(w.desc)], ['Price', `${rm(pl.price)} <s class="mute">${rm(pl.orig)}</s> (-${disc(pl)}%)`], ['Quantity', pl.qty], ['Expiry', fmtDate(pl.expiry)], ['Pickup', esc(s.area)], ['Instructions', esc(w.instr)]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div></div>
    ${eligResult(w)}
    ${!w.edit && isRetailer() ? `<div class="note warn">${ic('basket', 'sm')}<span>After publishing, move the items to your FreshSave Clearance Basket. The listing becomes visible to buyers once you confirm the transfer.</span></div>` : ''}`
  }
  setTimeout(() => HOOKS.wz('init'))
  return `<div class="crumbs"><a href="#/listings">My Listings</a>${ic('cr', 'xs')}<span>${w.edit ? 'Edit listing' : 'Create listing'}</span></div>
  <div class="wiz">
    <div class="wsteps">${names.map((n, i) => `<div class="${i === w.step ? 'cur' : i < w.step ? 'done' : ''}"><b>${i < w.step ? ic('check', 'xs') : i + 1}</b><span>${n}</span></div>`).join('')}</div>
    <form class="form" id="f-wz" novalidate>${body}
      <div class="wnav">${w.step ? `<button type="button" class="btn sec" data-act="wzback">${ic('cl', 'sm')}Back</button>` : `<a class="btn sec" href="#/listings" data-act="wzcancel">Cancel</a>`}
      ${w.step < 3 ? `<button type="submit" class="btn">Continue${ic('cr', 'sm')}</button>` : `<button type="submit" class="btn sage">${w.edit ? 'Save changes' : 'Publish listing'}</button>`}</div></form>
    <div class="side-prev"><h4>Listing preview</h4><div id="wz-prev"></div><div class="note" style="margin-top:12px">${ic('info', 'sm')}<span>Listings with a clear photo and expiry date are easiest for buyers to trust.</span></div></div>
  </div>`
}
HOOKS.wz = (k) => {
  const w = FORMS.wz; if (!w) return
  const p = $('#wz-prev'); if (p) p.innerHTML = card(wzListing(), { static: true })
  const c = $('#wz-calc')
  if (c) { const o = +w.orig, pr = +w.price; c.textContent = o > 0 && pr > 0 && pr < o ? `-${Math.round((1 - pr / o) * 100)}%` : '–'; $('#wz-calcsub').textContent = o > 0 && pr >= o && pr ? 'Rescue price must be lower than the original price' : o > 0 && pr > 0 ? `Buyers save ${rm(o - pr)} per unit` : 'Enter both prices to calculate' }
  const el = $('#wz-elig'); if (el && ['pack', 'c1', 'c2', 'init'].includes(k)) el.innerHTML = eligResult(w)
}
function validate() {
  const w = FORMS.wz, e = {}
  if (w.step === 0) {
    if (w.name.trim().length < 3) e.name = 'Enter a product name (at least 3 characters).'
    if (!w.cat) e.cat = 'Choose a category.'
    if (w.desc.trim().length < 10) e.desc = 'Add a short description (at least 10 characters).'
    if (!w.pack) e.pack = 'Select the food type and condition.'
    const el = eligibility({ ...w, expiry: null })
    if (!el.ok && !Object.keys(e).length) e._elig = true
  } else if (w.step === 1) {
    if (!(+w.orig > 0)) e.orig = 'Enter the original price.'
    if (!(+w.price > 0)) e.price = 'Enter a rescue price.'
    else if (+w.price >= +w.orig) e.price = 'Rescue price must be lower than the original price.'
    if (!(Number.isInteger(+w.qty) && +w.qty >= 1)) e.qty = 'Enter a whole number of at least 1.'
  } else if (w.step === 2) {
    if (!w.expiry || daysLeft({ expiry: w.expiry }) < 0) e.expiry = "Choose today or a future date – expired food can't be listed."
    if (!w.instr.trim()) e.instr = 'Add pickup instructions for buyers.'
  } else if (!eligibility(w).ok) e._elig = true
  w.err = e
  if (e._elig) toast(eligibility(w).rejected ? 'This item is not eligible for FreshSave' : 'Complete the eligibility checks', 'alert')
  return !Object.keys(e).length
}
function publish() {
  const w = FORMS.wz
  const data = { name: w.name.trim(), cat: w.cat, desc: w.desc.trim(), pack: w.pack, orig: +(+w.orig).toFixed(2), price: +(+w.price).toFixed(2), qty: +w.qty, expiry: w.expiry, instr: w.instr.trim(), photos: w.photos }
  if (w.edit) {
    const l = getL(w.edit)
    Object.assign(l, data)
    if (l.status === 'completed' && l.qty > 0) l.status = 'active'
    logAct('edit', `Edited listing ${l.name}`)
    delete FORMS.wz; save(); toast('Listing updated'); go('#/listings')
    return
  }
  const R = isRetailer()
  const l = { id: uid('m'), ...data, kind: CAT_KIND[w.cat] || 'rice', seller: me().sellerId, status: R ? 'pending' : 'active', clearance: R ? 'Awaiting Physical Transfer' : null, postedAt: Date.now() }
  S.listings.unshift(l)
  logAct('basket', `Published listing ${l.name} (${l.qty} units)`)
  delete FORMS.wz; save(); app.refreshChrome()
  if (R) go(`#/basket/${l.id}?new=1`)
  else { toast('Listing published – buyers nearby can now reserve it'); go('#/listings?tab=active') }
}

/* ---------------- My Listings ---------------- */
function lStatus(l) {
  if (l.status === 'completed') return ['Completed', '']
  if (daysLeft(l) < 0) return ['Expired', 'r']
  if (l.status === 'pending') return ['Awaiting transfer', 'y']
  if (l.qty <= 0) return ['Fully reserved', 'g']
  return ['Active', 'g']
}
function groupsFor() {
  const mine = S.listings.filter((l) => l.seller === me().sellerId && l.status !== 'removed')
  return {
    active: mine.filter((l) => l.status === 'active' && daysLeft(l) >= 0 && l.qty > 0),
    pending: mine.filter((l) => l.status === 'pending' && daysLeft(l) >= 0),
    reserved: mine.filter((l) => reservedQty(l.id) > 0 && l.status !== 'completed'),
    completed: mine.filter((l) => l.status === 'completed'),
    expired: mine.filter((l) => l.status !== 'completed' && daysLeft(l) < 0),
  }
}
function pageListings(parts, q) {
  const tab = q.get('tab') || 'active', R = isRetailer()
  const g = groupsFor()
  const xs = g[tab] || []
  const awaiting = R ? S.listings.filter((l) => l.seller === me().sellerId && l.clearance === 'Awaiting Physical Transfer' && l.status === 'pending') : []
  const row = (l) => {
    const [st, c] = lStatus(l), d = daysLeft(l), rs = resFor(l.id), open = rs.filter((r) => OPEN.includes(r.status))
    return `<tr><td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/item/${l.id}"><b>${esc(l.name)}</b></a><span class="mute sm">${catLabel(l.cat)} · listed ${ago(l.postedAt)}</span></div></div></td>
    <td data-l="Rescue price"><div><b>${rm(l.price)}</b><div class="mute sm"><s>${rm(l.orig)}</s> -${disc(l)}%</div></div></td>
    <td data-l="Available qty">${l.qty}</td>
    <td data-l="Expiry date"><div class="${d <= 1 ? 'hot' : ''}">${fmtShort(l.expiry)}<div class="mute sm">${expLong(l.expiry)}</div></div></td>
    <td data-l="Listing status">${sp(st, c)}</td>
    ${R ? `<td data-l="Clearance status"><select class="cl-sel ${CL_CLS[l.clearance] || ''}" data-cl="${l.id}" aria-label="Update clearance status">${CLEAR.map((x) => `<option ${x === l.clearance ? 'selected' : ''}>${x}</option>`).join('')}</select></td>` : ''}
    <td data-l="Reservations"><div><b>${open.length}</b> open · ${rs.filter((r) => r.status === 'completed').length} completed<br><a class="link sm" href="#/reservations?view=seller&tab=${rs.some((r) => r.status === 'pending') ? 'pending' : open.length ? 'confirmed' : 'completed'}">View reservations</a></div></td>
    <td data-l="Actions"><div class="acts-col">
      ${l.status === 'pending' && R ? `<a class="ibtn" href="#/basket/${l.id}">${ic('basket', 'xs')}Move to basket</a>` : ''}
      ${l.status !== 'completed' ? `<a class="ibtn" href="#/sell/${l.id}">${ic('edit', 'xs')}Edit</a>` : ''}
      ${l.status !== 'completed' ? `<button class="ibtn d" data-act="lremove" data-id="${l.id}">${ic('trash', 'xs')}Remove</button>` : ''}</div></td></tr>`
  }
  const msgs = { active: 'No active listings.', pending: 'Nothing pending. New listings wait here until you confirm they are in the Clearance Basket.', reserved: 'No listings with open reservations.', completed: 'Completed listings appear here once all units are collected.', expired: 'No expired listings.' }
  const total = Object.values(g).reduce((a, x) => a + x.length, 0)
  return `${pageHead('My Listings', `${esc(mySeller().name)} · ${esc(mySeller().area)}`, `${R ? `<a class="btn sec" href="#/basket">${ic('basket', 'sm')}Clearance Basket</a>` : ''}<a class="btn" href="#/sell" data-act="wznew">${ic('plus', 'sm')}Create listing</a>`)}
  ${awaiting.length ? `<div class="note warn">${ic('basket', 'sm')}<span><b>${plural(awaiting.length, 'listing')} awaiting physical transfer</b> to the Clearance Basket: ${awaiting.map((l) => `<a class="link" href="#/basket/${l.id}">${esc(l.name)}</a>`).join(', ')}</span></div>` : ''}
  <div class="tabs">${[['active', 'Active'], ['pending', 'Pending'], ['reserved', 'Reserved'], ['completed', 'Completed'], ['expired', 'Expired']].map(([k, t]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/listings?tab=${k}">${t}<i>${g[k].length}</i></a>`).join('')}</div>
  ${xs.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Rescue price</th><th>Available qty</th><th>Expiry date</th><th>Listing status</th>${R ? '<th>Clearance status</th>' : ''}<th>Reservations</th><th>Actions</th></tr></thead><tbody>${xs.map(row).join('')}</tbody></table>`
    : `<div class="tabempty">${total ? msgs[tab] : empty('basket', 'No listings yet', R ? 'List verified surplus stock from your Batch Inventory, or create a listing directly.' : 'List unopened packaged food you won\'t use before it expires.', `${R ? '<a class="btn sec" href="#/batches">Batch Inventory</a>' : ''}<a class="btn" href="#/sell">Create listing</a>`)}</div>`}`
}
function setClearance(l, v) {
  l.clearance = v
  if (v !== 'Awaiting Physical Transfer' && l.status === 'pending') l.status = 'active'
  if (v === 'Awaiting Physical Transfer' && l.status === 'active') l.status = 'pending'
  logAct('basket', `Clearance status for ${l.name}: ${v}`)
  save(); toast(`Clearance status updated: ${v}`); app.render()
}

/* ---------------- Clearance Basket ---------------- */
function pageBasketAll() {
  const mine = S.listings.filter((l) => l.seller === me().sellerId && l.status !== 'removed' && !(l.status === 'completed' && l.clearance === 'Collected' && daysLeft(l) < -7))
  const count = (s) => mine.filter((l) => l.clearance === s).length
  return `${pageHead('Clearance Basket', 'Track listed items in the physical FreshSave area near your cashier.')}
  <div class="note">${ic('info', 'sm')}<span>The Clearance Basket is a physical shelf or crate near your cashier where listed items are kept apart from regular stock. FreshSave can't detect physical stock movement – update each status yourself.</span></div>
  <div class="stats">${CLEAR.map((s) => `<div class="stat"><small>${s}</small><b>${count(s)}</b></div>`).join('')}</div>
  ${mine.length ? `<table class="tbl" style="border-top:1px solid var(--line)"><thead><tr><th>Product</th><th>Listed qty</th><th>Expiry date</th><th>Rescue price</th><th>Clearance status</th><th></th></tr></thead><tbody>${mine.map((l) => `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/basket/${l.id}"><b>${esc(l.name)}</b></a><span class="mute sm">${l.qty} available · ${reservedQty(l.id)} reserved</span></div></div></td>
    <td data-l="Listed qty">${listedQty(l)}</td><td data-l="Expiry date">${fmtDate(l.expiry)}</td><td data-l="Rescue price">${rm(l.price)}</td>
    <td data-l="Clearance status"><select class="cl-sel ${CL_CLS[l.clearance] || ''}" data-cl="${l.id}" aria-label="Update clearance status">${CLEAR.map((x) => `<option ${x === l.clearance ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
    <td data-l="">${l.clearance === 'Awaiting Physical Transfer' ? `<button class="btn sm sage" data-act="moved" data-id="${l.id}">Confirm moved</button>` : `<a class="ibtn" href="#/basket/${l.id}">Details</a>`}</td></tr>`).join('')}</tbody></table>`
    : empty('basket', 'Your Clearance Basket is empty', 'Items appear here after you publish a listing.', '<a class="btn" href="#/batches">Batch Inventory</a>')}`
}
function pageBasket(id, isNew) {
  const l = getL(id)
  if (!l || l.seller !== me().sellerId) return empty('info', 'Listing not found', '', '<a class="btn" href="#/basket">Clearance Basket</a>')
  const idx = CLEAR.indexOf(l.clearance), waiting = l.clearance === 'Awaiting Physical Transfer'
  const b = l.batchId && getB(l.batchId)
  return `<div class="confirm"><div class="crumbs"><a href="#/basket">Clearance Basket</a>${ic('cr', 'xs')}<span>${esc(l.name)}</span></div>
  ${isNew ? `<div class="okbar"><span class="c">${ic('check')}</span><div><h2>Listing published</h2><div class="mute">One more step: physically move the items so staff can hand them over to buyers.</div></div></div>` : ''}
  <div class="basket"><div class="basket-h">${ic('basket')}<div><h2>Move these items to your FreshSave Clearance Basket.</h2><div class="mute sm">Keep them apart from shelf stock so they aren't sold twice at the cashier.</div></div></div>
    <div class="basket-b"><img src="${imgs(l)[0]}" alt="">
      <dl><dt>Product</dt><dd><b>${esc(l.name)}</b></dd><dt>Listed quantity</dt><dd>${listedQty(l)} units${b ? ` <span class="mute">(verified from batch of ${b.qty})</span>` : ''}</dd><dt>Expiry date</dt><dd>${fmtDate(l.expiry)}</dd><dt>Rescue price</dt><dd>${rm(l.price)} <s class="mute">${rm(l.orig)}</s></dd><dt>Clearance status</dt><dd>${sp(l.clearance, CL_CLS[l.clearance])}</dd></dl>
      <div class="basket-acts">${waiting ? `<button class="btn sage" data-act="moved" data-id="${l.id}">${ic('check', 'sm')}Confirm Moved to Clearance Basket</button><span class="mute sm">The listing becomes visible to buyers after you confirm.</span>`
        : `<label class="l sm" for="cl-${l.id}">Update clearance status</label><select class="sel" id="cl-${l.id}" data-cl="${l.id}">${CLEAR.map((x) => `<option ${x === l.clearance ? 'selected' : ''}>${x}</option>`).join('')}</select><a class="btn sec" href="#/item/${l.id}">View listing</a>`}
        <a class="btn sec" href="#/listings">My Listings</a><a class="link sm" href="#/reservations?view=seller&tab=pending">Manage reservations ${ic('arrow', 'xs')}</a></div></div>
    <div class="track">${steps(CLEAR, idx)}</div>
    <p class="mute sm" style="padding:0 20px 18px">Statuses are updated manually by you. FreshSave can't detect when items are physically moved or collected.</p></div></div>`
}

export const routes = { sell: (p) => pageSell(p[1]), listings: pageListings, basket: (p, q) => (p[1] ? pageBasket(p[1], q.get('new')) : pageBasketAll()) }
export const actions = {
  wznew: () => { if (FORMS.wz?.edit) delete FORMS.wz },
  wzcancel: () => { delete FORMS.wz },
  wzback: () => { FORMS.wz.step--; FORMS.wz.err = {}; app.render() },
  wzrmphoto: (el) => { FORMS.wz.photos.splice(+el.dataset.i, 1); app.render() },
  moved: (el) => { const l = getL(el.dataset.id); confirmDlg({ title: 'Confirm items moved?', ok: 'Confirm moved', cls: 'sage', body: `<p>Confirm that <b>${listedQty(l)} x ${esc(l.name)}</b> are now physically in the FreshSave Clearance Basket and labelled for pickup.</p>`, onOk: () => { l.clearance = 'In Clearance Basket'; if (l.status === 'pending') l.status = 'active'; logAct('basket', `Moved ${l.name} to the Clearance Basket`); save(); toast('Moved to Clearance Basket – listing is now live'); app.refreshChrome(); app.render() } }) },
  lremove: (el) => { const l = getL(el.dataset.id); const open = resFor(l.id).filter((r) => OPEN.includes(r.status))
    confirmDlg({ title: 'Remove listing?', ok: 'Remove listing', cls: 'danger', body: `<p><b>${esc(l.name)}</b> will be removed from the marketplace.${open.length ? ` ${plural(open.length, 'open reservation')} will be cancelled and the buyers notified.` : ''}</p>`,
      onOk: () => { open.forEach((r) => { r.status = 'cancelled'; r.by = 'seller'; notify(r.buyerId, 'resv', 'Reservation cancelled – listing removed', `${r.qty} x ${l.name}`, `#/reservation/${r.id}`) }); l.status = 'removed'; logAct('trash', `Removed listing ${l.name}`); save(); toast('Listing removed'); app.render() } }) },
}
export function change(e) {
  const t = e.target
  if (t.dataset.cl) { setClearance(getL(t.dataset.cl), t.value); return true }
  if (t.id === 'wz-photos' && t.files.length) { readImages(t.files, 4 - FORMS.wz.photos.length).then((xs) => { FORMS.wz.photos.push(...xs); app.render() }); return true }
  return false
}
export function submit(e) {
  if (e.target.id !== 'f-wz') return false
  if (!validate()) { app.render(); return true }
  if (FORMS.wz.step < 3) { FORMS.wz.step++; FORMS.wz.err = {}; app.render(); window.scrollTo(0, 0) }
  else publish()
  return true
}
