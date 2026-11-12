// Reservations (buyer & seller views), pickup confirmation and completed rescue records.
import {
  S, save, $, esc, ic, rm, toast, go, app, me, isRetailer, getL, getR, getSeller, imgs, thumb, dist, uid, rcode, fmtDate, fmtDT, ago,
  R_LABEL, R_CLS, OPEN, sp, pageHead, empty, steps, confirmDlg, notify, logAct, sellerUser, avatar, plural, CL_CLS,
} from '../core.js'

const sellerOf = (r) => getSeller(getL(r.listingId)?.seller)
const isSellerOf = (r) => getL(r.listingId)?.seller === me().sellerId
const prefOn = (uid) => S.users.find((u) => u.id === uid)?.prefs?.resv !== false

function closeIfDone(l) {
  if (l.qty <= 0 && !S.reservations.some((x) => x.listingId === l.id && OPEN.includes(x.status))) l.status = 'completed'
}
export function createReservation(l, n) {
  const r = { id: uid('r'), listingId: l.id, qty: n, status: 'pending', buyerId: me().id, buyerName: me().name, code: rcode(), createdAt: Date.now() }
  l.qty -= n
  S.reservations.unshift(r)
  const su = sellerUser(l.seller)
  if (su && prefOn(su.id)) notify(su.id, 'resv', `New reservation request from ${me().name}`, `${n} x ${l.name} · review and accept or reject`, '#/reservations?tab=pending')
  logAct('receipt', `Reserved ${n} x ${l.name}`)
  save()
  if (!su) simulate(r.id)
  return r
}
// Prototype only: demo sellers without an account respond automatically.
export function simulate(rid) {
  setTimeout(() => {
    const r = getR(rid); if (!r || r.status !== 'pending') return
    r.status = 'confirmed'; r.decidedAt = Date.now()
    const l = getL(r.listingId)
    if (prefOn(r.buyerId)) notify(r.buyerId, 'resv', `Reservation confirmed by ${getSeller(l.seller).name}`, `${r.qty} x ${l.name} · code ${r.code}`, `#/reservation/${r.id}`)
    save(); app.refreshChrome()
    if (['reservation', 'reservations', 'item', 'dashboard'].includes(location.hash.split(/[/?]/)[1])) app.render()
  }, 4000)
}
function accept(r) {
  const l = getL(r.listingId)
  confirmDlg({ title: 'Accept reservation?', ok: 'Accept', cls: 'sage',
    body: `<p><b>${esc(r.buyerName)}</b> will collect <b>${r.qty} x ${esc(l.name)}</b> and pay ${rm(l.price * r.qty)} in person.</p><p class="note">${ic('basket', 'sm')}<span>Set the items aside and update the Clearance Basket status when they're reserved.</span></p>`,
    onOk: () => { r.status = 'confirmed'; r.decidedAt = Date.now(); if (prefOn(r.buyerId)) notify(r.buyerId, 'resv', `Reservation confirmed by ${getSeller(l.seller).name}`, `${r.qty} x ${l.name} · code ${r.code}`, `#/reservation/${r.id}`); logAct('check', `Accepted reservation ${r.code} from ${r.buyerName}`); save(); toast('Reservation accepted – buyer notified'); app.refreshChrome(); app.render() } })
}
function reject(r) {
  const l = getL(r.listingId)
  confirmDlg({ title: 'Reject reservation?', ok: 'Reject', cls: 'danger',
    body: `<p>${plural(r.qty, 'unit')} will return to the listing's available quantity and ${esc(r.buyerName)} will be notified.</p>`,
    onOk: () => { r.status = 'cancelled'; r.by = 'seller'; r.decidedAt = Date.now(); l.qty += r.qty; if (l.status === 'completed') l.status = 'active'; if (prefOn(r.buyerId)) notify(r.buyerId, 'resv', 'Reservation not accepted', `${getSeller(l.seller).name} couldn't fulfil ${r.qty} x ${l.name}`, `#/reservation/${r.id}`); logAct('ban', `Rejected reservation ${r.code}`); save(); toast('Reservation rejected'); app.refreshChrome(); app.render() } })
}
function cancel(r) {
  const l = getL(r.listingId)
  confirmDlg({ title: 'Cancel this reservation?', ok: 'Cancel reservation', cls: 'danger',
    body: `<p>${r.qty} x ${esc(l.name)} will be released back to the listing.</p>`,
    onOk: () => { r.status = 'cancelled'; r.by = 'buyer'; r.decidedAt = Date.now(); l.qty += r.qty; if (l.status === 'completed') l.status = 'active'; const su = sellerUser(l.seller); if (su && prefOn(su.id)) notify(su.id, 'resv', `Reservation cancelled by ${r.buyerName}`, `${r.qty} x ${l.name} returned to available quantity`, '#/reservations?tab=cancelled'); save(); toast('Reservation cancelled'); app.refreshChrome(); app.render() } })
}
function collect(r) {
  const l = getL(r.listingId), seller = isSellerOf(r)
  confirmDlg({ title: 'Confirm collection', ok: 'Confirm collected', cls: 'sage',
    body: seller ? `<p>Check the buyer's code matches <span class="code sm">${r.code}</span> and that they paid ${rm(l.price * r.qty)} in person, then hand over <b>${r.qty} x ${esc(l.name)}</b>.</p>`
      : `<p>Confirm you've collected <b>${r.qty} x ${esc(l.name)}</b> from ${esc(getSeller(l.seller).name)} and paid ${rm(l.price * r.qty)} in person.</p>`,
    onOk: () => {
      r.status = 'completed'; r.collectedAt = Date.now(); r.collectedBy = seller ? 'seller' : 'buyer'
      closeIfDone(l)
      const other = seller ? r.buyerId : sellerUser(l.seller)?.id
      if (other && prefOn(other)) notify(other, 'collect', `Collection confirmed – ${l.name}`, `${r.qty} x collected · recorded as a completed rescue`, `#/reservation/${r.id}`)
      logAct('check2', `Completed rescue: ${r.qty} x ${l.name}`)
      save(); toast('Collection confirmed – rescue recorded'); app.refreshChrome(); app.render()
    } })
}

/* ---------------- List views ---------------- */
const B_TABS = [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]
const S_TABS = [['pending', 'Incoming requests'], ['confirmed', 'Confirmed'], ['completed', 'Completed transactions'], ['cancelled', 'Cancelled']]
function pageReservations(parts, q) {
  const view = q.get('view') || (isRetailer() ? 'seller' : 'buyer')
  const tab = q.get('tab') || 'pending'
  const all = view === 'seller' ? S.reservations.filter(isSellerOf) : S.reservations.filter((r) => r.buyerId === me().id)
  const tabs = view === 'seller' ? S_TABS : B_TABS
  const xs = all.filter((r) => r.status === tab).sort((a, b) => (b.collectedAt || b.createdAt) - (a.collectedAt || a.createdAt))
  const link = (t, v = view) => `#/reservations?view=${v}&tab=${t}`
  let body
  if (!xs.length) body = `<div class="tabempty">${all.length ? `No ${tabs.find((t) => t[0] === tab)[1].toLowerCase()} reservations.` : view === 'seller' ? empty('receipt', 'No reservations yet', 'When buyers reserve your listings, requests appear here for you to accept or reject.', '<a class="btn" href="#/listings">My Listings</a>') : empty('receipt', 'No reservations yet', 'Reserve discounted surplus food from sellers near you, then collect it in person.', '<a class="btn" href="#/market">Browse Marketplace</a>')}</div>`
  else if (view === 'seller') body = `<table class="tbl"><thead><tr><th>Product</th><th>Buyer</th><th>Reserved qty</th><th>Remaining available</th><th>Reserved on</th><th>Status</th><th>Actions</th></tr></thead><tbody>${xs.map((r) => { const l = getL(r.listingId); return `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/reservation/${r.id}"><b>${esc(l.name)}</b></a><span class="mute sm">${r.code} · ${rm(l.price * r.qty)} in person</span></div></div></td>
    <td data-l="Buyer">${esc(r.buyerName)}</td><td data-l="Reserved qty"><b>${r.qty}</b></td><td data-l="Remaining available">${l.qty}</td><td data-l="Reserved on">${fmtDT(r.createdAt)}</td>
    <td data-l="Status">${sp(r.status === 'cancelled' && r.by ? `Cancelled by ${r.by}` : R_LABEL[r.status], R_CLS[r.status])}</td>
    <td data-l="Actions"><div class="acts-cell">${r.status === 'pending' ? `<button class="btn sm danger" data-act="rreject" data-id="${r.id}">Reject</button><button class="btn sm sage" data-act="raccept" data-id="${r.id}">Accept</button>` : r.status === 'confirmed' ? `<button class="btn sm sage" data-act="rcollect" data-id="${r.id}">Confirm collection</button>` : ''}<a class="ibtn" href="#/reservation/${r.id}">View</a></div></td></tr>` }).join('')}</tbody></table>`
  else body = `<table class="tbl"><thead><tr><th>Product</th><th>Seller</th><th>Qty</th><th>Reserved on</th><th>Pickup location</th><th>Status</th><th></th></tr></thead><tbody>${xs.map((r) => { const l = getL(r.listingId), s = getSeller(l.seller); return `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(l)}" alt=""><div><a href="#/reservation/${r.id}"><b>${esc(l.name)}</b></a><span class="mute sm">${r.code} · ${rm(l.price * r.qty)}</span></div></div></td>
    <td data-l="Seller">${esc(s.name)}</td><td data-l="Qty">${r.qty}</td><td data-l="Reserved on">${fmtDT(r.createdAt)}</td><td data-l="Pickup">${esc(s.area)}</td>
    <td data-l="Status">${sp(r.status === 'cancelled' && r.by === 'seller' ? 'Declined by seller' : R_LABEL[r.status], R_CLS[r.status])}</td><td data-l=""><a class="btn sm sec" href="#/reservation/${r.id}">${r.status === 'completed' ? 'View record' : r.status === 'confirmed' ? 'Pickup details' : 'View'}</a></td></tr>` }).join('')}</tbody></table>`
  const pend = S.reservations.filter((r) => isSellerOf(r) && r.status === 'pending').length
  return `${pageHead(view === 'seller' ? 'Reservations' : 'My Reservations', view === 'seller' ? 'Requests from buyers for your listings.' : 'Food you have reserved for pickup.')}
  <div class="seg"><a class="${view === 'buyer' ? 'on' : ''}" href="${link('pending', 'buyer')}">As buyer</a><a class="${view === 'seller' ? 'on' : ''}" href="${link('pending', 'seller')}">As seller${pend ? ` <i>${pend}</i>` : ''}</a></div>
  <div class="tabs">${tabs.map(([k, t]) => `<a class="tab ${tab === k ? 'on' : ''}" href="${link(k)}">${t}<i>${all.filter((r) => r.status === k).length}</i></a>`).join('')}</div>${body}`
}

/* ---------------- Reservation detail / pickup / record ---------------- */
function pageReservation(id) {
  const r = getR(id), l = r && getL(r.listingId)
  if (!r || !l || (r.buyerId !== me().id && !isSellerOf(r))) return empty('info', 'Reservation not found', '', '<a class="btn" href="#/reservations">Reservations</a>')
  const s = getSeller(l.seller), seller = isSellerOf(r)
  const idx = { pending: 0, confirmed: 1, completed: 2 }[r.status] ?? 0
  const head = {
    pending: ['Reservation requested', seller ? `${r.buyerName} requested ${r.qty} x ${l.name}. Accept or reject the request.` : `Waiting for ${s.name} to confirm your request.`],
    confirmed: ['Reservation confirmed', seller ? 'Prepare the items. Confirm collection when the buyer picks them up and pays.' : `Collect from ${s.name}. Show your reservation code and pay in person.`],
    completed: ['Rescue completed', `Collected ${r.collectedAt ? fmtDT(r.collectedAt) : ''}. This transaction is recorded as a completed rescue.`],
    cancelled: [r.by === 'seller' ? 'Reservation not accepted' : 'Reservation cancelled', 'This reservation is closed. Reserved units were returned to the listing.'],
  }[r.status]
  const closed = r.status === 'cancelled'
  const acts = []
  acts.push(seller ? '' : `<button class="btn sec" data-act="chat" data-s="${s.id}" data-l="${l.id}">${ic('chat', 'sm')}Contact seller</button>`)
  if (seller && r.status === 'pending') acts.push(`<button class="btn danger" data-act="rreject" data-id="${r.id}">Reject</button><button class="btn sage" data-act="raccept" data-id="${r.id}">Accept</button>`)
  if (!seller && OPEN.includes(r.status)) acts.push(`<button class="btn danger" data-act="rcancel" data-id="${r.id}">Cancel reservation</button>`)
  if (r.status === 'confirmed') acts.push(`<button class="btn sage" data-act="rcollect" data-id="${r.id}">${ic('check', 'sm')}Confirm collection</button>`)
  if (!seller && (r.status === 'completed' || closed)) acts.push(`<a class="btn" href="#/market">Browse more food</a>`)
  const record = r.status === 'completed' ? `<section class="box record"><div class="rec-head"><h3>${ic('receipt', 'sm')} Completed rescue record</h3>${sp('Completed', '')}</div>
    <dl class="deflist"><dt>Record no.</dt><dd>${r.code}</dd><dt>Collected</dt><dd>${r.collectedAt ? fmtDT(r.collectedAt) : '–'}</dd><dt>Product</dt><dd>${esc(l.name)}</dd><dt>Quantity rescued</dt><dd>${r.qty}</dd><dt>Paid in person</dt><dd>${rm(l.price * r.qty)} <span class="mute">(original ${rm(l.orig * r.qty)})</span></dd><dt>Seller</dt><dd>${esc(s.name)}</dd><dt>Buyer</dt><dd>${esc(r.buyerName)}</dd><dt>Pickup location</dt><dd>${esc(s.area)}</dd></dl></section>` : ''
  return `<div class="confirm">
    <div class="crumbs"><a href="#/reservations${seller ? '?view=seller' : ''}">${seller ? 'Reservations' : 'My Reservations'}</a>${ic('cr', 'xs')}<span>${r.code}</span></div>
    <div class="okbar ${closed ? 'bad' : r.status === 'pending' ? 'wait' : ''}"><span class="c">${ic(closed ? 'x' : r.status === 'pending' ? 'clock' : 'check')}</span><div><h2>${head[0]}</h2><div class="mute">${esc(head[1])}</div></div></div>
    ${closed ? '' : `<div class="box"><div class="codebar"><div><div class="mute sm">Reservation code${seller ? '' : ' – show this at pickup'}</div><div class="code">${r.code}</div></div>${sp(R_LABEL[r.status], R_CLS[r.status])}</div>${steps(['Reserved', 'Confirmed by seller', 'Collected'], idx)}</div>`}
    ${record}
    <div class="two">
      <div class="box"><h3>Product details</h3><div class="srow"><img src="${imgs(l)[0]}" alt=""><div><a href="#/item/${l.id}"><b>${esc(l.name)}</b></a><div class="mute sm">Expiry ${fmtDate(l.expiry)}</div></div></div>
        <dl class="deflist tight" style="margin-top:14px"><dt>Reserved qty</dt><dd><b>${r.qty}</b> x ${rm(l.price)} <s class="mute">${rm(l.orig)}</s></dd><dt>Total</dt><dd><b>${rm(l.price * r.qty)}</b> – pay in person at pickup</dd><dt>Status</dt><dd>${sp(R_LABEL[r.status], R_CLS[r.status])}</dd><dt>Reserved on</dt><dd>${fmtDT(r.createdAt)}</dd>${seller ? `<dt>Buyer</dt><dd>${esc(r.buyerName)}</dd><dt>Still available</dt><dd>${l.qty} on listing</dd>` : ''}</dl></div>
      <div class="box"><h3>Pickup information</h3><div class="seller">${avatar(s)}<div class="who"><b>${esc(s.name)}<span class="tagtype">${s.role === 'retailer' ? 'Retailer' : 'Individual'}</span></b><span class="mute sm">${s.hours}</span></div></div>
        <dl class="deflist tight" style="margin-top:14px"><dt>Pickup address</dt><dd>${esc(s.area)}${seller ? '' : `<br><span class="mute sm">${dist(l)} km from your selected location</span>`}</dd><dt>Instructions</dt><dd>${esc(l.instr)}</dd><dt>Payment</dt><dd>In person at the pickup location. No online payment or delivery.</dd><dt>Hold period</dt><dd class="mute">Not yet defined – to be confirmed by FreshSave</dd></dl></div>
    </div>
    <div class="row-acts end">${acts.join('')}</div>
    ${!seller && r.status === 'pending' && !sellerUser(l.seller) ? '<p class="mute sm" style="text-align:right">Prototype: this demo seller confirms automatically after a few seconds.</p>' : ''}
  </div>`
}

export const routes = { reservations: pageReservations, reservation: (p) => pageReservation(p[1]) }
export const actions = {
  raccept: (el) => accept(getR(el.dataset.id)),
  rreject: (el) => reject(getR(el.dataset.id)),
  rcancel: (el) => cancel(getR(el.dataset.id)),
  rcollect: (el) => collect(getR(el.dataset.id)),
}
export function resume() {
  S.reservations.filter((r) => r.status === 'pending' && !sellerUser(getL(r.listingId)?.seller) && S.users.some((u) => u.id === r.buyerId)).forEach((r) => simulate(r.id))
}
