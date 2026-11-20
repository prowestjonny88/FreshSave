// Module A – food scanning, barcode lookup, individual inventory and retailer batches.
import { SCAN_SAMPLES, CAT_KIND } from '../data.js'
import {
  S, save, $, esc, ic, rm, photo, catLabel, catOptions, CATEGORIES, uid, toast, go, app, route, me, isRetailer, mySeller,
  todayIso, iso, addDays, today0, fmtDT, fmtDate, fmtShort, daysTo, expStatus, within, countdown, expLong, plural, sp, pageHead, empty, openModal, closeModal, confirmDlg,
  logAct, syncReminders, focusErr, readImages, getB, getL, FORMS, HOOKS, fld, inp, sel, ta, chk, rmInp, eligFields, eligResult, eligibility, card, thumb, expTypeSel, EXP_TYPES,
  dateWord, pastAdvice, moreMenu, disclose, batchState, batchLedger, batchListings, batchListable, batchHanded, lifecycle, ledger, LIFE, avail, POLICY, defaultPickupUntil, lastPickupDay, pickupErrors, fmtTime, whenShort,
} from '../core.js'

/* ================= Scan (photo + SIMULATED reading) ================= */
const scan = { mode: 'idle', sample: 'milk', image: null }
const sampleOf = () => SCAN_SAMPLES.find((x) => x.id === scan.sample)
const catKind = (c) => CAT_KIND[c] || 'rice'

function pageScan() {
  const s = sampleOf()
  const R = isRetailer()
  const target = R ? 'your stock' : 'My food'
  let cam
  if (scan.mode === 'idle') cam = `<div class="cam-off">${ic('camera')}<h3>${R ? 'Photograph the batch label' : 'Photograph the product and its date'}</h3><p class="mute">Show the printed date on the pack. You will confirm it yourself before anything is saved.</p>
      <div class="acts"><button class="btn" data-act="camon">${ic('camera', 'sm')}Start simulated scan</button><label class="btn sec">${ic('upload', 'sm')}Upload a photo<input type="file" accept="image/*" id="scan-file" hidden></label></div></div>`
  else cam = `<div class="viewfinder"><img src="${scan.image || photo(s.kind, 0, 900)}" alt="Camera preview"><span class="vf-c tl"></span><span class="vf-c tr"></span><span class="vf-c bl"></span><span class="vf-c br"></span>
      ${scan.mode === 'processing' ? `<div class="vf-busy"><span class="spin"></span>Simulating a reading…</div>` : `<div class="scanline"></div><span class="vf-hint">Keep the date inside the frame</span>`}</div>
      <div class="cam-ctl"><button class="btn sec sm" data-act="camoff" ${scan.mode === 'processing' ? 'disabled' : ''}>Cancel</button><button class="shutter" data-act="capture" aria-label="Capture" ${scan.mode === 'processing' ? 'disabled' : ''}></button><label class="btn sec sm">${ic('upload', 'sm')}Upload<input type="file" accept="image/*" id="scan-file" hidden></label></div>`
  return `${pageHead('Add ' + (R ? 'stock' : 'food'), `Scan the pack, or enter it by hand. It goes into ${target}.`, `<a class="btn sec" href="#/barcode">${ic('barcode', 'sm')}Barcode</a><button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}Enter by hand</button>`, 'Track')}
  <div class="note warn">${ic('info', 'sm')}<span><b>Simulated scanning.</b> No camera is opened and nothing is read from your photo. You always confirm the date yourself before saving.</span></div>
  <div class="scan simple">
    <div class="cam ${scan.mode}">${cam}</div>
    <div class="tipsline"><span>Show the product name</span><span>Keep the date in focus, away from glare</span><span>Note <b>Use by</b> or <b>Best before</b></span></div>
    ${disclose(`Demo option <span class="mute">· choose what the simulated reading finds</span>`, `<p class="mute sm" style="margin-bottom:8px">The simulated outcome decides what the next screen shows, whatever photo you use.</p>${SCAN_SAMPLES.map((x) => `<label class="rad"><input type="radio" name="sample" data-scan-sample value="${x.id}" ${scan.sample === x.id ? 'checked' : ''}><span>${x.label}</span>${sp(x.result === 'success' ? 'Date found' : x.result === 'uncertain' ? 'Date unclear' : 'No date', x.result === 'success' ? 'g' : x.result === 'uncertain' ? 'o' : 'r')}</label>`).join('')}`, { cls: 'demo-opts' })}
  </div>`
}
function capture() {
  if (scan.mode === 'processing') return
  scan.mode = 'processing'; app.render()
  setTimeout(() => {
    const s = sampleOf()
    const det = s.exp == null ? '' : iso(addDays(today0(), s.exp))
    // Only a clear read pre-fills the date; an unclear read leaves it blank so it can't be accepted by accident.
    FORMS.res = { result: s.result, image: scan.image || photo(s.kind, 0), kind: s.kind, name: s.name, cat: s.cat, detected: det, expiry: s.result === 'success' ? det : '', expiryType: s.et || 'best-before', qty: '1', date: todayIso(), ok: false, err: {} }
    scan.mode = 'idle'; scan.image = null
    go('#/scan/result')
  }, 1300)
}

HOOKS.res = () => { const f = FORMS.res, n = $('#res-past'); if (n) n.hidden = !(f.expiry && daysTo(f.expiry) < 0) }
function pageResult() {
  const f = FORMS.res
  if (!f) return go('#/scan') || ''
  const R = isRetailer()
  const banner = {
    success: ['Simulated reading: a date was found', 'This demo result is not read from your photo. Compare the date and its type with the pack before confirming.', 'g', 'check2'],
    uncertain: ['Simulated reading: the date is unclear', 'Part of the date could not be read. Type the date you can see on the pack.', 'o', 'alert'],
    failed: ['Simulated reading: no date found', 'Enter the product name and date from the pack.', 'r', 'ban'],
    barcode: ['Product identified by barcode', "Barcodes don't contain dates. Enter the date from the pack.", '', 'barcode'],
  }[f.result]
  return `<div class="crumbs"><a href="#/scan">Scan food</a>${ic('cr', 'xs')}<span>Confirm details</span></div>
  ${pageHead('Confirm before saving', 'Check every detail against the pack. Nothing is saved until you confirm the date.', '', 'Track')}
  <div class="result">
    <div class="box">
      <div class="res-img"><img src="${f.image}" alt="Scanned product"></div>
      <div class="detect ${banner[2]}">${ic(banner[3], 'sm')}<div><b>${banner[0]}</b><span>${banner[1]}</span></div></div>
      ${f.result === 'barcode' ? `<button class="btn sec block" data-act="scanlabel" style="margin-top:10px">${ic('camera', 'sm')}Simulate scanning the date label</button>` : ''}
      ${f.barcode ? `<p class="mute sm" style="margin-top:10px">Barcode ${f.barcode}</p>` : ''}
      <a class="link sm" href="#/scan" style="margin-top:10px;display:inline-flex">${ic('refresh', 'xs')} Start over</a>
    </div>
    <form class="form" id="f-res" novalidate>
      <h2>${R ? 'Batch details' : 'Food details'}</h2>
      ${fld('res', 'name', 'Product name', inp('res', 'name', 'text', 'placeholder="e.g. Dutch Lady Full Cream Milk 1L"'))}
      <div class="cols">${fld('res', 'cat', 'Category', sel('res', 'cat', catOptions(f.cat)))}
      ${fld('res', 'qty', R ? 'Quantity received' : 'Quantity', inp('res', 'qty', 'number', 'min="1" step="1"'), R ? 'Units received in this batch.' : '')}</div>
      <div class="confirm-date">
        <div class="cd-head">${ic('alert', 'sm')}<b>Confirm the date on the pack</b></div>
        <div class="fld"><label class="l">Which date is printed?</label>${expTypeSel('res')}</div>
        ${fld('res', 'expiry', 'Date on the pack', inp('res', 'expiry', 'date'), f.detected ? `Suggested: ${fmtDate(f.detected)}${f.expiry === f.detected ? '' : ' – '}${f.expiry === f.detected ? '' : '<button type="button" class="link sm" data-act="usesuggest">Use this date</button>'}` : 'Enter the date printed on the package.')}
        <p class="note warn" id="res-past" ${f.expiry && daysTo(f.expiry) < 0 ? '' : 'hidden'}>${ic('alert', 'sm')}<span>This date has already passed. It will be saved as past its date so you can discard it.</span></p>
        ${chk('res', 'ok', 'I have checked this date and its type against the pack')}
        <div class="e" style="display:${f.err.ok ? 'block' : 'none'};color:var(--red);font-size:12.5px" role="alert">${esc(f.err.ok || '')}</div>
      </div>
      ${disclose(`More details <span class="mute">· ${R ? 'recorded' : 'bought'} today</span>`, fld('res', 'date', R ? 'Date recorded' : 'Purchase date', inp('res', 'date', 'date', `max="${todayIso()}"`)), { flat: 1, open: !!f.err.date, cls: 'flat' })}
      <div class="wnav"><a class="btn sec" href="#/scan">Start over</a><button class="btn" type="submit">${ic('check', 'sm')}Confirm &amp; save</button></div>
    </form>
  </div>`
}
function saveResult() {
  const f = FORMS.res, e = {}
  if (f.name.trim().length < 2) e.name = 'Enter the product name.'
  if (!f.cat) e.cat = 'Choose a category.'
  if (!(Number.isInteger(+f.qty) && +f.qty >= 1)) e.qty = 'Enter a whole number of at least 1.'
  if (!f.date) e.date = 'Enter a date.'
  if (!f.expiry) e.expiry = 'Enter the date printed on the pack.'
  if (!f.ok) e.ok = 'Tick the box to confirm you have checked the date against the pack.'
  f.err = e
  if (Object.keys(e).length) { app.render(); return focusErr() }
  const base = { name: f.name.trim(), cat: f.cat, kind: f.kind || catKind(f.cat), photo: f.image?.startsWith('data:') ? f.image : null, expiry: f.expiry, expiryType: f.expiryType, addedAt: Date.now() }
  let href
  if (isRetailer()) {
    const b = { id: uid('b'), owner: me().id, ...base, qty: +f.qty, recorded: f.date, verify: 'unverified', barcode: f.barcode, history: [] }
    S.batches.unshift(b); logAct('layers', `Recorded batch: ${b.name} (${b.qty} units)`); href = `#/batch/${b.id}`
  } else {
    const i = { id: uid('i'), owner: me().id, ...base, qty: +f.qty, initial: +f.qty, log: [], purchased: f.date, status: 'active', barcode: f.barcode }
    S.inventory.unshift(i); logAct(f.result === 'barcode' ? 'barcode' : 'camera', `Added ${i.name} by ${f.result === 'barcode' ? 'barcode' : 'photo scan'}`); href = `#/inventory?new=${i.id}`
  }
  save()
  const n = syncReminders()
  toast(n ? `Saved. ${expLong(f.expiry)} – an in-app reminder was added` : 'Saved. In-app reminders appear when you open FreshSave 7, 3 and 1 days before', n ? 'bell' : 'check')
  delete FORMS.res
  app.refreshChrome()
  go(href)
}

/* ================= Barcode lookup (optional, demo catalogue) ================= */
const bc = { code: '', state: null, item: null }
FORMS.bcnew = { name: '', cat: '', err: {} }
const BC_SAMPLES = [['9556041610018', 'Dutch Lady Milk'], ['9556001062048', 'Milo'], ['9556570310120', 'Gardenia Bread'], ['9551234567896', 'Unregistered item']]
// GTIN check digit (EAN-8 / UPC-A / EAN-13 / GTIN-14).
export function gtinOk(code) {
  if (![8, 12, 13, 14].includes(code.length)) return false
  const d = code.split('').map(Number), chk = d.pop()
  const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === chk
}
function pageBarcode() {
  let res = ''
  const it = bc.item
  if (bc.state === 'found' || bc.state === 'registered') res = `<div class="box bc-res"><div class="bc-head">${sp(bc.state === 'found' ? 'In demo catalogue' : 'Registered on this browser', 'g')}<span class="mute sm">Barcode ${bc.code}</span></div>
      <div class="srow big"><img src="${photo(it.kind, 0, 300)}" alt=""><div><h3>${esc(it.name)}</h3><div class="mute">${catLabel(it.cat)}</div>
      <div class="mute sm" style="margin-top:6px">${bc.state === 'found' ? 'From the sample catalogue bundled with the prototype' : `Registered by ${esc(it.by)}${it.at ? ' · ' + new Date(it.at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}</div></div></div>
      <div class="row-acts"><button class="btn" data-act="bcuse">${ic('check', 'sm')}${bc.state === 'found' ? 'Use this product' : 'Use this product'}</button><button class="btn sec" data-act="bcwrong">Not this product</button></div></div>`
  else if (bc.state === 'notfound') res = `<form class="box bc-res" id="f-bcnew" novalidate><div class="bc-head">${sp('Not in the demo catalogue', 'y')}<span class="mute sm">Barcode ${bc.code}</span></div>
      <p class="mute">Add the product details once and continue. The product is remembered on this browser only.</p>
      ${fld('bcnew', 'name', 'Product name', inp('bcnew', 'name', 'text', 'placeholder="e.g. Massimo Sandwich Loaf 400g"'))}
      ${fld('bcnew', 'cat', 'Category', sel('bcnew', 'cat', catOptions(FORMS.bcnew.cat)))}
      <div class="row-acts"><button class="btn" type="submit">Save product &amp; continue</button></div></form>`
  return `<div class="crumbs"><a href="#/scan">Scan food</a>${ic('cr', 'xs')}<span>Barcode lookup</span></div>
  ${pageHead('Barcode lookup', 'Optional. Identify the product by barcode – you will still enter the date from the pack.', '', 'Track')}
  <div class="bc">
    <form class="box" id="f-bc" novalidate><div class="bc-scan">${ic('barcode')}<span>Barcode camera (simulated)</span><i class="scanline"></i></div>
      <div class="fld"><label class="l" for="bc-code">Barcode number</label><div class="inline"><input type="text" id="bc-code" inputmode="numeric" maxlength="14" value="${esc(bc.code)}" placeholder="e.g. 9556041610018"><button class="btn" type="submit">Look up</button></div></div>
      <div class="pills" style="margin-top:10px"><span class="mute sm">Try:</span>${BC_SAMPLES.map(([c, n]) => `<button type="button" class="pill" data-act="bcsample" data-c="${c}">${n}</button>`).join('')}</div>
      ${disclose('About this demo catalogue', '<p class="mute sm">A handful of sample products plus anything you register here, stored only in this browser. FreshSave does not access shop POS or national product databases. The barcode check digit is validated.</p>', { cls: 'flat' })}
      <a class="link sm" href="#/scan">${ic('camera', 'xs')} Back to photo scanning</a>
    </form>
    <div>${res || `<div class="box mute" style="display:grid;place-items:center;min-height:220px;text-align:center">${ic('barcode')}<span>Enter a barcode number to look it up.</span></div>`}</div>
  </div>`
}
function lookup(code) {
  code = code.replace(/\D/g, '')
  bc.code = code
  if (![8, 12, 13, 14].includes(code.length)) { toast('Enter 8, 12, 13 or 14 digits', 'alert'); bc.state = null; return app.render() }
  if (!gtinOk(code)) { toast("That barcode's check digit doesn't match – re-check the number", 'alert'); bc.state = null; return app.render() }
  const it = S.catalogue.find((c) => c.barcode === code)
  bc.item = it || null
  bc.state = !it ? 'notfound' : it.src === 'catalogue' ? 'found' : 'registered'
  FORMS.bcnew = { name: '', cat: '', err: {} }
  app.render()
}
function bcToResult(it) {
  FORMS.res = { result: 'barcode', image: photo(it.kind, 0), kind: it.kind, name: it.name, cat: it.cat, detected: '', expiry: '', expiryType: 'best-before', qty: '1', date: todayIso(), ok: false, err: {}, barcode: bc.code }
  bc.state = null; bc.code = ''
  go('#/scan/result')
}

/* ================= Individual inventory ================= */
const inv = { q: '', cat: '', sort: 'exp', more: false }
// Four tabs keep the list scannable. The finer "within 1 / 3 / 7 days" filters stay available as chips under "Use soon".
// All "within N days" filters are CUMULATIVE: they include everything due sooner, including today and tomorrow.
const INV_TABS = [['active', 'All'], ['d7', 'Use soon'], ['expired', 'Past date'], ['history', 'Used & discarded']]
const INV_SOON = [['d1', 'Today & tomorrow'], ['d3', '3 days'], ['d7', '7 days']]
const invMatch = { active: () => true, expired: (i) => daysTo(i.expiry) < 0, d1: (i) => within(i.expiry, 1), d3: (i) => within(i.expiry, 3), d7: (i) => within(i.expiry, 7), fresh: (i) => daysTo(i.expiry) > 7 }
const logSum = (i, t) => (i.log || []).filter((e) => e.type === t).reduce((a, e) => a + e.n, 0)
function pageInventory(parts, q) {
  const u = me(), st = [...INV_TABS, ...INV_SOON, ['fresh']].some((t) => t[0] === q.get('st')) ? q.get('st') : 'active'
  const tab = ['d1', 'd3', 'fresh'].includes(st) ? (st === 'fresh' ? 'active' : 'd7') : st
  const all = S.inventory.filter((i) => i.owner === u.id)
  const active = all.filter((i) => i.status === 'active')
  const count = (k) => (k === 'history' ? all.length - active.length : active.filter(invMatch[k]).length)
  let xs = st === 'history' ? all.filter((i) => i.status !== 'active') : active.filter(invMatch[st])
  if (inv.q) xs = xs.filter((i) => i.name.toLowerCase().includes(inv.q.toLowerCase()))
  if (inv.cat) xs = xs.filter((i) => i.cat === inv.cat)
  const sorts = { exp: (a, b) => a.expiry.localeCompare(b.expiry), new: (a, b) => b.addedAt - a.addedAt, name: (a, b) => a.name.localeCompare(b.name), qty: (a, b) => b.qty - a.qty }
  xs.sort(st === 'history' ? (a, b) => (b.closedAt || 0) - (a.closedAt || 0) : sorts[inv.sort])
  const hl = q.get('new')
  const row = (i) => {
    const sx = expStatus(i.expiry), done = i.status !== 'active', used = logSum(i, 'consumed'), tossed = logSum(i, 'discarded')
    const menu = done
      ? moreMenu(`<button class="d" data-act="invdel" data-id="${i.id}">${ic('trash', 'sm')}Delete</button>`)
      : moreMenu(`<button data-act="invdone" data-id="${i.id}" data-s="discarded">${ic('trash', 'sm')}Discard</button><button data-act="invedit" data-id="${i.id}">${ic('edit', 'sm')}Edit</button>${(i.log || []).length ? `<button data-act="invundo" data-id="${i.id}">${ic('undo', 'sm')}Undo last change</button>` : ''}<hr><button class="d" data-act="invdel" data-id="${i.id}">${ic('trash', 'sm')}Delete</button>`)
    return `<tr class="${hl === i.id ? 'hl' : ''}"><td class="pc"><div class="pcell"><img src="${thumb(i)}" alt=""><div><b>${esc(i.name)}</b><span class="mute sm">${catLabel(i.cat)}</span></div></div></td>
      <td data-l="Left">${done ? '–' : `<b>${i.qty}</b>${(i.initial || i.qty) > i.qty ? `<span class="mute sm"> of ${i.initial}</span>` : ''}${used || tossed ? `<span class="mute sm usedline">${used ? `${used} used` : ''}${used && tossed ? ' · ' : ''}${tossed ? `${tossed} discarded` : ''}</span>` : ''}`}</td>
      <td data-l="Date on pack"><div class="datecell">${done ? sp(i.status === 'consumed' ? 'Used' : 'Discarded', i.status === 'consumed' ? 'g' : '') + `<span class="dl">${i.closedAt ? fmtShort(iso(new Date(i.closedAt))) : ''}</span>` : sp(sx.label, sx.cls) + `<span class="dl"><span class="dtype ${i.expiryType === 'use-by' ? 'use' : ''}">${dateWord(i.expiryType)}</span> ${fmtDate(i.expiry)}</span>`}</div></td>
      <td data-l="" class="act-c"><div class="acts-cell tight">${done ? `<button class="ibtn go" data-act="invundo" data-id="${i.id}">${ic('undo', 'xs')}Restore</button>` : `<button class="ibtn go" data-act="invdone" data-id="${i.id}" data-s="consumed">${ic('check', 'xs')}Used</button>`}${menu}</div></td></tr>`
  }
  const urgent = active.filter((i) => daysTo(i.expiry) < 0).length
  return `${pageHead('My food', `${plural(active.length, 'item')} at home`, `<a class="btn" href="#/scan">${ic('camera', 'sm')}Scan food</a><button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}Enter by hand</button>`, 'Track')}
  ${urgent && st === 'active' ? `<div class="note warn">${ic('alert', 'sm')}<span><b>${plural(urgent, 'item')} past the printed date.</b> Check ${urgent === 1 ? 'it' : 'them'}, then mark as used or discarded. <a class="link" href="#/inventory?st=expired">Show ${urgent === 1 ? 'it' : 'them'}</a></span></div>` : ''}
  <div class="tabs">${INV_TABS.map(([k, t]) => `<a class="tab ${tab === k ? 'on' : ''}" href="#/inventory?st=${k}" ${tab === k ? 'aria-current="page"' : ''}>${t}<i>${count(k)}</i></a>`).join('')}</div>
  ${tab === 'd7' ? `<div class="chips" role="group" aria-label="Due within"><span class="mute">Due within</span>${INV_SOON.map(([k, t]) => `<a class="chip ${st === k ? 'on' : ''}" href="#/inventory?st=${k}" ${st === k ? 'aria-current="true"' : ''}>${t} <span class="mute" style="color:inherit;opacity:.7">${count(k)}</span></a>`).join('')}<span class="mute sm tabnote" style="margin:0 0 0 6px">Each includes everything due sooner, including today.</span></div>` : ''}
  ${active.length > 5 || inv.q || inv.cat ? `<div class="tbar"><div class="tsearch">${ic('search', 'sm')}<input type="search" id="inv-q" placeholder="Search your food" value="${esc(inv.q)}" aria-label="Search your food"></div>
    ${disclose('Filter &amp; sort', `<div class="inline"><select class="sel" id="inv-cat" aria-label="Category">${catOptions(inv.cat, 'All categories')}</select><select class="sel" id="inv-sort" aria-label="Sort">${[['exp', 'Date: soonest first'], ['new', 'Recently added'], ['name', 'Name A–Z'], ['qty', 'Quantity']].map(([v, t]) => `<option value="${v}" ${inv.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`, { open: inv.more || !!inv.cat || inv.sort !== 'exp', cls: 'flat' })}</div>` : ''}
  ${xs.length ? `<table class="tbl inv"><thead><tr><th>Product</th><th>Left</th><th>Date on pack</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${xs.map(row).join('')}</tbody></table>`
    : `<div class="tabempty">${all.length ? (inv.q || inv.cat ? 'No items match these filters.' : st === 'expired' ? 'Nothing is past its date.' : st === 'history' ? 'Nothing used or discarded yet.' : 'Nothing here right now.') : empty('box', 'Nothing tracked yet', 'Add what you buy and FreshSave shows what to use first. Start with one item – a photo, a barcode, or typed by hand.', `<a class="btn" href="#/scan">${ic('camera', 'sm')}Scan food</a><button class="btn sec" data-act="addmanual">Enter by hand</button>`)}</div>`}
  <p class="hintline" style="margin-top:16px">${ic('bell', 'xs')}<span>Reminders appear in FreshSave when you open it, ${[['d7', '7'], ['d3', '3'], ['d1', '1']].filter(([k]) => me().prefs[k]).map(([, t]) => t).join(' / ') || 'none selected'} days before a date. Nothing is sent by push, SMS or email. <a href="#/profile">Change</a></span></p>`
}
function applyUse(i, type, n) {
  i.log ||= []; n = Math.max(1, Math.min(n, i.qty))
  i.qty -= n; i.log.push({ type, n, at: Date.now() })
  if (i.qty === 0) { i.status = type; i.closedAt = Date.now() }
  logAct(type === 'consumed' ? 'check' : 'trash', `Marked ${n} x ${i.name} as ${type === 'consumed' ? 'used' : 'discarded'}`)
  save(); toast(`${n} x ${i.name.length > 28 ? i.name.slice(0, 28) + '…' : i.name} marked ${type === 'consumed' ? 'used' : 'discarded'}`, 'check', () => undoUse(i)); app.render()
}
function undoUse(i) {
  const e = (i.log || []).pop(); if (!e) return
  i.qty += e.n; i.status = 'active'; i.closedAt = null
  logAct('undo', `Restored ${e.n} x ${i.name}`); save(); toast('Restored'); app.render()
}
function useDialog(i, type) {
  if (i.qty === 1) return applyUse(i, type, 1)
  const word = type === 'consumed' ? 'used' : 'discarded'
  confirmDlg({ title: `How many ${word}?`, ok: `Mark ${word}`, cls: type === 'consumed' ? 'sage' : 'danger',
    body: `<p><b>${esc(i.name)}</b> – ${i.qty} left.</p><div class="fld"><label class="l" for="use-n">Units ${word}</label><div class="inline"><input type="number" id="use-n" min="1" max="${i.qty}" step="1" value="1" style="max-width:120px"><button type="button" class="btn sec" data-act="useall" data-n="${i.qty}">All ${i.qty}</button></div></div><p class="mute sm">The rest stays in your list. You can undo right after.</p>`,
    onOk: () => applyUse(i, type, parseInt($('#use-n').value, 10) || 1) })
}
// Manual add / edit (modal). `prefill` lets Rescue hand a collected item over to Track.
HOOKS.man = () => { const f = FORMS.man, n = $('#man-past'); if (n) n.hidden = !(f.expiry && daysTo(f.expiry) < 0) }
function invForm(item, prefill) {
  const R = isRetailer()
  FORMS.man = item ? { id: item.id, name: item.name, cat: item.cat, qty: String(item.qty), date: item.purchased || item.recorded, expiry: item.expiry, expiryType: item.expiryType || 'best-before', ok: false, orig: { expiry: item.expiry, type: item.expiryType || 'best-before' }, err: {} }
    : { name: prefill?.name || '', cat: prefill?.cat || '', qty: prefill?.qty || '1', date: todayIso(), expiry: prefill?.expiry || '', expiryType: prefill?.expiryType || 'best-before', ok: false, kind: prefill?.kind, source: prefill?.source, err: {} }
  const body = () => { const f = FORMS.man; return `<h3>${item ? 'Edit item' : R ? 'Record a batch by hand' : 'Add food by hand'}</h3>
    ${f.source === 'rescue' ? `<p class="note">${ic('info', 'sm')}<span>Pre-filled from your pickup record. The date is the one the seller listed – check it against the pack you received.</span></p>` : ''}
    <form id="f-man" novalidate>${fld('man', 'name', 'Product name', inp('man', 'name'))}
    <div class="cols">${fld('man', 'cat', 'Category', sel('man', 'cat', catOptions(f.cat)))}${fld('man', 'qty', R ? 'Quantity received' : 'Quantity', inp('man', 'qty', 'number', 'min="1"'))}</div>
    <div class="confirm-date"><div class="fld" style="margin-top:0"><label class="l">Which date is printed on the pack?</label>${expTypeSel('man')}</div>
    ${fld('man', 'expiry', 'Date on the pack', inp('man', 'expiry', 'date'))}
    <p class="note warn" id="man-past" ${f.expiry && daysTo(f.expiry) < 0 ? '' : 'hidden'}>${ic('alert', 'sm')}<span>This date has already passed. It will be saved as past its date.</span></p>
    ${chk('man', 'ok', 'I have checked this date and its type against the pack')}<div class="e" style="display:${f.err.ok ? 'block' : 'none'};color:var(--red);font-size:12.5px" role="alert">${esc(f.err.ok || '')}</div></div>
    ${disclose(`More details <span class="mute">· ${R ? 'date recorded' : 'purchase date'}</span>`, fld('man', 'date', R ? 'Date recorded' : 'Purchase date', inp('man', 'date', 'date', `max="${todayIso()}"`)), { open: !!f.err.date, cls: 'flat' })}
    <div class="macts"><button type="button" class="btn sec" data-act="mclose">Cancel</button><button class="btn" type="submit">${item ? 'Save changes' : 'Confirm & save'}</button></div></form>` }
  HOOKS.manBody = body
  openModal(body(), 'wide')
}
export const openAddFood = (prefill) => invForm(null, prefill)
function saveMan() {
  const f = FORMS.man, e = {}
  const changedDate = !f.orig || f.orig.expiry !== f.expiry || f.orig.type !== f.expiryType
  if (f.name.trim().length < 2) e.name = 'Enter the product name.'
  if (!f.cat) e.cat = 'Choose a category.'
  if (!(Number.isInteger(+f.qty) && +f.qty >= 1)) e.qty = 'Enter a whole number of at least 1.'
  if (!f.date) e.date = 'Enter a date.'
  if (!f.expiry) e.expiry = 'Enter the date printed on the pack.'
  if (changedDate && !f.ok) e.ok = 'Tick the box to confirm you have checked the date against the pack.'
  f.err = e
  if (Object.keys(e).length) { $('#modal').innerHTML = HOOKS.manBody(); return focusErr($('#modal')) }
  const R = isRetailer()
  if (f.id) {
    const x = R ? getB(f.id) : S.inventory.find((i) => i.id === f.id)
    if (R && f.orig.expiry !== f.expiry) (x.history ||= []).push({ at: Date.now(), field: 'expiry', from: x.expiry, to: f.expiry })
    if (!R && +f.qty > x.initial) x.initial = +f.qty
    Object.assign(x, { name: f.name.trim(), cat: f.cat, qty: +f.qty, expiry: f.expiry, expiryType: f.expiryType, [R ? 'recorded' : 'purchased']: f.date })
    logAct('edit', `Edited ${x.name}`); toast('Changes saved')
  } else if (R) {
    const b = { id: uid('b'), owner: me().id, name: f.name.trim(), cat: f.cat, kind: catKind(f.cat), qty: +f.qty, recorded: f.date, expiry: f.expiry, expiryType: f.expiryType, verify: 'unverified', addedAt: Date.now(), history: [] }
    S.batches.unshift(b); logAct('layers', `Recorded batch: ${b.name} (${b.qty} units)`); toast('Batch recorded')
  } else {
    const i = { id: uid('i'), owner: me().id, name: f.name.trim(), cat: f.cat, kind: f.kind || catKind(f.cat), qty: +f.qty, initial: +f.qty, log: [], purchased: f.date, expiry: f.expiry, expiryType: f.expiryType, status: 'active', addedAt: Date.now() }
    S.inventory.unshift(i); logAct('plus', `Added ${i.name} manually`); toast('Saved. In-app reminders appear when you open FreshSave 7, 3 and 1 days before')
  }
  save(); syncReminders(); closeModal(); app.refreshChrome()
  if (route().parts[0] === 'inventory' || route().parts[0] === 'batches' || route().parts[0] === 'batch' || route().parts[0] === 'dashboard') app.render(); else go(R ? '#/batches' : '#/inventory')
}

/* ================= Retailer batch inventory ================= */
const bt = { tab: 'check', q: '' }
function vStatus(b) {
  const st = batchState(b), g = batchLedger(b)
  if (st === 'dismissed') return sp('Sold out – dismissed', '')
  if (st === 'closed') return sp(`Finished · ${g.handed} handed over`, '')
  if (st === 'listed') return sp(`On Rescue · ${b.counted} counted`, 'g')
  return daysTo(b.expiry) < 0 ? sp('Past date – not checked', 'r') : sp('Shelf count needed', 'y')
}
// Three tabs show only what a shop owner acts on: what to count, what is on offer, what is finished.
const BT_TABS = [['check', 'To count'], ['listed', 'On Rescue'], ['closed', 'Finished']]
function pageBatches() {
  const mine = S.batches.filter((b) => b.owner === me().id)
  const groups = { check: [], listed: [], closed: [] }
  mine.forEach((b) => { const k = batchState(b); (groups[k === 'dismissed' ? 'closed' : k] || groups.check).push(b) })
  const tab = groups[bt.tab] ? bt.tab : 'check'
  let xs = groups[tab]
  const searching = mine.length > 8 || bt.q
  if (bt.q) xs = xs.filter((b) => b.name.toLowerCase().includes(bt.q.toLowerCase()))
  xs = [...xs].sort((a, b) => a.expiry.localeCompare(b.expiry))
  const toCount = tab === 'check'
  const rowFor = (b) => {
    const st = expStatus(b.expiry), state = batchState(b)
    return `<tr><td class="pc"><div class="pcell"><img src="${thumb(b)}" alt=""><div><a href="#/batch/${b.id}"><b>${esc(b.name)}</b></a><span class="mute sm">${catLabel(b.cat)}${b.source === 'direct' ? ' · direct listing' : ''}</span></div></div></td>
    <td data-l="Date on pack"><div class="datecell">${state === 'check' ? sp(daysTo(b.expiry) < 0 ? `${-daysTo(b.expiry)}d past date` : countdown(b.expiry) === 'Today' ? 'Dated today' : `${countdown(b.expiry)} left`, st.cls) : ''}<span class="dl"><span class="dtype ${b.expiryType === 'use-by' ? 'use' : ''}">${dateWord(b.expiryType)}</span> ${fmtDate(b.expiry)}</span></div></td>
    <td data-l="Received">${b.qty}</td>
    ${toCount ? '' : `<td data-l="Status">${vStatus(b)}</td>`}
    <td data-l="" class="act-c"><a class="btn sm ${state === 'check' ? '' : 'sec'}" href="#/batch/${b.id}">${state === 'check' ? 'Count shelf' : 'View'}</a></td></tr>`
  }
  return `${pageHead('Stock', 'Count the shelf for anything close to its date, then offer what is left on Rescue.', `<a class="btn" href="#/scan">${ic('camera', 'sm')}Scan batch</a><button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}Enter by hand</button>`, 'Track')}
  <div class="tabs">${BT_TABS.map(([k, t]) => `<button class="tab ${tab === k ? 'on' : ''}" data-act="bttab" data-t="${k}">${t}<i>${groups[k].length}</i></button>`).join('')}</div>
  ${searching ? `<div class="tbar"><div class="tsearch">${ic('search', 'sm')}<input type="search" id="bt-q" placeholder="Search batches" value="${esc(bt.q)}" aria-label="Search batches"></div></div>` : ''}
  ${xs.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Date on pack</th><th>Received</th>${toCount ? '' : '<th>Status</th>'}<th><span class="sr-only">Action</span></th></tr></thead><tbody>${xs.map(rowFor).join('')}</tbody></table>`
    : `<div class="tabempty">${mine.length ? (bt.q ? 'No batches match your search.' : tab === 'check' ? 'Nothing needs a count. Batches show here until you offer or dismiss them.' : tab === 'listed' ? 'Nothing is on Rescue right now.' : 'No finished batches yet.') : empty('layers', 'No batches recorded yet', 'Record incoming stock by batch so FreshSave can flag it before the date, and so every unit you list is accounted for.', `<a class="btn" href="#/scan">Scan batch</a><button class="btn sec" data-act="addmanual">Enter by hand</button>`)}</div>`}
  <p class="hintline" style="margin-top:16px">${ic('info', 'xs')}<span>FreshSave is not connected to your till. Recorded quantities are what arrived, so count the shelf before you offer or dismiss a batch.</span></p>`
}

function ledgerBar(b) {
  const g = batchLedger(b), offer = g.avail + g.held, notOn = Math.max(0, b.qty - g.handed - offer)
  const cell = (n, l, c = '') => `<div class="${c}"><b>${n}</b><small>${l}</small></div>`
  return `<div class="ledgerbar" role="group" aria-label="Unit accounting for this batch">${cell(b.qty, 'Received')}${cell(g.avail, 'Available to buyers', 'g')}${cell(g.held, 'Held for pickup', 'y')}${cell(g.handed, 'Handed over', 'd')}</div>
  ${disclose('Full unit accounting', `<div class="ledgerbar" role="group" aria-label="Other unit counts">${cell(b.counted ?? '–', 'Counted when listed')}${cell(g.withdrawn, 'Returned to shelf')}${cell(notOn, 'Not on offer')}</div>
  <p class="mute sm">Every unit is counted once: received = handed over + on offer + not on offer. Units handed over leave your stock; units returned to the shelf are yours to sell normally.</p>`, { cls: 'flat' })}`
}
function pageBatch(id) {
  const b = getB(id)
  if (!b || b.owner !== me().id) return empty('info', 'Batch not found', 'It may have been removed.', '<a class="btn" href="#/batches">Back to stock</a>')
  const st = expStatus(b.expiry), d = daysTo(b.expiry), state = batchState(b), ls = batchListings(b)
  let check
  if (state === 'check') check = `<section class="stockcheck"><div class="sc-head">${ic('eye')}<div><h2>Count the shelf</h2><p>You recorded <b>${b.qty} units</b> on ${fmtDate(b.recorded)}${batchHanded(b) ? `; ${batchHanded(b)} were already handed over to FreshSave buyers` : ''}. FreshSave can't see your till sales. Count what is physically on the shelf now, then choose one option.</p></div></div>
      <div class="sc-opts">
        <div class="sc-opt"><h3>${ic('ban', 'sm')}Sold out / dismiss</h3><p>Nothing of this batch is left. The batch is closed and nothing is listed.</p><button class="btn sec block" data-act="dismiss" data-id="${b.id}">Sold out – dismiss</button></div>
        <div class="sc-opt main"><h3>${ic('basket', 'sm')}Offer on Rescue</h3><p>Units are left and the date is close. Enter the number you counted and offer them to nearby buyers. Only sealed, room-temperature packaged food is accepted in the pilot.</p>${d < 0 ? `<button class="btn block" disabled>Offer on Rescue</button><p class="hint" style="color:var(--red)">Past its printed date – can't be listed.</p>` : batchListable(b) < 1 ? `<button class="btn block" disabled>Offer on Rescue</button><p class="hint">No units left to allocate.</p>` : `<a class="btn block" href="#/batch/${b.id}/list">Offer on Rescue</a>`}</div>
      </div></section>`
  else check = `<section class="box"><h3>${state === 'dismissed' ? 'Batch dismissed' : state === 'closed' ? 'Listing finished' : 'Offered on Rescue'}</h3>${state === 'dismissed' ? `<p class="mute">Confirmed sold out ${b.verifiedAt ? 'on ' + fmtDT(b.verifiedAt) : ''}. No units were listed.</p>` : `${ledgerBar(b)}
      ${ls.length ? ls.map((l) => { const lc = lifecycle(l), g = ledger(l); return `<div class="srow" style="margin-top:12px"><img src="${thumb(l)}" alt=""><div style="flex:1"><a href="#/item/${l.id}"><b>${esc(l.name)}</b></a><div class="mute sm">${rm(l.price)} · ${g.avail} available · ${g.held} held · ${g.handed} handed over · ${sp(LIFE[lc][0], LIFE[lc][1])}</div></div><a class="btn sec sm" href="#/basket/${l.id}">Manage</a></div>` }).join('') : '<p class="mute sm">The listing has been removed.</p>'}
      ${state === 'closed' && d >= 0 && batchListable(b) > 0 ? `<div class="row-acts"><button class="btn sec" data-act="recheck" data-id="${b.id}">${ic('eye', 'sm')}Count again and offer the rest</button></div>` : ''}`}</section>`
  return `<div class="crumbs"><a href="#/batches">Stock</a>${ic('cr', 'xs')}<span>${esc(b.name)}</span></div>
  <div class="batch">
    <div class="box batch-info"><img src="${photo(b.kind, 0, 480)}" alt="">
      <div><h1 class="d-title">${esc(b.name)}</h1><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${sp(st.label, st.cls)}${vStatus(b)}</div>
      <dl class="deflist"><dt>Category</dt><dd>${catLabel(b.cat)}</dd><dt>Date on pack</dt><dd><span class="dtype ${b.expiryType === 'use-by' ? 'use' : ''}">${dateWord(b.expiryType)}</span> ${fmtDate(b.expiry)} <span class="mute">(${countdown(b.expiry)})</span></dd><dt>Recorded</dt><dd>${fmtDate(b.recorded)}</dd><dt>Received</dt><dd>${b.qty} units</dd>${b.barcode ? `<dt>Barcode</dt><dd>${b.barcode}</dd>` : ''}${(b.history || []).map((h) => `<dt>Date corrected</dt><dd>${fmtDate(h.from)} → ${fmtDate(h.to)} <span class="mute sm">${fmtDT(h.at)}</span></dd>`).join('')}</dl>
      ${state === 'check' ? `<button class="link sm" data-act="batchedit" data-id="${b.id}">${ic('edit', 'xs')} Correct batch details</button>` : '<p class="mute sm">Details are locked once a batch has been counted and listed.</p>'}</div></div>
    ${check}
  </div>`
}

/* Offer the counted units on Rescue (batch → listing) */
const lastTermsFor = (name) => S.listings.filter((l) => l.seller === me().sellerId && l.name.toLowerCase() === name.toLowerCase() && l.status !== 'removed').sort((a, b) => b.postedAt - a.postedAt)[0]
const DEF_INSTR = 'Ask at the cashier for the FreshSave Clearance Basket and show your pickup code. Pay at the counter.'
function pageBatchList(id) {
  const b = getB(id)
  if (!b || b.owner !== me().id || b.verify !== 'unverified') return go(`#/batch/${id}`) || ''
  const s = mySeller()
  if (!FORMS.bl || FORMS.bl.bid !== id) {
    const last = lastTermsFor(b.name), type = b.expiryType || 'best-before'
    FORMS.bl = { bid: id, remaining: '', orig: last ? String(last.orig) : '', price: last ? String(last.price) : '', expiry: b.expiry, expiryType: type, pickupUntil: defaultPickupUntil(b.expiry, type), pickFrom: last?.pickFrom || '10:00', pickTo: last?.pickTo || '21:00', instr: s.defaultInstr || DEF_INSTR, desc: '', pack: last?.pack || '', c1: false, c2: false, c3: false, err: {}, prefilled: !!last }
  }
  const f = FORMS.bl, cap = batchListable(b), maxDay = lastPickupDay(b.expiry, f.expiryType)
  setTimeout(() => HOOKS.bl('init'))
  const pickErr = !!(f.err.pickupUntil || f.err.pickTo || f.err.instr)
  return `<div class="crumbs"><a href="#/batches">Stock</a>${ic('cr', 'xs')}<a href="#/batch/${b.id}">${esc(b.name)}</a>${ic('cr', 'xs')}<span>Offer on Rescue</span></div>
  ${pageHead('Offer counted units on Rescue', esc(b.name), '', 'Rescue')}
  <div class="wiz">
    <form class="form" id="f-bl" novalidate>
      <div class="offer-sum">${ic('lock', 'sm')}<span><b>${dateWord(b.expiryType)} ${fmtDate(b.expiry)}</b> <span class="mute">· from your batch record.</span> Wrong date? <button type="button" class="link sm" data-act="batchedit" data-id="${b.id}">Correct the batch</button> first.</span></div>
      <h2 style="margin-top:22px">1. Count the shelf</h2>
      <div class="qtycheck"><div><small>Received</small><b>${b.qty}</b></div>${ic('arrow')}<div>${fld('bl', 'remaining', 'Units you counted on the shelf', inp('bl', 'remaining', 'number', `min="1" max="${cap}" step="1" placeholder="Count the shelf"`))}</div>${ic('arrow')}<div><small>Units to offer</small><b id="bl-lq">${+f.remaining > 0 ? +f.remaining : '–'}</b></div></div>
      <p class="hint">At most <b>${cap}</b> can be offered${batchHanded(b) ? ` (${batchHanded(b)} already handed over to buyers)` : ''}. Never assume the recorded quantity is still on the shelf.</p>
      <h2 style="margin-top:26px">2. Price</h2>
      ${f.prefilled ? `<p class="hint">Pre-filled from your last listing of this product.</p>` : ''}
      <div class="cols">${fld('bl', 'orig', 'Original price', rmInp('bl', 'orig'))}${fld('bl', 'price', 'Rescue price', rmInp('bl', 'price'))}</div>
      <div class="pills"><span class="mute sm">Quick price:</span>${[30, 50, 70].map((p) => `<button type="button" class="pill" data-act="bldisc" data-p="${p}">-${p}%</button>`).join('')}</div>
      <div class="calc"><div><b style="font-size:13px;display:block">Discount</b><span class="mute sm" id="bl-calcsub">Enter both prices to calculate</span></div><b id="bl-calc">–</b></div>
      <h2 style="margin-top:26px">3. Food rules</h2>
      ${eligFields('bl', true)}
      ${disclose(`Collection details <span class="mute" id="bl-pickline">${pickLine(f)}</span>`, `<div class="cols">${fld('bl', 'pickupUntil', 'Last collection day', inp('bl', 'pickupUntil', 'date', `min="${todayIso()}" max="${maxDay}"`), f.expiryType === 'use-by' ? 'Use-by food must be collected at least a day before the date.' : 'On or before the date on the pack.')}
      <div class="cols" style="gap:0 10px">${fld('bl', 'pickFrom', 'Open from', inp('bl', 'pickFrom', 'time'))}${fld('bl', 'pickTo', 'Collect until', inp('bl', 'pickTo', 'time'))}</div></div>
      <div class="fld"><label class="l">Pickup location</label><div class="fixed">${ic('pin', 'sm')}<span><b>${esc(s.name)}</b><br>${esc(s.area)}</span></div><div class="hint">Your registered store address. Change it in <a class="link" href="#/profile">Profile &amp; settings</a>.</div></div>
      ${fld('bl', 'instr', 'Pickup instructions', ta('bl', 'instr'))}
      ${fld('bl', 'desc', 'Description <span class="mute" style="font-weight:400">(optional)</span>', ta('bl', 'desc', 'placeholder="Condition, packaging notes…"'))}`, { open: pickErr })}
      <div class="wnav"><a class="btn sec" href="#/batch/${b.id}">Cancel</a><button class="btn" type="submit">Preview listing</button></div>
    </form>
    <div class="side-prev"><h4>Listing preview</h4><div id="bl-prev">${card(blListing(), { static: true })}</div></div>
  </div>`
}
const pickLine = (f) => `· by ${f.pickupUntil ? fmtDate(f.pickupUntil) : 'choose a day'}, ${fmtTime(f.pickFrom)}–${fmtTime(f.pickTo)}`
const blListing = () => { const f = FORMS.bl, b = getB(f.bid); return { id: 'preview', name: b.name, cat: b.cat, kind: b.kind, seller: me().sellerId, orig: +f.orig || 0, price: +f.price || 0, total: +f.remaining || 0, expiry: b.expiry, expiryType: b.expiryType, pickupUntil: f.pickupUntil, pickTo: f.pickTo, photos: b.photo ? [b.photo] : [] } }
HOOKS.bl = (k) => {
  const f = FORMS.bl
  const p = $('#bl-prev'); if (p) p.innerHTML = card(blListing(), { static: true })
  const pl = $('#bl-pickline'); if (pl) pl.textContent = pickLine(f)
  const lq = $('#bl-lq'); if (lq) lq.textContent = +f.remaining > 0 ? +f.remaining : '–'
  const o = +f.orig, pr = +f.price, c = $('#bl-calc')
  if (c) { c.textContent = o > 0 && pr > 0 && pr < o ? `-${Math.round((1 - pr / o) * 100)}%` : '–'; $('#bl-calcsub').textContent = o > 0 && pr >= o ? 'Rescue price must be lower than the original price' : o > 0 && pr > 0 ? `Buyers pay ${rm(o - pr)} less per unit` : 'Enter both prices to calculate' }
  if (['pack', 'c1', 'c2', 'c3', 'init'].includes(k)) { const el = $('#bl-elig'); if (el) el.innerHTML = eligResult({ ...f, expiry: getB(f.bid).expiry }) }
}
function previewBatchListing() {
  const f = FORMS.bl, b = getB(f.bid), e = {}
  const n = +f.remaining, cap = batchListable(b)
  if (!(Number.isInteger(n) && n >= 1)) e.remaining = 'Enter the number of units you counted (at least 1).'
  else if (n > cap) e.remaining = `At most ${cap} unit${cap === 1 ? '' : 's'} can be offered from this batch.`
  if (!(+f.orig > 0)) e.orig = 'Enter the original price.'
  if (!(+f.price > 0)) e.price = 'Enter a rescue price.'
  else if (+f.price >= +f.orig) e.price = 'Rescue price must be lower than the original price.'
  Object.assign(e, pickupErrors({ ...f, expiry: b.expiry }))
  if (!f.instr.trim()) e.instr = 'Add pickup instructions for buyers.'
  const el = eligibility({ ...f, expiry: b.expiry })
  if (!f.pack) e.pack = 'Select the food type and storage.'
  f.err = e
  if (Object.keys(e).length || !el.ok) { app.render(); focusErr(); toast(el.rejected ? "Not eligible for the pilot" : 'Check the highlighted fields', 'alert'); return }
  const l = blListing()
  confirmDlg({
    title: 'Preview and publish',
    body: `<div class="prevgrid"><div style="pointer-events:none">${card(l, { static: true })}</div><div class="revlist">${[['Units offered', `${n} of ${b.qty} received`], ['Price', `${rm(l.price)} <s class="mute">${rm(l.orig)}</s>`], ['Date on pack', `${dateWord(b.expiryType)} ${fmtDate(b.expiry)}`], ['Collect', `by ${fmtDate(f.pickupUntil)}, ${fmtTime(f.pickFrom)}–${fmtTime(f.pickTo)}`], ['Pickup', esc(mySeller().area)]].map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')}</div></div>${eligResult({ ...f, expiry: b.expiry })}<p class="note warn">${ic('basket', 'sm')}<span>The listing goes live after you confirm the units are in your Clearance Basket.</span></p>`,
    ok: 'Publish listing', cls: 'sage',
    onOk: () => {
      const id = uid('m')
      S.listings.unshift({ id, name: b.name, cat: b.cat, kind: b.kind, photos: b.photo ? [b.photo] : [], seller: me().sellerId, orig: +(+f.orig).toFixed(2), price: +(+f.price).toFixed(2), total: n, withdrawn: 0, expiry: b.expiry, expiryType: b.expiryType || 'best-before', pickupUntil: f.pickupUntil, pickFrom: f.pickFrom, pickTo: f.pickTo, desc: f.desc.trim() || `${b.name}, counted on the shelf before listing.`, instr: f.instr.trim(), pack: f.pack, status: 'pending', moved: false, batchId: b.id, postedAt: Date.now() })
      Object.assign(b, { verify: 'listed', counted: n, verifiedAt: Date.now() })
      mySeller().defaultInstr = f.instr.trim()
      logAct('basket', `Counted ${n} of ${b.qty} units and listed ${b.name}`)
      delete FORMS.bl
      save(); app.refreshChrome(); go(`#/basket/${id}?new=1`)
    },
  })
  $('#modal').classList.add('wide')
}

/* ================= Exports ================= */
export const routes = {
  scan: (p) => (p[1] === 'result' ? pageResult() : pageScan()),
  barcode: pageBarcode,
  inventory: pageInventory,
  batches: pageBatches,
  batch: (p) => (p[2] === 'list' ? pageBatchList(p[1]) : pageBatch(p[1])),
}
export const actions = {
  camon: () => { scan.mode = 'camera'; app.render() },
  camoff: () => { scan.mode = 'idle'; scan.image = null; app.render() },
  capture,
  usesuggest: () => { const f = FORMS.res; f.expiry = f.detected; app.render() },
  scanlabel: () => { const f = FORMS.res; f.detected = iso(addDays(today0(), 5)); f.expiry = f.detected; f.result = 'success'; app.render(); toast('Simulated label reading – confirm the date against the pack') },
  bcsample: (el) => { $('#bc-code').value = el.dataset.c; lookup(el.dataset.c) },
  bcuse: () => bcToResult(bc.item),
  bcwrong: () => { bc.state = 'notfound'; FORMS.bcnew = { name: '', cat: '', err: {} }; app.render() },
  bttab: (el) => { bt.tab = el.dataset.t; app.render() },
  addmanual: () => invForm(null),
  invedit: (el) => invForm(S.inventory.find((i) => i.id === el.dataset.id)),
  batchedit: (el) => invForm(getB(el.dataset.id)),
  invdone: (el) => useDialog(S.inventory.find((x) => x.id === el.dataset.id), el.dataset.s),
  useall: (el) => { $('#use-n').value = el.dataset.n },
  invundo: (el) => undoUse(S.inventory.find((x) => x.id === el.dataset.id)),
  invdel: (el) => { const i = S.inventory.find((x) => x.id === el.dataset.id); confirmDlg({ title: 'Delete this item?', body: `<p><b>${esc(i.name)}</b> will be removed from your list. Use “Used” or “Discard” instead if you want to keep a record.</p>`, ok: 'Delete', cls: 'danger', onOk: () => { S.inventory = S.inventory.filter((x) => x.id !== i.id); logAct('trash', `Deleted ${i.name}`); save(); toast('Item deleted'); app.render() } }) },
  dismiss: (el) => { const b = getB(el.dataset.id); confirmDlg({ title: 'Mark batch as sold out?', body: `<p>You're confirming there are <b>no units</b> of <b>${esc(b.name)}</b> left on the shelf. The batch (received ${b.qty}) is closed and nothing is listed.</p>`, ok: 'Sold out – dismiss batch', cls: 'danger', onOk: () => { Object.assign(b, { verify: 'dismissed', counted: 0, verifiedAt: Date.now() }); logAct('ban', `Dismissed batch ${b.name} – sold out`); save(); toast('Batch dismissed as sold out'); app.refreshChrome(); app.render() } }) },
  recheck: (el) => { const b = getB(el.dataset.id); b.verify = 'unverified'; save(); go(`#/batch/${b.id}/list`) },
  bldisc: (el) => { const f = FORMS.bl, o = +f.orig; if (!(o > 0)) { toast('Enter the original price first', 'alert'); return $('#bl-orig')?.focus() } f.price = (Math.round(o * (1 - +el.dataset.p / 100) * 10) / 10).toFixed(2); $('#bl-price').value = f.price; HOOKS.bl('price') },
}
export function input(e) {
  const t = e.target
  if (t.id === 'inv-q') { inv.q = t.value; rerenderKeep(t); return true }
  if (t.id === 'bt-q') { bt.q = t.value; rerenderKeep(t); return true }
  return false
}
function rerenderKeep(t) { const id = t.id, pos = t.selectionStart; app.render(); const n = $('#' + id); if (n) { n.focus(); n.setSelectionRange(pos, pos) } }
export function change(e) {
  const t = e.target
  if (t.dataset.scanSample !== undefined) { scan.sample = t.value; if (scan.mode === 'camera') app.render(); return true }
  if (t.id === 'scan-file' && t.files.length) { readImages(t.files, 1).then((xs) => { if (!xs[0]) return toast('Could not read that image', 'alert'); scan.image = xs[0]; scan.mode = 'camera'; capture() }); return true }
  if (t.id === 'inv-cat') { inv.cat = t.value; inv.more = true; app.render(); return true }
  if (t.id === 'inv-sort') { inv.sort = t.value; inv.more = true; app.render(); return true }
  return false
}
export function submit(e) {
  const id = e.target.id
  if (id === 'f-res') { saveResult(); return true }
  if (id === 'f-bc') { lookup($('#bc-code').value); return true }
  if (id === 'f-bcnew') {
    const f = FORMS.bcnew, er = {}
    if (f.name.trim().length < 2) er.name = 'Enter the product name.'
    if (!f.cat) er.cat = 'Choose a category.'
    f.err = er
    if (Object.keys(er).length) return app.render(), focusErr(), true
    const it = { barcode: bc.code, name: f.name.trim(), cat: f.cat, kind: catKind(f.cat), src: 'user', by: isRetailer() ? mySeller().name : me().name, at: Date.now() }
    S.catalogue.push(it); save(); toast('Product saved on this browser')
    bcToResult(it)
    return true
  }
  if (id === 'f-man') { saveMan(); return true }
  if (id === 'f-bl') { previewBatchListing(); return true }
  return false
}
