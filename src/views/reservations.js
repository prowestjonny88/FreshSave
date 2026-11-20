// Reservations (buyer & seller views), pickup deadlines, code-checked handover and the agreed-terms record.
import {
  S, $, esc, ic, rm, toast, app, me, isRetailer, getL, getR, getSeller, thumb, uid, fmtDate, fmtDT, plural,
  R_LABEL, R_CLS, OPEN, EXP_REASON, POLICY, sp, pageHead, empty, steps, confirmDlg, openModal, closeModal, avatar, sellerTag, avail, ledger, km, dateWord, whenShort, timeLeft,
  resLabel, resCls, isSellerOf, createReservation, confirmRes, declineRes, cancelRes, completeRes, disputeRes, sellerUser, termsDeadline, deadlineTs, fmtTime, imgs, expLong, disclose,
} from '../core.js'
import { openAddFood } from './tracking.js'

// Prototype only: demo sellers without an account respond automatically.
export function simulate(rid) {
  setTimeout(() => {
    const r = getR(rid); if (!r || r.status !== 'pending') return
    confirmRes(r)
    app.refreshChrome()
    if (['reservation', 'reservations', 'item', 'dashboard'].includes(location.hash.split(/[/?]/)[1])) app.render()
  }, 4000)
}
export const noSellerAccount = (r) => !sellerUser(r.terms.sellerId)
export function reserve(l, n) {
  const res = createReservation(l, n)
  if (res.r && noSellerAccount(res.r)) simulate(res.r.id)
  return res
}
const isSampleBuyer = (r) => !S.users.some((u) => u.id === r.buyerId)
const sample = (r) => (r.sample ? ' <span class="tagtype sample">Sample record</span>' : '')

/* ---------------- Actions ---------------- */
function accept(r) {
  confirmDlg({ title: 'Accept this request?', ok: 'Accept', cls: 'sage',
    body: `<p><b>${esc(r.buyerName)}</b> will collect <b>${r.qty} x ${esc(r.terms.name)}</b> and pay <b>${rm(r.terms.price * r.qty)}</b> in person.</p>
    <ul class="plainlist"><li>Units are held until <b>${whenShort(Math.min(termsDeadline(r), Date.now() + POLICY.holdH * 36e5))}</b>. If they are not collected by then the reservation expires and the units are released.</li><li>Set the units aside in the Clearance Basket, labelled <b>${r.ref}</b>.</li><li>At pickup, ask the buyer for their 4-digit pickup code and enter it to complete the handover.</li></ul>`,
    onOk: () => { const e = confirmRes(r); e ? toast(e, 'alert') : toast('Accepted – buyer notified'); app.refreshChrome(); app.render() } })
}
function decline(r) {
  confirmDlg({ title: 'Decline this request?', ok: 'Decline', cls: 'danger',
    body: `<p>${plural(r.qty, 'unit')} return to the listing and ${esc(r.buyerName)} is notified.</p>`,
    onOk: () => { declineRes(r); toast('Request declined'); app.refreshChrome(); app.render() } })
}
function cancel(r, seller) {
  confirmDlg({ title: seller ? 'Cancel this confirmed pickup?' : 'Cancel this reservation?', ok: 'Cancel reservation', cls: 'danger', cancel: 'Keep it',
    body: `<p>${r.qty} x ${esc(r.terms.name)} will be released back to the listing${seller ? ` and ${esc(r.buyerName)} is notified` : ''}.</p>${seller ? `<div class="fld"><label class="l" for="cx-reason">Reason (shown to the buyer)</label><select id="cx-reason"><option>Stock is no longer available</option><option>Item found damaged</option><option>Other</option></select></div>` : ''}`,
    onOk: () => { cancelRes(r, seller ? 'seller' : 'buyer', seller ? $('#cx-reason')?.value : ''); toast('Reservation cancelled'); app.refreshChrome(); app.render() } })
}
function handoverDialog(r, err = '') {
  const hint = isSampleBuyer(r) ? `<p class="note warn">${ic('info', 'sm')}<span>Prototype hint: ${esc(r.buyerName)} is a sample buyer, so their pickup code is <b class="mono">${r.pin}</b>. In real use only the buyer knows it.</span></p>` : ''
  openModal(`<h3>Complete handover</h3><form id="f-handover" novalidate data-r="${r.id}">
    <p>Ask <b>${esc(r.buyerName)}</b> for the 4-digit pickup code shown in their FreshSave reservation, then enter it here.</p>${hint}
    <div class="fld ${err ? 'err' : ''}"><label class="l" for="ho-code">Buyer's pickup code</label><input id="ho-code" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 digits" style="max-width:160px;letter-spacing:.3em;font-weight:700" ${err ? 'aria-invalid="true" aria-describedby="ho-e"' : ''}><div class="e" id="ho-e" role="alert">${esc(err)}</div></div>
    <label class="chk"><input type="checkbox" id="ho-item"> I handed over <b>&nbsp;${r.qty} x ${esc(r.terms.name)}</b>, sealed, with the printed date unchanged</label>
    <label class="chk"><input type="checkbox" id="ho-pay"> I received ${rm(r.terms.price * r.qty)} in person</label>
    <p class="mute sm" style="margin-top:10px">A matching code shows the person collecting holds the code issued to the buyer in this app. It does not verify identity, payment or food condition. Only code-checked handovers count in activity totals.</p>
    <div class="macts"><button type="button" class="btn sec" data-act="mclose">Cancel</button><button class="btn sage" type="submit">Record handover</button></div></form>`)
}
function simulateHandover(r) {
  confirmDlg({ title: 'Simulate the seller\'s handover?', ok: 'Simulate handover', cls: 'sage',
    body: `<p>${esc(r.terms.sellerName)} is a sample seller with no account, so nobody can enter your code. This <b>prototype-only</b> step records a <b>simulated</b> handover.</p><p class="mute sm">Simulated handovers are labelled as such and are not counted in activity totals.</p>`,
    onOk: () => { completeRes(r, null, { simulated: true, checked: true }); toast('Simulated handover recorded'); app.refreshChrome(); app.render() } })
}
function report(r) {
  confirmDlg({ title: 'Report a problem with this handover?', ok: 'Report problem', cls: 'danger',
    body: `<p>Use this if the seller marked this as handed over but you did not receive the food, or it was not as described.</p><p>The record is marked <b>Disputed</b>, the seller is notified, and it is excluded from activity totals. FreshSave cannot mediate disputes in this prototype.</p>`,
    onOk: () => { disputeRes(r); toast('Marked as disputed'); app.render() } })
}

/* ---------------- List views ---------------- */
const TABS = (seller) => [['pending', seller ? 'Needs response' : 'Awaiting seller'], ['confirmed', 'Ready for pickup'], ['completed', 'Handed over'], ['closed', 'Closed']]
const inTab = (r, t) => (t === 'closed' ? ['cancelled', 'declined', 'expired'].includes(r.status) : r.status === t)
const dueOf = (r) => (r.status === 'pending' ? r.respondBy : r.status === 'confirmed' ? r.collectBy : 0)
function timing(r) {
  if (r.status === 'pending') return `<b>Respond by ${whenShort(r.respondBy)}</b><span class="mute sm ${r.respondBy - Date.now() < 36e5 ? 'hot' : ''}">${timeLeft(r.respondBy)}</span>`
  if (r.status === 'confirmed') return `<b>Collect by ${whenShort(r.collectBy)}</b><span class="mute sm ${r.collectBy - Date.now() < 36e5 * 3 ? 'hot' : ''}">${timeLeft(r.collectBy)}</span>`
  if (r.status === 'completed') return `<span>${fmtDT(r.collectedAt)}</span>`
  if (r.status === 'expired') return `<span>${esc(EXP_REASON[r.reason] || 'Expired')}</span>`
  return `<span>${r.status === 'declined' ? 'Declined' : 'Cancelled'} ${fmtDT(r.decidedAt || r.createdAt)}</span>`
}
function pageReservations(parts, q) {
  const R = isRetailer()
  const view = q.get('view') || (R ? 'seller' : 'buyer')
  const mine = (v) => (v === 'seller' ? S.reservations.filter(isSellerOf) : S.reservations.filter((r) => r.buyerId === me().id))
  const all = mine(view), tabs = TABS(view === 'seller')
  const tab = q.get('tab') || (['confirmed', 'pending', 'completed', 'closed'].find((t) => all.some((r) => inTab(r, t))) || 'pending')
  const xs = all.filter((r) => inTab(r, tab)).sort((a, b) => (dueOf(a) && dueOf(b) ? dueOf(a) - dueOf(b) : (b.collectedAt || b.decidedAt || b.createdAt) - (a.collectedAt || a.decidedAt || a.createdAt)))
  const link = (t, v = view) => `#/reservations?view=${v}&tab=${t}`
  const next = view === 'buyer' ? all.filter((r) => r.status === 'confirmed').sort((a, b) => a.collectBy - b.collectBy)[0] : null
  let body
  if (!xs.length) body = `<div class="tabempty">${all.length ? `Nothing in “${tabs.find((t) => t[0] === tab)[1]}”.` : view === 'seller' ? empty('receipt', 'No reservations yet', 'When buyers reserve your listings, requests appear here. You then have 2 hours to accept or decline.', '<a class="btn" href="#/listings">My listings</a>') : empty('receipt', 'No reservations yet', 'Find sealed pantry and bakery items near you, reserve, then collect in person and pay at pickup.', '<a class="btn" href="#/market">Find food</a>')}</div>`
  else if (view === 'seller') {
    const st = tab === 'completed' || tab === 'closed'
    body = `<table class="tbl"><thead><tr><th>Product (agreed terms)</th><th>Buyer</th><th>Quantity</th><th>${tab === 'pending' ? 'Respond by' : tab === 'confirmed' ? 'Collect by' : 'When'}</th>${st ? '<th>Status</th>' : ''}<th><span class="sr-only">Actions</span></th></tr></thead><tbody>${xs.map((r) => { const l = getL(r.listingId); return `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(l || r.terms)}" alt=""><div><a href="#/reservation/${r.id}"><b>${esc(r.terms.name)}</b></a><span class="mute sm">Ref ${r.ref}${l && !st ? ` · ${avail(l)} still available` : ''}</span>${sample(r)}</div></div></td>
    <td data-l="Buyer">${esc(r.buyerName)}</td><td data-l="Quantity"><div class="datecell"><b>${r.qty} x</b><span class="dl">${rm(r.terms.price * r.qty)} in person</span></div></td><td data-l="${tab === 'pending' ? 'Respond by' : tab === 'confirmed' ? 'Collect by' : 'When'}"><div class="tcell">${timing(r)}</div></td>
    ${st ? `<td data-l="Status">${sp(resLabel(r), resCls(r))}</td>` : ''}
    <td data-l="" class="act-c"><div class="acts-cell">${r.status === 'pending' ? `<button class="btn sm sec" data-act="rdecline" data-id="${r.id}">Decline</button><button class="btn sm sage" data-act="raccept" data-id="${r.id}">Accept</button>` : r.status === 'confirmed' ? `<button class="btn sm sage" data-act="rhandover" data-id="${r.id}">Complete handover</button>` : `<a class="ibtn" href="#/reservation/${r.id}">View</a>`}</div></td></tr>` }).join('')}</tbody></table>`
  } else {
    const st = tab === 'completed' || tab === 'closed'
    body = `<table class="tbl"><thead><tr><th>Product (agreed terms)</th><th>Seller</th><th>Quantity</th><th>When</th>${st ? '<th>Status</th>' : ''}<th><span class="sr-only">Actions</span></th></tr></thead><tbody>${xs.map((r) => `<tr>
    <td class="pc"><div class="pcell"><img src="${thumb(getL(r.listingId) || r.terms)}" alt=""><div><a href="#/reservation/${r.id}"><b>${esc(r.terms.name)}</b></a><span class="mute sm">Ref ${r.ref}</span>${sample(r)}</div></div></td>
    <td data-l="Seller">${esc(r.terms.sellerName)}</td><td data-l="Quantity"><div class="datecell"><b>${r.qty} x</b><span class="dl">${rm(r.terms.price * r.qty)} at pickup</span></div></td><td data-l="When"><div class="tcell">${timing(r)}</div></td>
    ${st ? `<td data-l="Status">${sp(resLabel(r), resCls(r))}</td>` : ''}<td data-l="" class="act-c"><a class="btn sm ${r.status === 'confirmed' ? '' : 'sec'}" href="#/reservation/${r.id}">${r.status === 'confirmed' ? 'Show pickup code' : r.status === 'completed' ? 'View record' : 'View'}</a></td></tr>`).join('')}</tbody></table>`
  }
  const pend = mine('seller').filter((r) => r.status === 'pending').length, rdy = mine('buyer').filter((r) => r.status === 'confirmed').length
  return `${pageHead(view === 'seller' ? 'Reservations & handovers' : 'My reservations', view === 'seller' ? 'Accept within 2 hours, then complete each handover with the buyer\'s pickup code.' : 'Reserved food to collect. You pay the seller in person.', '', 'Rescue')}
  ${R ? `<div class="seg"><a class="${view === 'seller' ? 'on' : ''}" href="${link('pending', 'seller')}">Handling reservations${pend ? ` <i>${pend}</i>` : ''}</a><a class="${view === 'buyer' ? 'on' : ''}" href="${link('pending', 'buyer')}">My own orders</a></div>` : ''}
  ${next ? `<section class="nextpick"><div class="np-h">${ic('key')}<div><span class="kicker k-rescue">Next pickup</span><h2>${esc(next.terms.name)}</h2></div><span class="sp g">${timeLeft(next.collectBy)}</span></div>
    <dl class="deflist tight"><dt>Collect by</dt><dd><b>${whenShort(next.collectBy)}</b> · store hours ${fmtTime(next.terms.window.from)}–${fmtTime(next.terms.window.to)}</dd><dt>Where</dt><dd>${esc(next.terms.sellerName)}, ${esc(next.terms.sellerArea)}</dd><dt>Pickup code</dt><dd><span class="code sm">${next.pin}</span> <span class="mute sm">Show it to the seller. Ref ${next.ref}</span></dd></dl>
    <a class="btn sm" href="#/reservation/${next.id}">Pickup details</a></section>` : ''}
  <div class="tabs">${tabs.map(([k, t]) => `<a class="tab ${tab === k ? 'on' : ''}" href="${link(k)}">${t}<i>${all.filter((r) => inTab(r, k)).length}</i></a>`).join('')}</div>${body}`
}

/* ---------------- Reservation detail / agreed terms ---------------- */
const EV = { requested: 'Requested', confirmed: 'Accepted by seller', handover: 'Handover recorded', cancelled: 'Cancelled', declined: 'Declined', expired: 'Expired', disputed: 'Disputed by buyer' }
function pageReservation(id) {
  const r = getR(id)
  if (!r || (r.buyerId !== me().id && !isSellerOf(r))) return empty('info', 'Reservation not found', '', '<a class="btn" href="#/reservations">Reservations</a>')
  const t = r.terms, l = getL(r.listingId), seller = isSellerOf(r), s = getSeller(t.sellerId) || { name: t.sellerName, hue: '#777', role: t.sellerRole }
  const idx = { pending: 0, confirmed: 1, completed: 2 }[r.status] ?? 0
  const closed = !['pending', 'confirmed', 'completed'].includes(r.status)
  const head = {
    pending: ['Waiting for the seller', seller ? `${r.buyerName} requested ${r.qty} x ${t.name}. Accept or decline by ${fmtDT(r.respondBy)}, or the request lapses.` : `${t.sellerName} has until ${fmtDT(r.respondBy)} to respond. If they don't, the request expires and nothing is charged.`],
    confirmed: ['Ready for pickup', seller ? `Set the units aside, then complete the handover by entering the buyer's pickup code. Hold ends ${fmtDT(r.collectBy)}.` : `Collect from ${t.sellerName} by ${fmtDT(r.collectBy)}. Show your pickup code and pay in person.`],
    completed: [r.disputed ? 'Handover disputed' : r.handover?.method === 'simulated' ? 'Simulated handover recorded' : 'Handover recorded', r.disputed ? 'The buyer reported a problem. This record is excluded from activity totals.' : r.handover?.method === 'simulated' ? 'A sample seller has no account, so this handover was simulated for the demo. It is not counted in activity totals.' : `Recorded by the seller on ${fmtDT(r.collectedAt)} after checking the buyer's pickup code. This is a record, not independent proof that the food changed hands.`],
    cancelled: [`Cancelled by ${r.by || 'user'}`, `${r.reason ? r.reason + '. ' : ''}The ${plural(r.qty, 'unit')} were released back to the listing.`],
    declined: ['Declined by the seller', `The ${plural(r.qty, 'unit')} were released and nothing is owed.`],
    expired: ['Expired', `${EXP_REASON[r.reason] || ''}. The ${plural(r.qty, 'unit')} were released. Nothing is owed.`],
  }[r.status]
  const tone = r.status === 'confirmed' ? '' : r.status === 'completed' ? (r.disputed || r.handover?.method === 'simulated' ? 'wait' : '') : r.status === 'pending' ? 'wait' : 'bad'
  const acts = []
  if (!seller) acts.push(`<button class="btn sec" data-act="chat" data-s="${t.sellerId}" data-l="${r.listingId}">${ic('chat', 'sm')}Contact seller (simulated)</button>`)
  if (seller && r.status === 'pending') acts.push(`<button class="btn sec" data-act="rdecline" data-id="${r.id}">Decline</button><button class="btn sage" data-act="raccept" data-id="${r.id}">Accept</button>`)
  if (seller && r.status === 'confirmed') acts.push(`<button class="btn sec" data-act="rcancelseller" data-id="${r.id}">Cancel pickup</button><button class="btn sage" data-act="rhandover" data-id="${r.id}">${ic('key', 'sm')}Complete handover</button>`)
  if (!seller && OPEN.includes(r.status)) acts.push(`<button class="btn danger" data-act="rcancel" data-id="${r.id}">Cancel reservation</button>`)
  if (!seller && r.status === 'confirmed' && noSellerAccount(r)) acts.push(`<button class="btn sec" data-act="rsimulate" data-id="${r.id}">Prototype: simulate seller handover</button>`)
  if (!seller && r.status === 'completed' && !r.disputed && r.handover?.method === 'code') acts.push(`<button class="btn danger" data-act="rreport" data-id="${r.id}">Report a problem</button>`)
  if (!seller && r.status === 'completed' && !r.disputed && !isRetailer()) acts.push(`<button class="btn" data-act="addfrom" data-id="${r.id}">${ic('plus', 'sm')}Add to My food</button>`)
  if (!seller && (r.status === 'completed' || closed)) acts.push(`<a class="btn ${r.status === 'completed' ? 'sec' : ''}" href="#/market">Find more food</a>`)
  const diffs = []
  if (l) {
    if (l.price !== t.price) diffs.push(`price is now ${rm(l.price)}`)
    if (l.expiry !== t.expiry) diffs.push(`date is now ${fmtDate(l.expiry)}`)
    if (l.instr !== t.instr) diffs.push('pickup instructions changed')
    if (l.pickupUntil !== t.window.until || l.pickTo !== t.window.to || l.pickFrom !== t.window.from) diffs.push('collection window changed')
  }
  const sd = getSeller(t.sellerId)
  if (sd && (sd.name !== t.sellerName || sd.area !== t.sellerArea)) diffs.push('seller name or address changed')
  const codeBox = !seller && r.status === 'confirmed' ? `<div class="box codebox"><div class="codebar"><div><div class="mute sm">Your pickup code – show it to the seller</div><div class="code">${r.pin}</div></div><div class="mute sm" style="max-width:300px">${ic('lock', 'xs')} Only the seller can complete the handover by entering this code. Don't share it before you meet. Ref <b>${r.ref}</b></div></div></div>`
    : !seller && r.status === 'pending' ? `<div class="box"><div class="mute">${ic('lock', 'sm')} Your 4-digit pickup code appears here once the seller accepts. Reference: <b>${r.ref}</b></div></div>` : ''
  const sellerHint = seller && r.status === 'confirmed' && isSampleBuyer(r) ? `<div class="note warn">${ic('info', 'sm')}<span>Prototype hint: ${esc(r.buyerName)} is a sample buyer – their pickup code is <b class="mono">${r.pin}</b>.</span></div>` : ''
  const g = l ? ledger(l) : null
  const open = OPEN.includes(r.status)
  return `<div class="confirm">
    <div class="crumbs"><a href="#/reservations${seller ? '?view=seller' : ''}">${seller ? 'Reservations & handovers' : 'My reservations'}</a>${ic('cr', 'xs')}<span>${r.ref}</span>${sample(r)}</div>
    <div class="okbar ${tone}"><span class="c">${ic(closed || r.disputed ? 'x' : r.status === 'pending' ? 'clock' : 'check')}</span><div><h1>${head[0]}</h1><div class="mute">${esc(head[1])}</div></div></div>
    ${codeBox}${sellerHint}
    ${open ? `<div class="box deadline ${r.status === 'confirmed' && r.collectBy - Date.now() < 36e5 * 3 || r.status === 'pending' && r.respondBy - Date.now() < 36e5 ? 'urgent' : ''}">${ic('clock', 'sm')}<div><b>${r.status === 'pending' ? `Respond by ${fmtDT(r.respondBy)}` : `Collect by ${fmtDT(r.collectBy)}`}</b> <span class="mute">· ${timeLeft(r.status === 'pending' ? r.respondBy : r.collectBy)}</span>${disclose('How this deadline works', `<p class="mute sm">${r.status === 'pending' ? `Sellers have ${POLICY.respondH} hours to respond. After that the request expires and the units are released.` : `Units are held for up to ${POLICY.holdH} hours, and never past the seller's collection window. If not collected, the reservation expires automatically and the units are released.`}</p>`, { cls: 'flat' })}</div></div>` : ''}
    ${closed ? '' : `<div class="box">${steps(['Requested', 'Accepted by seller', 'Handed over'], idx)}</div>`}
    <div class="two">
      <div class="box"><h3>Agreed terms <span class="sp">${ic('lock', 'xs')} Locked at booking</span></h3><div class="srow"><img src="${l ? imgs(l)[0] : thumb(t)}" alt=""><div>${l ? `<a href="#/item/${l.id}"><b>${esc(t.name)}</b></a>` : `<b>${esc(t.name)}</b>`}<div class="mute sm"><span class="dtype ${t.expiryType === 'use-by' ? 'use' : ''}">${dateWord(t.expiryType)}</span> ${fmtDate(t.expiry)}</div></div></div>
        <dl class="deflist tight" style="margin-top:14px"><dt>Quantity</dt><dd><b>${r.qty}</b> x ${rm(t.price)} <s class="mute">${rm(t.orig)}</s></dd><dt>Total</dt><dd><b>${rm(t.price * r.qty)}</b> – pay in person at pickup</dd><dt>Status</dt><dd>${sp(resLabel(r), resCls(r))}</dd><dt>Requested</dt><dd>${fmtDT(r.createdAt)}</dd>${seller ? `<dt>Buyer</dt><dd>${esc(r.buyerName)}</dd>` : ''}${r.status === 'completed' ? `<dt>Handover</dt><dd>${fmtDT(r.collectedAt)} · ${r.handover?.method === 'simulated' ? 'simulated' : 'seller entered the buyer\'s code'}</dd>` : ''}</dl>
        ${diffs.length ? `<p class="note warn">${ic('info', 'sm')}<span>The seller has since edited the listing (${diffs.join(', ')}). <b>This reservation keeps the terms above.</b></span></p>` : '<p class="mute sm">Later edits to the listing or seller profile never change this record.</p>'}</div>
      <div class="box"><h3>Pickup</h3><div class="seller">${avatar(s)}<div class="who"><b>${esc(t.sellerName)}${sd ? sellerTag(sd) : ''}</b><span class="mute sm">${esc(t.sellerHours)}</span></div></div>
        <dl class="deflist tight" style="margin-top:14px"><dt>Address</dt><dd>${esc(t.sellerArea)}${!seller && sd ? `<br><span class="mute sm">${km({ seller: t.sellerId })} from your location (approximate)</span>` : ''}</dd><dt>Collection window</dt><dd>${fmtDate(t.window.until)} at the latest · ${fmtTime(t.window.from)}–${fmtTime(t.window.to)} daily</dd><dt>Instructions</dt><dd>${esc(t.instr)}</dd><dt>Payment</dt><dd>In person at pickup. No online payment, no delivery.</dd>${g && seller ? `<dt>Listing units</dt><dd>${g.total} listed · ${g.avail} available · ${g.held} held · ${g.handed} handed over</dd>` : ''}</dl></div>
    </div>
    ${!seller && (open || r.status === 'completed') ? `<div class="box safety"><h3>${ic('shield', 'sm')}At pickup, check the food yourself</h3><ul class="tips"><li>The pack is sealed, undamaged, and the printed date and type (<b>${dateWord(t.expiryType)} ${fmtDate(t.expiry)}</b>) match this page.</li><li>${t.expiryType === 'use-by' ? 'This is a <b>use-by</b> date: don\'t eat it after that date.' : 'This is a <b>best-before</b> date: a quality guide, not a guarantee of safety.'}</li><li>Decline anything that looks different. Check the label for allergens.</li></ul><p class="mute sm">The seller declared this food is sealed and stored at room temperature. FreshSave has not inspected it.</p></div>` : ''}
    <details class="box hist"><summary>History</summary><ul class="alist">${r.events.map((e) => `<li>${ic('clock', 'sm')}<span>${EV[e.type] || e.type}${e.by ? ' by ' + e.by : ''}${e.reason ? ' – ' + esc(EXP_REASON[e.reason]) : ''}${e.method === 'simulated' ? ' (simulated)' : ''}</span><small>${fmtDT(e.at)}</small></li>`).join('')}</ul></details>
    <div class="row-acts end">${acts.join('')}</div>
    ${!seller && r.status === 'pending' && noSellerAccount(r) ? '<p class="mute sm" style="text-align:right">Prototype: this sample seller accepts automatically after a few seconds.</p>' : ''}
  </div>`
}

export const routes = { reservations: pageReservations, reservation: (p) => pageReservation(p[1]) }
export const actions = {
  raccept: (el) => accept(getR(el.dataset.id)),
  rdecline: (el) => decline(getR(el.dataset.id)),
  rcancel: (el) => cancel(getR(el.dataset.id), false),
  rcancelseller: (el) => cancel(getR(el.dataset.id), true),
  rhandover: (el) => handoverDialog(getR(el.dataset.id)),
  rsimulate: (el) => simulateHandover(getR(el.dataset.id)),
  rreport: (el) => report(getR(el.dataset.id)),
  addfrom: (el) => { const r = getR(el.dataset.id); openAddFood({ name: r.terms.name, cat: r.terms.cat, qty: String(r.qty), expiry: r.terms.expiry, expiryType: r.terms.expiryType, kind: r.terms.kind, source: 'rescue' }) },
}
export function submit(e) {
  if (e.target.id !== 'f-handover') return false
  const r = getR(e.target.dataset.r)
  if (!$('#ho-item').checked || !$('#ho-pay').checked) { handoverDialog(r, 'Tick both boxes to confirm the handover.'); return true }
  const err = completeRes(r, $('#ho-code').value, { checked: true })
  if (err) { if (r.status === 'confirmed') handoverDialog(r, err); else { closeModal(); toast(err, 'alert'); app.refreshChrome(); app.render() } return true }
  closeModal(); toast('Handover recorded'); app.refreshChrome(); app.render()
  return true
}
export function resume() {
  S.reservations.filter((r) => r.status === 'pending' && noSellerAccount(r) && S.users.some((u) => u.id === r.buyerId) && !r.sample).forEach((r) => simulate(r.id))
}
