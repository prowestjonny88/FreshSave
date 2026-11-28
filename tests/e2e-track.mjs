import { session, ok, eq, done } from './e2e-lib.mjs'
const b = await session()
console.log('Track, timers and account flows')
await b.login('aisyah@freshsave.my')
const counts = async () => b.eval(`return Object.fromEntries([...document.querySelectorAll('.tabs .tab')].map(t => [t.getAttribute('href').split('=')[1], +t.querySelector('i').textContent]))`)
await b.hash('#/inventory'); let c = await counts()
eq(Object.keys(c), ['active', 'd7', 'expired', 'history'], 'My food has four simple tabs (All, Use soon, Past date, Used & discarded)')
await b.hash('#/inventory?st=d7')
await b.click('.tbar summary')
const dueCounts = await b.eval(`return Object.fromEntries([...document.querySelectorAll('.tbar option[value^=d]')].filter(o => /^d[137]$/.test(o.value)).map(o => [o.value, +o.textContent.trim().match(/\\((\\d+)\\)$/)[1]]))`)
const c7 = { ...await counts(), ...dueCounts }
ok(c7.d1 <= c7.d3 && c7.d3 <= c7.d7, `expiry filters are cumulative (d1=${c7.d1} <= d3=${c7.d3} <= d7=${c7.d7})`)
eq([c7.d1, c7.d3, c7.d7, c7.expired, c7.active], [2, 3, 4, 1, 8], 'counts match the seed (item due tomorrow appears under Use soon within 7 days)')
const t7 = await b.text('#main'); ok(t7.includes('Dutch Lady Full Cream Milk') && t7.includes('Strawberries') && t7.includes('Today or tomorrow'), 'Use soon includes items due today or tomorrow and shows the date filter')
ok(!t7.includes('Past its') , 'past-date items are not in "Within 7 days"')
await b.hash('#/dashboard')
ok(!(await b.text('#main')).includes('Marigold Natural Yoghurt'), 'Today leaves past-date food out of Use soon')
await b.hash('#/inventory?st=expired')
ok(await b.has('.acts-cell > [data-id=i4][data-s=discarded].discard-priority') && await b.has('.acts-cell > [data-id=i4][data-s=consumed]:not(.go)'), 'past use-by food emphasizes Discard and keeps Used available')
// partial consumption + undo
await b.hash('#/inventory'); const rowBtn = (id, s) => `[data-act=invdone][data-id=${id}][data-s=${s}]`
await b.click(rowBtn('i1', 'consumed')); ok((await b.modal()).includes('How many used'), 'multi-unit item asks how many were used')
await b.type('#use-n', '1'); await b.act('mok'); await b.sleep(300)
let st = await b.state(); let i1 = st.inventory.find((i) => i.id === 'i1'); eq([i1.qty, i1.status, i1.log.length], [1, 'active', 1], 'using 1 of 2 keeps the item active with 1 left')
ok((await b.toastText()).includes('Undo'), 'undo offered'); await b.click('.toast button'); await b.sleep(300)
st = await b.state(); i1 = st.inventory.find((i) => i.id === 'i1'); eq([i1.qty, i1.log.length], [2, 0], 'undo restores the unit')
await b.click(rowBtn('i1', 'discarded')); await b.click('[data-act=useall]'); await b.act('mok'); await b.sleep(300)
st = await b.state(); i1 = st.inventory.find((i) => i.id === 'i1'); eq([i1.qty, i1.status], [0, 'discarded'], 'discarding all closes the item')
await b.hash('#/inventory?st=history'); ok((await b.text('#main')).includes('Restore'), 'history offers Restore'); await b.click('[data-act=invundo][data-id=i1]'); await b.sleep(300)
st = await b.state(); eq([st.inventory.find((i) => i.id === 'i1').qty, st.inventory.find((i) => i.id === 'i1').status], [2, 'active'], 'restored from history')
await b.hash('#/inventory'); await b.click(rowBtn('i2', 'consumed')); await b.sleep(300)
st = await b.state(); eq(st.inventory.find((i) => i.id === 'i2').status, 'consumed', 'single-unit item closes immediately (with undo)')
ok(!(await b.has('#modal h3') && (await b.modalOpen())), 'no dialog for a single unit')
ok(await b.eval(`return document.activeElement.matches('.acts-cell > button') && document.activeElement.dataset.id !== 'i2'`), 'focus moves to a surviving row action')
await b.click('.toast:last-child button'); await b.sleep(250)
ok(await b.eval(`return document.activeElement.matches('.acts-cell > [data-id=i2]')`), 'Undo returns focus to the restored row')

// scan: uncertain read must not pre-fill the date
await b.hash('#/scan'); ok((await b.text('#main')).includes('Simulated scanning'), 'scan page says OCR is simulated up front')
await b.act('scan-sample', '[data-id="bread"]')
eq(await b.eval('return location.hash'), '#/scan/result', 'reached confirm page')
eq(await b.eval(`return document.querySelector('#res-expiry').value`), '', 'unclear reading leaves the date blank')
ok((await b.text('#main')).includes('Suggested'), 'suggestion shown separately'); ok(!/\d+% confidence|Confidence \d+/i.test(await b.text('#main')), 'no invented confidence percentage')
await b.eval(`document.querySelector('#f-res').requestSubmit()`); await b.sleep(200); ok((await b.text('#main')).includes('Enter the date printed'), 'cannot save without a date')
await b.act('usesuggest'); await b.eval(`document.querySelector('#f-res').requestSubmit()`); await b.sleep(200); ok((await b.text('#main')).includes('Tick the box'), 'a suggested date still requires explicit confirmation')
await b.type('[data-b="res.expiryType"]', 'use-by'); await b.check('[data-b="res.ok"]'); await b.eval(`document.querySelector('#f-res').requestSubmit()`); await b.sleep(500)
st = await b.state(); const scanNow = await b.eval('return Date.now()'); const sc = st.inventory.find((i) => i.name.includes('Gardenia') && i.addedAt > scanNow - 15000); ok(sc && sc.expiryType === 'use-by' && sc.initial === 1, 'scan result saved with chosen date type')
// failed read
await b.hash('#/scan'); await b.act('scan-sample', '[data-id="milo"]')
ok((await b.text('#main')).includes('no date found'), 'failed read explained'); 
// barcode
await b.hash('#/barcode'); await b.type('#bc-code', '9556041610016'); await b.eval(`document.querySelector('#f-bc').requestSubmit()`); await b.sleep(250)
ok(await b.eval(`const field=document.querySelector('#bc-code'); return field.value==='9556041610016' && field.getAttribute('aria-invalid')==='true' && document.getElementById(field.getAttribute('aria-describedby'))?.textContent.includes('check digit') && !document.querySelector('.bc-res')`), 'wrong check digit leaves an inline error linked to the field')
await b.act('bcsample', '[data-c="9556041610018"]'); ok((await b.text('#main')).includes('Dutch Lady Full Cream Milk 1L') && (await b.text('#main')).includes('sample catalogue'), 'valid barcode found in demo catalogue')
ok(!(await b.has('#bc-code-error, #bc-code[aria-invalid]')), 'valid barcode clears the inline error')
await b.act('bcuse'); await b.sleep(300); eq(await b.eval('return location.hash'), '#/scan/result', 'barcode flows to the date confirmation page')
await b.type('[data-b="res.expiryType"]', 'best-before')
await b.type('#res-expiry', '2026-12-12')
await b.check('[data-b="res.ok"]')
await b.eval(`
  const file = document.querySelector('#barcode-label');
  const transfer = new DataTransfer();
  transfer.items.add(new File(['not an image'], 'unreadable.jpg', { type: 'image/jpeg' }));
  file.files = transfer.files;
  file.dispatchEvent(new Event('change', { bubbles: true }));
`)
await b.sleep(200)
ok((await b.text('.scan-review')).includes('Try another photo'), 'unreadable replacement offers an explicit retry')
ok(await b.eval(`return !document.querySelector('#res-expiry').value && !document.querySelector('[data-b="res.expiryType"]').value && !document.querySelector('[data-b="res.ok"]').checked`), 'unreadable replacement clears the previous date, date type and confirmation')
await b.eval(`document.querySelector('#f-res').requestSubmit()`)
await b.sleep(200)
eq(await b.eval('return location.hash'), '#/scan/result', 'cannot save using the previous verification after replacing a label')
// manual add: date requires confirmation; past date warns
await b.hash('#/inventory'); await b.click('#main a[href="#/scan"]'); await b.act('addmanual'); await b.eval(`document.querySelector('#f-man').requestSubmit()`); await b.sleep(250)
ok(await b.eval(`const field = document.querySelector('#man-name'); return document.activeElement === field && field.getAttribute('aria-invalid') === 'true' && document.getElementById(field.getAttribute('aria-describedby'))?.textContent.includes('Enter the product name')`), 'invalid manual entry focuses the field and associates its error')
await b.type('#man-name', 'Test Biscuits'); await b.type('#man-cat', 'pantry'); await b.type('#man-expiry', '2020-01-01')
await b.eval(`document.querySelector('#f-man').requestSubmit()`); await b.sleep(200)
ok((await b.modal()).includes('Choose the date type printed on the pack') && !(await b.eval(`return document.querySelector('[data-b="man.expiryType"]').value`)), 'new manual entry requires a deliberate date type')
await b.type('[data-b="man.expiryType"]', 'best-before')
ok(!(await b.eval(`return document.querySelector('#man-past').hidden`)), 'past date shows an inline notice'); await b.eval(`document.querySelector('#f-man').requestSubmit()`); await b.sleep(200); ok((await b.modal()).includes('Tick the box'), 'manual entry requires date confirmation')
ok(await b.eval(`const m=document.querySelector('#modal'); return m.contains(document.activeElement)`), 'focus is inside the dialog')
await b.eval(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await b.sleep(150); ok(!(await b.modalOpen()), 'Escape closes the dialog')
// reminders wording
await b.hash('#/notifications'); const nt = await b.text('#main'); ok(nt.includes('while FreshSave is open'), 'notifications explain when optional device alerts work')
await b.hash('#/profile'); ok((await b.text('#main')).includes('No push, SMS or email is sent') && (await b.text('#main')).includes('plain text'), 'settings state in-app scope and plain-text password')
const failingAlerts = `window.Notification = class {
  static permission = 'granted';
  static async requestPermission() { return 'granted'; }
  constructor() {
    window.deliveryAttempts = (window.deliveryAttempts || 0) + 1;
    throw new Error('Browser rejected the alert');
  }
};`
const alertMock = await b.send('Page.addScriptToEvaluateOnNewDocument', { source: failingAlerts })
await b.eval(failingAlerts + "window.dispatchEvent(new Event('focus'))")
await b.check('[data-pref=device]')
ok((await b.text('#device-alert-status')).includes('Cannot deliver') && (await b.text('#device-alert-status')).includes('In-app reminders are still available'), 'delivery failure explains that in-app reminders still work')
eq(await b.eval('return window.deliveryAttempts'), 1, 'stops trying after the first rejected device alert')
await b.reload()
ok((await b.text('#device-alert-status')).includes('Cannot deliver'), 'delivery failure stays visible after reload')
eq(await b.eval('return window.deliveryAttempts || 0'), 0, 'reloading does not attempt another delivery')
await b.eval(`window.Notification = class {
  static permission = 'granted';
  static async requestPermission() { return 'granted'; }
};`)
await b.check('[data-pref=device]', false)
ok((await b.text('#device-alert-status')).startsWith('Off'), 'switching off clears the error')
await b.check('[data-pref=device]')
ok((await b.text('#device-alert-status')).startsWith('On'), 'switching back on retries delivery')
await b.check('[data-pref=device]', false)
await b.reload()
ok((await b.text('#device-alert-status')).startsWith('Off'), 'device alerts stay off after reload')
await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: alertMock.identifier })

// timers: stale requests and pickups expire and release units
await b.hash('#/item/l4'); await b.act('reserve'); await b.act('mok'); await b.sleep(300)
const rid = (await b.eval('return location.hash')).split('/').pop()
await b.eval(`const s=JSON.parse(localStorage.getItem('freshsave-app-v2')); const r=s.reservations.find(x=>x.id==='${rid}'); r.respondBy=Date.now()-1000; const r6=s.reservations.find(x=>x.id==='r6'); r6.collectBy=Date.now()-1000; localStorage.setItem('freshsave-app-v2', JSON.stringify(s))`)
await b.reload(); await b.hash('#/reservations?tab=closed'); await b.sleep(300)
st = await b.state(); eq(st.reservations.find((x) => x.id === rid).reason, 'no-response', 'pending request lapsed on next open'); eq(st.reservations.find((x) => x.id === 'r6').reason, 'not-collected', 'accepted pickup expired after its collect-by time')
const pg = await b.text('#main'); ok(pg.includes('Seller did not respond in time') && pg.includes('Not collected before the deadline'), 'closed tab explains each reason')
await b.hash('#/item/l4'); ok((await b.text('#main')).includes('15 unit'), 'released units are available again (15 of 15)')
ok((await b.state()).notifs.some((n) => n.user === 'u1' && /expired/i.test(n.text)), 'buyer notified of expiry')
await b.hash('#/notifications')
const unreadBefore = (await b.state()).notifs.filter(n => n.user === 'u1' && n.unread).map(n => n.id)
eq(await b.text('#main [data-act=clearread]'), 'Clear read notifications', 'read alerts have an explicit clear action')
await b.act('clearread')
eq((await b.state()).notifs.filter(n => n.user === 'u1' && n.unread).map(n => n.id), unreadBefore, 'Clear read keeps unread notifications')
ok(!(await b.has('#main [data-act=clearread]')) && await b.has('#main [data-act=readall]'), 'only Mark all as read appears when every alert is unread')
await b.act('readall')
ok(!(await b.has('#main [data-act=readall]')) && await b.has('#main [data-act=clearread]'), 'only Clear read notifications appears when every alert is read')
await b.act('clearread')
await b.reload()
ok(!(await b.has('.nlist li')) && (await b.text('#main')).includes('Nothing in this view'), 'cleared notifications stay dismissed across reload and reminder sync')
ok(!(await b.has('#main [data-act=readall], #main [data-act=clearread]')), 'empty notifications show no bulk actions')

// auth + onboarding + role boundaries
await b.logout()
await b.hash('#/register'); await b.type('#a-name', 'Test Person'); await b.type('#a-email', 'tester@example.com'); await b.type('#a-pw', 'password99')
await b.eval(`document.querySelector('#f-register').requestSubmit()`); await b.sleep(300); ok((await b.text('.auth-card')).includes('Please confirm to continue'), 'registration requires the prototype consent')
await b.click('[data-act=role][data-r=retailer]'); ok((await b.text('.auth-card')).includes('Anyone can register as a retailer'), 'retailer registration states sellers are unverified')
await b.click('[data-act=role][data-r=individual]'); await b.type('#a-name', 'Test Person'); await b.type('#a-email', 'tester@example.com'); await b.type('#a-pw', 'password99'); await b.check('#a-consent'); await b.eval(`document.querySelector('#f-register').requestSubmit()`); await b.sleep(500)
eq(await b.eval('return location.hash'), '#/dashboard', 'new user lands on Today'); ok((await b.text('#main')).includes('Welcome to FreshSave') && (await b.text('#main')).includes('0/3 steps done'), 'first-time checklist shown')
await b.hash('#/sell'); ok((await b.text('#main')).includes('Listing is for participating retailers'), 'individuals cannot list food in the pilot (clear explanation)')
await b.hash('#/batches'); await b.sleep(200); eq(await b.eval('return location.hash'), '#/inventory', 'retailer-only pages redirect individuals')
await b.hash('#/inventory'); ok((await b.text('#main')).includes('Nothing tracked yet'), 'empty inventory explains the next step')
await b.hash('#/reservations'); ok((await b.text('#main')).includes('Find sealed pantry'), 'empty reservations point to Find food')
await b.logout()
// keep-me-logged-in unchecked → session marker
await b.hash('#/login'); await b.type('#a-email', 'aisyah@freshsave.my'); await b.type('#a-pw', 'demo1234'); await b.eval(`document.querySelector('input[name=keep]').checked=false`); await b.eval(`document.querySelector('#f-login').requestSubmit()`); await b.sleep(400)
eq((await b.state()).sessionTemp, true, '"Keep me logged in" off creates a tab-only session')
await b.logout(); await b.hash('#/forgot'); ok((await b.text('.auth-card')).includes('No email is sent') && !(await b.has('#f-forgot')) && (await b.text('.auth-alt')).includes('Back to demo accounts'), 'demo recovery explains the limit and links back to the accounts')
await b.hash('#/about'); ok((await b.text('body')).includes('What is real, local or simulated'), 'About page reachable while logged out')
console.log('JS errors:', b.errors.length ? b.errors : 'none'); ok(b.errors.length === 0, 'no JavaScript errors')
await b.close(); process.exit(done() ? 1 : 0)
