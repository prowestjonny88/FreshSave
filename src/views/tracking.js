// Module A – food scanning, barcode lookup, individual inventory and retailer batches.
import { SCAN_SAMPLES } from '../data.js'
import {
  S, save, $, esc, ic, rm, photo, catLabel, catOptions, CATEGORIES, uid, toast, go, app, route, me, isRetailer, mySeller,
  todayIso, iso, addDays, today0, fmtDT, fmtDate, fmtShort, daysTo, expStatus, countdown, expLong, plural, sp, pageHead, empty, openModal, closeModal, confirmDlg,
  logAct, syncReminders, readImages, getB, getL, FORMS, HOOKS, fld, inp, sel, ta, chk, rmInp, eligFields, eligResult, eligibility, card, thumb, CL_CLS,
} from '../core.js'

/* ================= Scan (photo + simulated OCR) ================= */
const scan = { mode: 'idle', sample: 'milk', image: null }
const sampleOf = () => SCAN_SAMPLES.find((x) => x.id === scan.sample)

function pageScan() {
  const s = sampleOf()
  const target = isRetailer() ? 'batch inventory' : 'inventory'
  let cam
  if (scan.mode === 'idle') cam = `<div class="cam-off">${ic('camera')}<h3>Scan a product photo</h3><p class="mute">Photograph the product with its expiry or best-before date visible. You'll check the date before it's saved to your ${target}.</p>
      <div class="acts"><button class="btn" data-act="camon">${ic('camera', 'sm')}Take Product Photo</button><label class="btn sec">${ic('upload', 'sm')}Upload Product Image<input type="file" accept="image/*" id="scan-file" hidden></label></div></div>`
  else cam = `<div class="viewfinder"><img src="${scan.image || photo(s.kind, 0, 900)}" alt="Camera preview"><span class="vf-c tl"></span><span class="vf-c tr"></span><span class="vf-c bl"></span><span class="vf-c br"></span>
      ${scan.mode === 'processing' ? `<div class="vf-busy"><span class="spin"></span>Reading product name and expiry date…</div>` : `<div class="scanline"></div><span class="vf-hint">Keep the expiry date inside the frame</span>`}</div>
      <div class="cam-ctl"><button class="btn sec sm" data-act="camoff" ${scan.mode === 'processing' ? 'disabled' : ''}>Cancel</button><button class="shutter" data-act="capture" aria-label="Capture" ${scan.mode === 'processing' ? 'disabled' : ''}></button><label class="btn sec sm">${ic('upload', 'sm')}Upload<input type="file" accept="image/*" id="scan-file" hidden></label></div>`
  return `${pageHead('Scan Food', `Product photo scanning is the quickest way to add food to your ${target}.`)}
  <div class="scan">
    <div class="cam ${scan.mode}">${cam}<div class="cam-foot mute sm">${ic('info', 'xs')} Camera preview and expiry-date reading are simulated in this prototype.</div></div>
    <aside class="scan-side">
      <div class="box"><h3>For a clear scan</h3><ul class="tips"><li>Show the full product name on the front of the pack</li><li>Make sure the expiry or best-before date is in focus</li><li>Avoid glare from shiny packaging</li></ul></div>
      <div class="box"><h3>Prototype: OCR outcome</h3><p class="mute sm" style="margin-bottom:8px">Choose which detection result to demonstrate.</p>
        ${SCAN_SAMPLES.map((x) => `<label class="rad"><input type="radio" name="sample" data-scan-sample value="${x.id}" ${scan.sample === x.id ? 'checked' : ''}><span>${x.label}</span>${sp(x.result === 'success' ? 'Detected' : x.result === 'uncertain' ? 'Uncertain' : 'Failed', x.result === 'success' ? 'g' : x.result === 'uncertain' ? 'o' : 'r')}</label>`).join('')}</div>
      <a class="alt-opt" href="#/barcode">${ic('barcode')}<span><b>Scan a barcode instead</b><small>Optional – look up the product name from the shared catalogue</small></span>${ic('cr', 'sm')}</a>
    </aside>
  </div>`
}
function capture() {
  if (scan.mode === 'processing') return
  scan.mode = 'processing'; app.render()
  setTimeout(() => {
    const s = sampleOf()
    const det = s.exp == null ? '' : iso(addDays(today0(), s.exp))
    FORMS.res = { result: s.result, conf: s.conf, image: scan.image || photo(s.kind, 0), kind: s.kind, name: s.name, cat: s.cat, detected: det, expiry: det, qty: '1', date: todayIso(), ok: false, err: {} }
    scan.mode = 'idle'; scan.image = null
    go('#/scan/result')
  }, 1300)
}

function pageResult() {
  const f = FORMS.res
  if (!f) return go('#/scan') || ''
  const R = isRetailer()
  const banner = {
    success: [`Expiry date detected`, `Confidence ${f.conf}% · the product name and date were read clearly.`, 'g', 'check2'],
    uncertain: ['Uncertain detection', `Confidence ${f.conf}% · part of the date was unclear. Compare it carefully with the package.`, 'o', 'alert'],
    failed: ['No expiry date detected', "We couldn't read a product name or date from this photo. Enter the details from the package.", 'r', 'ban'],
    barcode: ['Product identified by barcode', 'Barcodes don\'t contain expiry dates. Enter the date from the package or scan the label.', '', 'barcode'],
  }[f.result]
  return `<div class="crumbs"><a href="#/scan">Scan Food</a>${ic('cr', 'xs')}<span>Scan result</span></div>
  ${pageHead('Confirm scan result', 'Review what was detected, correct anything that looks wrong, then save.')}
  <div class="result">
    <div class="box">
      <div class="res-img"><img src="${f.image}" alt="Scanned product"></div>
      <div class="detect ${banner[2]}">${ic(banner[3], 'sm')}<div><b>${banner[0]}</b><span>${banner[1]}</span></div></div>
      ${f.result === 'barcode' ? `<button class="btn sec block" data-act="scanlabel" style="margin-top:10px">${ic('camera', 'sm')}Scan expiry label</button>` : ''}
      <dl class="deflist"><dt>Detected name</dt><dd>${f.result === 'failed' ? '<span class="mute">Not detected</span>' : esc(f.name)}</dd><dt>Detected expiry</dt><dd>${f.detected ? `${fmtDate(f.detected)}${f.result === 'uncertain' ? ' <span class="mute">(low confidence)</span>' : ''}` : '<span class="mute">Not detected</span>'}</dd><dt>Category</dt><dd>${f.cat ? catLabel(f.cat) : '<span class="mute">Not detected</span>'}</dd>${f.barcode ? `<dt>Barcode</dt><dd>${f.barcode}</dd>` : ''}</dl>
      <a class="link sm" href="#/scan">${ic('refresh', 'xs')} Rescan</a>
    </div>
    <form class="form" id="f-res" novalidate>
      <h2>${R ? 'Batch details' : 'Food details'}</h2>
      ${fld('res', 'name', 'Product name', inp('res', 'name', 'text', 'placeholder="e.g. Dutch Lady Full Cream Milk 1L"'))}
      <div class="cols">${fld('res', 'cat', 'Category', sel('res', 'cat', catOptions(f.cat)))}
      ${fld('res', 'qty', R ? 'Recorded batch quantity' : 'Quantity', inp('res', 'qty', 'number', 'min="1" step="1"'), R ? 'Units received in this batch.' : '')}</div>
      ${fld('res', 'date', R ? 'Date recorded' : 'Purchase date', inp('res', 'date', 'date', `max="${todayIso()}"`))}
      <div class="confirm-date">
        <div class="cd-head">${ic('alert', 'sm')}<b>Please confirm the expiry date before saving.</b></div>
        ${fld('res', 'expiry', 'Expiry date', inp('res', 'expiry', 'date'), f.detected ? `Detected: ${fmtDate(f.detected)} – change it if it doesn't match the package.` : 'Enter the date printed on the package.')}
        ${chk('res', 'ok', 'I have checked this expiry date against the product package')}
        <div class="e" style="display:${f.err.ok ? 'block' : 'none'};color:var(--red);font-size:12px">${esc(f.err.ok || '')}</div>
      </div>
      <div class="wnav"><a class="btn sec" href="#/scan">Rescan</a><button class="btn" type="submit">${ic('check', 'sm')}Confirm & Save</button></div>
    </form>
  </div>`
}
function saveResult() {
  const f = FORMS.res, e = {}
  if (f.name.trim().length < 2) e.name = 'Enter the product name.'
  if (!f.cat) e.cat = 'Choose a category.'
  if (!(Number.isInteger(+f.qty) && +f.qty >= 1)) e.qty = 'Enter a whole number of at least 1.'
  if (!f.date) e.date = 'Enter a date.'
  if (!f.expiry) e.expiry = 'Enter the expiry date from the package.'
  if (!f.ok) e.ok = 'Tick the box to confirm you have checked the expiry date.'
  f.err = e
  if (Object.keys(e).length) return app.render()
  const base = { name: f.name.trim(), cat: f.cat, kind: f.kind || 'rice', photo: f.image?.startsWith('data:') ? f.image : null, expiry: f.expiry, addedAt: Date.now() }
  let href
  if (isRetailer()) {
    const b = { id: uid('b'), owner: me().id, ...base, qty: +f.qty, recorded: f.date, verify: 'unverified', barcode: f.barcode }
    S.batches.unshift(b); logAct('layers', `Recorded batch: ${b.name} (${b.qty} units)`); href = `#/batch/${b.id}`
  } else {
    const i = { id: uid('i'), owner: me().id, ...base, qty: +f.qty, purchased: f.date, status: 'active', barcode: f.barcode }
    S.inventory.unshift(i); logAct(f.result === 'barcode' ? 'barcode' : 'camera', `Added ${i.name} by ${f.result === 'barcode' ? 'barcode' : 'photo scan'}`); href = `#/inventory?new=${i.id}`
  }
  save()
  const n = syncReminders()
  toast(n ? `Saved. ${expLong(f.expiry)} – reminder added to notifications` : "Saved. You'll be reminded 7, 3 and 1 day before it expires", n ? 'bell' : 'check')
  delete FORMS.res
  app.refreshChrome()
  go(href)
}

/* ================= Barcode lookup (optional) ================= */
const bc = { code: '', state: null, item: null }
FORMS.bcnew = { name: '', cat: '', err: {} }
const BC_SAMPLES = [['9556041610016', 'Dutch Lady Milk'], ['9556001062043', 'Milo'], ['9556570310126', 'Gardenia Bread'], ['9551234567890', 'Unregistered item']]
function pageBarcode() {
  let res = ''
  const it = bc.item
  if (bc.state === 'found' || bc.state === 'registered') res = `<div class="box bc-res"><div class="bc-head">${sp(bc.state === 'found' ? 'Product found' : 'Previously registered product', 'g')}<span class="mute sm">Barcode ${bc.code}</span></div>
      <div class="srow big"><img src="${photo(it.kind, 0, 300)}" alt=""><div><h3>${esc(it.name)}</h3><div class="mute">${catLabel(it.cat)}</div>
      <div class="mute sm" style="margin-top:6px">${bc.state === 'found' ? 'From the FreshSave shared catalogue' : `Registered by ${esc(it.by)}${it.at ? ' · ' + new Date(it.at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`}</div></div></div>
      ${bc.state === 'registered' ? `<p class="note">${ic('info', 'sm')}<span>Once registered, this product can be recognised by other FreshSave users.</span></p>` : ''}
      <div class="row-acts"><button class="btn" data-act="bcuse">${ic('check', 'sm')}${bc.state === 'found' ? 'Confirm Product' : 'Use this product'}</button><button class="btn sec" data-act="bcwrong">Not this product</button></div></div>`
  else if (bc.state === 'notfound') res = `<form class="box bc-res" id="f-bcnew" novalidate><div class="bc-head">${sp('Product not found', 'y')}<span class="mute sm">Scanned barcode ${bc.code}</span></div>
      <p class="mute">This barcode isn't in the shared catalogue yet. Add the product details once and you can continue.</p>
      ${fld('bcnew', 'name', 'Product name', inp('bcnew', 'name', 'text', 'placeholder="e.g. Massimo Sandwich Loaf 400g"'))}
      ${fld('bcnew', 'cat', 'Category', sel('bcnew', 'cat', catOptions(FORMS.bcnew.cat)))}
      <p class="note">${ic('info', 'sm')}<span>Once registered, this product can be recognised by other FreshSave users.</span></p>
      <div class="row-acts"><button class="btn" type="submit">Save Product Information</button></div></form>`
  return `<div class="crumbs"><a href="#/scan">Scan Food</a>${ic('cr', 'xs')}<span>Barcode lookup</span></div>
  ${pageHead('Barcode lookup', 'Optional. Identify the product from its barcode – you\'ll still confirm the expiry date.')}
  <div class="bc">
    <form class="box" id="f-bc" novalidate><div class="bc-scan">${ic('barcode')}<span>Barcode camera (simulated)</span><i class="scanline"></i></div>
      <div class="fld"><label class="l" for="bc-code">Barcode number</label><div class="inline"><input type="text" id="bc-code" inputmode="numeric" maxlength="14" value="${esc(bc.code)}" placeholder="e.g. 9556041610016"><button class="btn" type="submit">Look up</button></div></div>
      <div class="pills" style="margin-top:10px"><span class="mute sm">Try:</span>${BC_SAMPLES.map(([c, n]) => `<button type="button" class="pill" data-act="bcsample" data-c="${c}">${n}</button>`).join('')}</div>
      <p class="mute sm" style="margin-top:14px">FreshSave recognises products from its shared catalogue of products registered by users. It does not access retailer POS or cashier databases.</p>
      <a class="link sm" href="#/scan">${ic('camera', 'xs')} Back to photo scanning</a>
    </form>
    <div>${res || `<div class="box mute" style="display:grid;place-items:center;min-height:220px;text-align:center">${ic('barcode')}<span>Enter or scan a barcode to look it up.</span></div>`}</div>
  </div>`
}
function lookup(code) {
  code = code.replace(/\D/g, '')
  bc.code = code
  if (code.length < 8) { toast('Enter a valid barcode number (8–14 digits)', 'alert'); return app.render() }
  const it = S.catalogue.find((c) => c.barcode === code)
  bc.item = it || null
  bc.state = !it ? 'notfound' : it.src === 'catalogue' ? 'found' : 'registered'
  FORMS.bcnew = { name: '', cat: '', err: {} }
  app.render()
}
function bcToResult(it) {
  FORMS.res = { result: 'barcode', conf: 0, image: photo(it.kind, 0), kind: it.kind, name: it.name, cat: it.cat, detected: '', expiry: '', qty: '1', date: todayIso(), ok: false, err: {}, barcode: bc.code }
  bc.state = null; bc.code = ''
  go('#/scan/result')
}

/* ================= Individual inventory ================= */
const inv = { q: '', cat: '', st: 'active', sort: 'exp' }
const INV_TABS = [['active', 'All active'], ['fresh', 'Fresh'], ['d7', 'Within 7 days'], ['d3', 'Within 3 days'], ['d1', 'Within 1 day'], ['expired', 'Expired'], ['history', 'Consumed & discarded']]
function pageInventory(parts, q) {
  const u = me()
  const all = S.inventory.filter((i) => i.owner === u.id)
  const active = all.filter((i) => i.status === 'active')
  const count = (k) => (k === 'active' ? active.length : k === 'history' ? all.length - active.length : active.filter((i) => expStatus(i.expiry).k === k).length)
  let xs = inv.st === 'history' ? all.filter((i) => i.status !== 'active') : inv.st === 'active' ? active : active.filter((i) => expStatus(i.expiry).k === inv.st)
  if (inv.q) xs = xs.filter((i) => i.name.toLowerCase().includes(inv.q.toLowerCase()))
  if (inv.cat) xs = xs.filter((i) => i.cat === inv.cat)
  const sorts = { exp: (a, b) => a.expiry.localeCompare(b.expiry), new: (a, b) => b.addedAt - a.addedAt, name: (a, b) => a.name.localeCompare(b.name), qty: (a, b) => b.qty - a.qty }
  xs.sort(sorts[inv.sort])
  const hl = q.get('new')
  const p = u.prefs
  const row = (i) => {
    const st = expStatus(i.expiry), d = daysTo(i.expiry), done = i.status !== 'active'
    return `<tr class="${hl === i.id ? 'hl' : ''}"><td class="pc"><div class="pcell"><img src="${thumb(i)}" alt=""><div><b>${esc(i.name)}</b>${i.barcode ? `<span class="mute sm">Barcode ${i.barcode}</span>` : ''}</div></div></td>
      <td data-l="Category">${catLabel(i.cat)}</td><td data-l="Quantity">${i.qty}</td><td data-l="Purchased">${fmtShort(i.purchased)}</td><td data-l="Expiry date">${fmtDate(i.expiry)}</td>
      <td data-l="Remaining">${done ? '–' : `<b class="${d <= 1 ? 'hot' : ''}">${d < 0 ? `${-d}d ago` : plural(d, 'day')}</b>`}</td>
      <td data-l="Status">${done ? sp(i.status === 'consumed' ? 'Consumed' : 'Discarded', i.status === 'consumed' ? 'g' : '') : sp(st.label, st.cls)}</td>
      <td data-l="Actions"><div class="acts-cell">${done ? '' : `<button class="ibtn" data-act="invdone" data-id="${i.id}" data-s="consumed" title="Mark as consumed">Consumed</button><button class="ibtn" data-act="invdone" data-id="${i.id}" data-s="discarded" title="Mark as discarded">Discarded</button><button class="ibtn icon" data-act="invedit" data-id="${i.id}" title="Edit" aria-label="Edit">${ic('edit', 'xs')}</button>`}<button class="ibtn icon d" data-act="invdel" data-id="${i.id}" title="Delete" aria-label="Delete">${ic('trash', 'xs')}</button></div></td></tr>`
  }
  return `${pageHead('My Inventory', `${plural(active.length, 'item')} tracked at home`, `<button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}Add Food</button><a class="btn" href="#/scan">${ic('camera', 'sm')}Scan Food</a>`)}
  <div class="remind">${ic('bell', 'sm')}<span>Expiry reminders:</span>${[['d7', '7 days before'], ['d3', '3 days before'], ['d1', '1 day before']].map(([k, t]) => sp(t + (p[k] ? '' : ' (off)'), p[k] ? 'g' : '')).join('')}<a class="link sm" href="#/profile">Change</a></div>
  <div class="tabs">${INV_TABS.map(([k, t]) => `<button class="tab ${inv.st === k ? 'on' : ''}" data-act="invtab" data-t="${k}">${t}<i>${count(k)}</i></button>`).join('')}</div>
  <div class="tbar"><div class="tsearch">${ic('search', 'sm')}<input type="search" id="inv-q" placeholder="Search your inventory" value="${esc(inv.q)}" aria-label="Search inventory"></div>
    <select class="sel" id="inv-cat" aria-label="Category">${catOptions(inv.cat, 'All categories')}</select>
    <select class="sel" id="inv-sort" aria-label="Sort">${[['exp', 'Expiry: soonest first'], ['new', 'Recently added'], ['name', 'Name A–Z'], ['qty', 'Quantity']].map(([v, t]) => `<option value="${v}" ${inv.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
  ${xs.length ? `<table class="tbl inv"><thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Purchased</th><th>Expiry date</th><th>Remaining</th><th>Status</th><th>Actions</th></tr></thead><tbody>${xs.map(row).join('')}</tbody></table>`
    : `<div class="tabempty">${all.length ? 'No items match these filters.' : empty('box', 'Your inventory is empty', 'Scan a product photo or add food manually to start tracking expiry dates.', `<a class="btn" href="#/scan">${ic('camera', 'sm')}Scan Food</a><button class="btn sec" data-act="addmanual">Add manually</button>`)}</div>`}`
}
function invForm(item) {
  const R = isRetailer()
  FORMS.man = item ? { id: item.id, name: item.name, cat: item.cat, qty: String(item.qty), date: item.purchased || item.recorded, expiry: item.expiry, err: {} } : { name: '', cat: '', qty: '1', date: todayIso(), expiry: '', err: {} }
  const body = () => `<h3>${item ? 'Edit item' : R ? 'Record a batch manually' : 'Add food manually'}</h3>
    <form id="f-man" novalidate>${fld('man', 'name', 'Product name', inp('man', 'name'))}
    <div class="cols">${fld('man', 'cat', 'Category', sel('man', 'cat', catOptions(FORMS.man.cat)))}${fld('man', 'qty', R ? 'Recorded quantity' : 'Quantity', inp('man', 'qty', 'number', 'min="1"'))}</div>
    <div class="cols">${fld('man', 'date', R ? 'Date recorded' : 'Purchase date', inp('man', 'date', 'date', `max="${todayIso()}"`))}${fld('man', 'expiry', 'Expiry date', inp('man', 'expiry', 'date'))}</div>
    <p class="note warn">${ic('alert', 'sm')}<span>Please confirm the expiry date matches the package before saving.</span></p>
    <div class="macts"><button type="button" class="btn sec" data-act="mclose">Cancel</button><button class="btn" type="submit">${item ? 'Save changes' : 'Confirm & Save'}</button></div></form>`
  HOOKS.manBody = body
  openModal(body(), 'wide')
}
function saveMan() {
  const f = FORMS.man, e = {}
  if (f.name.trim().length < 2) e.name = 'Enter the product name.'
  if (!f.cat) e.cat = 'Choose a category.'
  if (!(Number.isInteger(+f.qty) && +f.qty >= 1)) e.qty = 'Enter a whole number of at least 1.'
  if (!f.date) e.date = 'Enter a date.'
  if (!f.expiry) e.expiry = 'Enter the expiry date.'
  f.err = e
  if (Object.keys(e).length) { $('#modal').innerHTML = HOOKS.manBody(); return }
  const R = isRetailer()
  if (f.id) {
    const x = R ? getB(f.id) : S.inventory.find((i) => i.id === f.id)
    Object.assign(x, { name: f.name.trim(), cat: f.cat, qty: +f.qty, expiry: f.expiry, [R ? 'recorded' : 'purchased']: f.date })
    logAct('edit', `Edited ${x.name}`); toast('Changes saved')
  } else if (R) {
    const b = { id: uid('b'), owner: me().id, name: f.name.trim(), cat: f.cat, kind: catKind(f.cat), qty: +f.qty, recorded: f.date, expiry: f.expiry, verify: 'unverified', addedAt: Date.now() }
    S.batches.unshift(b); logAct('layers', `Recorded batch: ${b.name} (${b.qty} units)`); toast('Batch recorded')
  } else {
    const i = { id: uid('i'), owner: me().id, name: f.name.trim(), cat: f.cat, kind: catKind(f.cat), qty: +f.qty, purchased: f.date, expiry: f.expiry, status: 'active', addedAt: Date.now() }
    S.inventory.unshift(i); logAct('plus', `Added ${i.name} manually`); toast("Saved. You'll be reminded 7, 3 and 1 day before it expires")
  }
  save(); syncReminders(); closeModal(); app.refreshChrome(); app.render()
}
const catKind = (c) => ({ produce: 'veg', dairy: 'milk', bakery: 'bread', meat: 'chicken', frozen: 'nuggets', pantry: 'rice', others: 'juice' })[c] || 'rice'

/* ================= Retailer batch inventory ================= */
const bt = { tab: 'check', q: '' }
function vStatus(b) {
  if (b.verify === 'dismissed') return sp('Sold out – dismissed', '')
  if (b.verify === 'listed') return sp(`Verified · ${b.remaining} of ${b.qty} listed`, 'g')
  return daysTo(b.expiry) < 0 ? sp('Expired – not verified', 'r') : sp('Stock check needed', 'y')
}
function pageBatches() {
  const mine = S.batches.filter((b) => b.owner === me().id)
  const groups = { check: mine.filter((b) => b.verify === 'unverified'), listed: mine.filter((b) => b.verify === 'listed'), dismissed: mine.filter((b) => b.verify === 'dismissed'), all: mine }
  let xs = groups[bt.tab]
  if (bt.q) xs = xs.filter((b) => b.name.toLowerCase().includes(bt.q.toLowerCase()))
  xs = [...xs].sort((a, b) => a.expiry.localeCompare(b.expiry))
  const soon = groups.check.filter((b) => daysTo(b.expiry) <= 3)
  return `${pageHead('Batch Inventory', 'Stock batches you have recorded, with their expiry dates.', `<button class="btn sec" data-act="addmanual">${ic('plus', 'sm')}Record batch</button><a class="btn" href="#/scan">${ic('camera', 'sm')}Scan batch</a>`)}
  <div class="note">${ic('info', 'sm')}<span>FreshSave isn't connected to your cashier or POS system. Recorded quantities are what you entered when the batch arrived – check the physical shelf before listing or dismissing a batch.</span></div>
  ${soon.length ? `<div class="note warn">${ic('bell', 'sm')}<span><b>${plural(soon.length, 'batch')} expiring within 3 days</b> need a stock check: ${soon.map((b) => `<a class="link" href="#/batch/${b.id}">${esc(b.name)}</a>`).join(', ')}</span></div>` : ''}
  <div class="tabs">${[['check', 'Needs stock check'], ['listed', 'Listed'], ['dismissed', 'Sold out / dismissed'], ['all', 'All batches']].map(([k, t]) => `<button class="tab ${bt.tab === k ? 'on' : ''}" data-act="bttab" data-t="${k}">${t}<i>${groups[k].length}</i></button>`).join('')}</div>
  <div class="tbar"><div class="tsearch">${ic('search', 'sm')}<input type="search" id="bt-q" placeholder="Search batches" value="${esc(bt.q)}" aria-label="Search batches"></div></div>
  ${xs.length ? `<table class="tbl"><thead><tr><th>Product</th><th>Batch expiry</th><th>Date recorded</th><th>Recorded qty</th><th>Stock verification</th><th>Expiry countdown</th><th></th></tr></thead><tbody>${xs.map((b) => { const st = expStatus(b.expiry); return `<tr><td class="pc"><div class="pcell"><img src="${thumb(b)}" alt=""><div><a href="#/batch/${b.id}"><b>${esc(b.name)}</b></a><span class="mute sm">${catLabel(b.cat)}</span></div></div></td>
    <td data-l="Batch expiry">${fmtDate(b.expiry)}</td><td data-l="Recorded">${fmtShort(b.recorded)}</td><td data-l="Recorded qty">${b.qty}</td><td data-l="Verification">${vStatus(b)}</td>
    <td data-l="Countdown">${b.verify === 'unverified' ? sp(countdown(b.expiry), st.cls) : `<span class="mute">${countdown(b.expiry)}</span>`}</td>
    <td data-l=""><a class="btn sm ${b.verify === 'unverified' ? '' : 'sec'}" href="#/batch/${b.id}">${b.verify === 'unverified' ? 'Check stock' : 'View'}</a></td></tr>` }).join('')}</tbody></table>`
    : `<div class="tabempty">${mine.length ? 'No batches in this view.' : empty('layers', 'No batches recorded yet', 'Record incoming stock by batch so FreshSave can remind you before it expires.', `<a class="btn" href="#/scan">Scan batch</a><button class="btn sec" data-act="addmanual">Record manually</button>`)}</div>`}`
}

function pageBatch(id) {
  const b = getB(id)
  if (!b || b.owner !== me().id) return empty('info', 'Batch not found', 'It may have been removed.', '<a class="btn" href="#/batches">Back to batches</a>')
  const st = expStatus(b.expiry), d = daysTo(b.expiry), l = b.listingId && getL(b.listingId)
  let check
  if (b.verify === 'unverified') check = `<section class="stockcheck"><div class="sc-head">${ic('eye')}<div><h2>Check Physical Shelf Stock</h2><p>You recorded <b>${b.qty} units</b> on ${fmtDate(b.recorded)}. Some may have been sold to walk-in customers since then, and FreshSave can't see your cashier sales. Count what is physically left on the shelf, then choose one option.</p></div></div>
      <div class="sc-opts">
        <div class="sc-opt"><h3>${ic('ban', 'sm')}Sold Out / Dismiss</h3><p>No units of this batch are left on the shelf. The batch is closed and nothing is listed.</p><button class="btn sec block" data-act="dismiss" data-id="${b.id}">Sold Out / Dismiss</button></div>
        <div class="sc-opt main"><h3>${ic('basket', 'sm')}List on Marketplace</h3><p>Units are still on the shelf. Enter the actual remaining quantity and list them for nearby buyers to rescue.</p>${d < 0 ? `<button class="btn block" disabled>List on Marketplace</button><p class="hint" style="color:var(--red)">This batch has expired and can't be listed.</p>` : `<a class="btn block" href="#/batch/${b.id}/list">List on Marketplace</a>`}</div>
      </div></section>`
  else if (b.verify === 'listed') check = `<section class="box"><h3>Stock verified</h3><p class="mute">Verified ${b.verifiedAt ? fmtDT(b.verifiedAt) : ''}: <b>${b.remaining} of ${b.qty}</b> recorded units were still on the shelf and listed.</p>
      ${l ? `<div class="srow" style="margin-top:12px"><img src="${thumb(l)}" alt=""><div style="flex:1"><a href="#/item/${l.id}"><b>${esc(l.name)}</b></a><div class="mute sm">${rm(l.price)} · ${l.qty} available · ${sp(l.clearance, CL_CLS[l.clearance])}</div></div><a class="btn sec sm" href="#/basket/${l.id}">Clearance Basket</a><a class="btn sec sm" href="#/listings">My Listings</a></div>` : '<p class="mute sm">The listing has since been removed.</p>'}</section>`
  else check = `<section class="box"><h3>Batch dismissed</h3><p class="mute">Confirmed sold out ${b.verifiedAt ? 'on ' + fmtDT(b.verifiedAt) : ''}. No units were listed.</p></section>`
  return `<div class="crumbs"><a href="#/batches">Batch Inventory</a>${ic('cr', 'xs')}<span>${esc(b.name)}</span></div>
  <div class="batch">
    <div class="box batch-info"><img src="${photo(b.kind, 0, 480)}" alt="">
      <div><h1 class="d-title">${esc(b.name)}</h1><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${sp(st.label, st.cls)}${vStatus(b)}</div>
      <dl class="deflist"><dt>Category</dt><dd>${catLabel(b.cat)}</dd><dt>Batch expiry</dt><dd>${fmtDate(b.expiry)} <span class="mute">(${countdown(b.expiry)})</span></dd><dt>Date recorded</dt><dd>${fmtDate(b.recorded)}</dd><dt>Recorded quantity</dt><dd>${b.qty} units <span class="mute">– original count, not live stock</span></dd>${b.barcode ? `<dt>Barcode</dt><dd>${b.barcode}</dd>` : ''}</dl>
      ${b.verify === 'unverified' ? `<button class="link sm" data-act="batchedit" data-id="${b.id}">${ic('edit', 'xs')} Edit batch details</button>` : ''}</div></div>
    ${check}
  </div>`
}

/* List remaining batch quantity on the marketplace */
function pageBatchList(id) {
  const b = getB(id)
  if (!b || b.verify !== 'unverified') return go(`#/batch/${id}`) || ''
  if (!FORMS.bl || FORMS.bl.bid !== id) FORMS.bl = { bid: id, remaining: '', orig: '', price: '', expiry: b.expiry, instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your reservation code. Pay at the counter.', desc: '', pack: '', c1: false, c2: false, err: {} }
  const f = FORMS.bl, s = mySeller()
  return `<div class="crumbs"><a href="#/batches">Batch Inventory</a>${ic('cr', 'xs')}<a href="#/batch/${b.id}">${esc(b.name)}</a>${ic('cr', 'xs')}<span>List on Marketplace</span></div>
  ${pageHead('List remaining stock', esc(b.name))}
  <div class="wiz">
    <form class="form" id="f-bl" novalidate>
      <h2>1. Verify physical stock</h2>
      <div class="qtycheck"><div><small>Recorded batch quantity</small><b>${b.qty}</b></div>${ic('arrow')}<div>${fld('bl', 'remaining', 'Remaining physical quantity', inp('bl', 'remaining', 'number', `min="1" max="${b.qty}" step="1" placeholder="Count the shelf"`))}</div>${ic('arrow')}<div><small>Marketplace listing quantity</small><b id="bl-lq">${+f.remaining > 0 ? +f.remaining : '–'}</b></div></div>
      <p class="hint">Only the units you count on the shelf are listed. Never assume the recorded quantity is still available.</p>
      <h2 style="margin-top:26px">2. Price</h2>
      <div class="cols">${fld('bl', 'orig', 'Original price', rmInp('bl', 'orig'))}${fld('bl', 'price', 'Rescue price', rmInp('bl', 'price'))}</div>
      <div class="calc"><div><b style="font-size:13px;display:block">Discount</b><span class="mute sm" id="bl-calcsub">Enter both prices to calculate</span></div><b id="bl-calc">–</b></div>
      <h2 style="margin-top:26px">3. Expiry and pickup</h2>
      ${fld('bl', 'expiry', 'Expiry date', inp('bl', 'expiry', 'date', `min="${todayIso()}"`), 'Pre-filled from the batch. Change it only if the package shows a different date.')}
      <div class="fld"><label class="l">Pickup location</label><div class="fixed">${ic('pin', 'sm')}<span><b>${esc(s.name)}</b><br>${esc(s.area)}</span></div><div class="hint">Your registered store address. Change it in <a class="link" href="#/profile">Profile & Settings</a>.</div></div>
      ${fld('bl', 'instr', 'Pickup instructions', ta('bl', 'instr'))}
      ${fld('bl', 'desc', 'Description <span class="mute" style="font-weight:400">(optional)</span>', ta('bl', 'desc', 'placeholder="Condition, packaging notes…"'))}
      <h2 style="margin-top:26px">4. Eligibility</h2>
      ${eligFields('bl')}
      <div class="wnav"><a class="btn sec" href="#/batch/${b.id}">Cancel</a><button class="btn" type="submit">Preview listing</button></div>
    </form>
    <div class="side-prev"><h4>Listing preview</h4><div id="bl-prev">${card(blListing(), { static: true })}</div></div>
  </div>`
}
const blListing = () => { const f = FORMS.bl, b = getB(f.bid); return { id: 'preview', name: b.name, cat: b.cat, kind: b.kind, seller: me().sellerId, orig: +f.orig || 0, price: +f.price || 0, qty: +f.remaining || 0, expiry: f.expiry || b.expiry, photos: b.photo ? [b.photo] : [] } }
HOOKS.bl = (k) => {
  const f = FORMS.bl
  const p = $('#bl-prev'); if (p) p.innerHTML = card(blListing(), { static: true })
  const lq = $('#bl-lq'); if (lq) lq.textContent = +f.remaining > 0 ? +f.remaining : '–'
  const o = +f.orig, pr = +f.price, c = $('#bl-calc')
  if (c) { c.textContent = o > 0 && pr > 0 && pr < o ? `-${Math.round((1 - pr / o) * 100)}%` : '–'; $('#bl-calcsub').textContent = o > 0 && pr >= o ? 'Rescue price must be lower than the original price' : o > 0 && pr > 0 ? `Buyers save ${rm(o - pr)} per unit` : 'Enter both prices to calculate' }
  if (['pack', 'c1', 'c2', 'expiry'].includes(k)) $('#bl-elig').innerHTML = eligResult(f)
}
function previewBatchListing() {
  const f = FORMS.bl, b = getB(f.bid), e = {}
  const n = +f.remaining
  if (!(Number.isInteger(n) && n >= 1)) e.remaining = 'Enter the number of units you counted (at least 1).'
  else if (n > b.qty) e.remaining = `Can't be more than the recorded quantity (${b.qty}).`
  if (!(+f.orig > 0)) e.orig = 'Enter the original price.'
  if (!(+f.price > 0)) e.price = 'Enter a rescue price.'
  else if (+f.price >= +f.orig) e.price = 'Rescue price must be lower than the original price.'
  if (!f.expiry) e.expiry = 'Enter the expiry date.'
  if (!f.instr.trim()) e.instr = 'Add pickup instructions for buyers.'
  const el = eligibility(f)
  if (!f.pack) e.pack = 'Select the food type and condition.'
  f.err = e
  if (Object.keys(e).length || !el.ok) { app.render(); toast(el.rejected ? 'This item is not eligible for listing' : 'Check the highlighted fields', 'alert'); return }
  const l = blListing()
  confirmDlg({
    title: 'Preview and publish',
    body: `<div class="prevgrid"><div style="pointer-events:none">${card(l, { static: true })}</div><div class="revlist">${[['Listing quantity', `${n} of ${b.qty} recorded`], ['Price', `${rm(l.price)} <s class="mute">${rm(l.orig)}</s>`], ['Expiry', fmtDate(l.expiry)], ['Pickup', esc(mySeller().area)], ['Instructions', esc(f.instr)]].map(([a, v]) => `<div><span>${a}</span><b>${v}</b></div>`).join('')}</div></div>${eligResult(f)}`,
    ok: 'Publish listing', cls: 'sage',
    onOk: () => {
      const id = uid('m')
      S.listings.unshift({ id, name: b.name, cat: b.cat, kind: b.kind, photos: b.photo ? [b.photo] : [], seller: me().sellerId, orig: +(+f.orig).toFixed(2), price: +(+f.price).toFixed(2), qty: n, expiry: f.expiry, desc: f.desc.trim() || `${b.name}, verified on the shelf before listing.`, instr: f.instr.trim(), pack: f.pack, status: 'pending', clearance: 'Awaiting Physical Transfer', batchId: b.id, postedAt: Date.now() })
      Object.assign(b, { verify: 'listed', remaining: n, listingId: id, verifiedAt: Date.now() })
      logAct('basket', `Verified ${n} of ${b.qty} units and listed ${b.name}`)
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
  scanlabel: () => { const f = FORMS.res; f.detected = iso(addDays(today0(), 5)); f.expiry = f.detected; f.result = 'success'; f.conf = 91; app.render(); toast('Expiry label read – please confirm the date') },
  bcsample: (el) => { $('#bc-code').value = el.dataset.c; lookup(el.dataset.c) },
  bcuse: () => bcToResult(bc.item),
  bcwrong: () => { bc.state = 'notfound'; FORMS.bcnew = { name: '', cat: '', err: {} }; app.render() },
  invtab: (el) => { inv.st = el.dataset.t; app.render() },
  bttab: (el) => { bt.tab = el.dataset.t; app.render() },
  addmanual: () => invForm(null),
  invedit: (el) => invForm(S.inventory.find((i) => i.id === el.dataset.id)),
  batchedit: (el) => invForm(getB(el.dataset.id)),
  invdone: (el) => { const i = S.inventory.find((x) => x.id === el.dataset.id); i.status = el.dataset.s; i.closedAt = Date.now(); logAct(i.status === 'consumed' ? 'check' : 'trash', `Marked ${i.name} as ${i.status}`); save(); toast(`Marked as ${i.status}`); app.render() },
  invdel: (el) => { const i = S.inventory.find((x) => x.id === el.dataset.id); confirmDlg({ title: 'Delete this item?', body: `<p><b>${esc(i.name)}</b> will be removed from your inventory. Use “Consumed” or “Discarded” instead if you want to keep a record.</p>`, ok: 'Delete', cls: 'danger', onOk: () => { S.inventory = S.inventory.filter((x) => x.id !== i.id); logAct('trash', `Deleted ${i.name}`); save(); toast('Item deleted'); app.render() } }) },
  dismiss: (el) => { const b = getB(el.dataset.id); confirmDlg({ title: 'Mark batch as sold out?', body: `<p>You're confirming there are <b>no units</b> of <b>${esc(b.name)}</b> left on the shelf. The batch (recorded quantity ${b.qty}) will be closed and nothing will be listed.</p>`, ok: 'Sold out – dismiss batch', cls: 'danger', onOk: () => { Object.assign(b, { verify: 'dismissed', remaining: 0, verifiedAt: Date.now() }); logAct('ban', `Dismissed batch ${b.name} – sold out`); save(); toast('Batch dismissed as sold out'); app.refreshChrome(); app.render() } }) },
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
  if (t.id === 'inv-cat') { inv.cat = t.value; app.render(); return true }
  if (t.id === 'inv-sort') { inv.sort = t.value; app.render(); return true }
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
    if (Object.keys(er).length) return app.render(), true
    const it = { barcode: bc.code, name: f.name.trim(), cat: f.cat, kind: catKind(f.cat), src: 'user', by: isRetailer() ? mySeller().name : me().name, at: Date.now() }
    S.catalogue.push(it); save(); toast('Product registered in the shared catalogue')
    bcToResult(it)
    return true
  }
  if (id === 'f-man') { saveMan(); return true }
  if (id === 'f-bl') { previewBatchListing(); return true }
  return false
}
