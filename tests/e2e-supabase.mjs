import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { BASE_URL, launch } from './cdp.mjs'

const apiUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:55421'
const apiKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
assert.ok(apiKey, 'Set VITE_SUPABASE_PUBLISHABLE_KEY from the local Supabase CLI.')
const password = 'demo1234'
const buyerEmail = 'buyer@freshsave.test', sellerEmail = 'retailer@freshsave.test'
const secondEmail = 'second-buyer@freshsave.test'

async function api(email) {
  const client = createClient(apiUrl, apiKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  assert.equal(error, null, error?.message)
  return client
}
function call(client, action, input) {
  return client.rpc('freshsave_command', { action, input })
}
async function read(client, id) {
  const { data, error } = await client.rpc('freshsave_view', { page: 'reservation', options: { id } })
  assert.equal(error, null, error?.message)
  return data.reservations[0]
}
async function until(b, text, timeout = 12_000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if ((await b.text('#main'))?.includes(text)) return
    await b.sleep(200)
  }
  const error = await b.text('#modal [role=alert]') || await b.text('main [role=alert]')
  throw new Error(`Did not find “${text}” in ${await b.eval('return location.hash')}. ${error || ''}`)
}
async function signIn(b, email, destination) {
  await b.goto(new URL('#/login', BASE_URL).href)
  await b.type('#a-email', email)
  await b.type('#a-pw', password)
  await b.eval("document.querySelector('#f-login').requestSubmit()")
  await until(b, destination)
}
async function waitForControl(b, selector) {
  const start = Date.now()
  while (Date.now() - start < 12_000) {
    if (await b.has(selector)) return
    await b.sleep(150)
  }
  throw new Error(`${selector} unavailable at ${await b.eval('return location.hash')}`)
}

const buyerApi = await api(buyerEmail), sellerApi = await api(sellerEmail), secondApi = await api(secondEmail)
const singleUnit = '03000000-0000-4000-8000-000000000001'
const tries = [
  { client: buyerApi, input: { id: singleUnit, qty: 1, requestId: crypto.randomUUID() } },
  { client: secondApi, input: { id: singleUnit, qty: 1, requestId: crypto.randomUUID() } },
]
const outcomes = await Promise.all(tries.map(tryIt => call(tryIt.client, 'reserveListing', tryIt.input)))
assert.equal(outcomes.filter(result => !result.error).length, 1, JSON.stringify(outcomes.map(x => x.error?.message)))
const winner = outcomes.findIndex(result => !result.error), won = outcomes[winner].data
const winnerClient = tries[winner].client, loserClient = tries[1 - winner].client
try {
  assert.equal(outcomes[1 - winner].error.code, 'FS004')
  assert.equal((await call(winnerClient, 'reserveListing', tries[winner].input)).data, won)
  assert.equal(await read(loserClient, won), undefined, 'An unrelated account must not read the reservation.')
  assert.equal((await call(loserClient, 'cancelReservation', { id: won })).error.code, 'FS002')
} finally {
  for (let i = 0; i < 2; i++) assert.equal((await call(winnerClient, 'cancelReservation', { id: won })).error, null)
}
const cancelled = await read(winnerClient, won)
assert.equal(cancelled.events.filter(event => event.type === 'cancelled').length, 1)
console.log('PASS one last-unit winner, request replay, unrelated-account denial, and duplicate cancel')

const seller = await launch({ realClock: true }), buyer = await launch({ realClock: true })
let published
try {
  await signIn(seller, sellerEmail, 'Needs your action')
  await signIn(buyer, buyerEmail, 'Find food')
  await buyer.hash('#/scan')
  await waitForControl(buyer, '#label-photo')
  const expectedDate = await buyer.eval(`
    const date = new Date(Date.now() + 10 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    const [year, month, day] = date.split('-');
    const canvas = document.createElement('canvas');
    canvas.width = 1100; canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black'; ctx.font = '64px Arial';
    ctx.fillText('EXP ' + day + '/' + month + '/' + year, 60, 120);
    ctx.fillText('MFG 01/01/2025', 60, 260);
    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([png], 'test-label.png', { type: 'image/png' }));
    const field = document.querySelector('#label-photo');
    field.files = transfer.files;
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return date;
  `)
  await until(buyer, 'Date read from photo', 60_000)
  assert.equal(await buyer.eval("return document.querySelector('#res-expiry').value"), expectedDate)
  await buyer.type('#res-name', 'OCR test label')
  await buyer.type('#res-cat', 'pantry')
  await buyer.eval("document.querySelector('#f-res').requestSubmit()")
  await until(buyer, 'Tick the box')
  await buyer.check('[data-b="res.ok"]')
  await buyer.eval("document.querySelector('#f-res').requestSubmit()")
  await until(buyer, 'OCR test label')
  const scanned = await buyerApi.from('inventory').select('expiry,date_type,details').eq('details->>name', 'OCR test label').single()
  assert.equal(scanned.error, null, scanned.error?.message)
  assert.equal(scanned.data.expiry, expectedDate)
  assert.equal(scanned.data.date_type, 'use-by')
  assert.ok(scanned.data.details.photo)
  console.log('PASS browser OCR reads expiry before manufacturing, requires confirmation, and saves the label to shared inventory')
  await buyer.hash('#/barcode')
  await buyer.type('#bc-code', '9556041610018')
  await buyer.eval("document.querySelector('#f-bc').requestSubmit()")
  await until(buyer, 'Dutch Lady Full Cream Milk 1L')
  console.log('PASS barcode lookup uses the shared catalogue')
  await seller.hash('#/batch/02000000-0000-4000-8000-000000000002/list')
  await until(seller, 'Count stock to offer on Rescue')
  await seller.type('#bl-remaining', '2')
  await seller.type('#bl-orig', '8')
  await seller.type('#bl-price', '4')
  await seller.type('#bl-pack', 'sealed')
  for (const declaration of ['c1', 'c2', 'c3']) await seller.check(`[data-b="bl.${declaration}"]`)
  await seller.click('#f-bl details summary')
  await seller.type('#bl-pickFrom', '00:00')
  await seller.type('#bl-pickTo', '23:59')
  await seller.eval("document.querySelector('#f-bl').requestSubmit()")
  await seller.click('[data-act=mok]')
  await until(seller, 'The listing becomes visible to buyers when you confirm the units are set aside.')
  published = (await seller.eval('return location.hash')).split('/').pop().split('?')[0]
  await seller.click('[data-act=moved]')
  await seller.click('[data-act=mok]')
  await until(seller, 'Clearance Basket details')

  await seller.hash('#/dashboard')
  await until(seller, 'Needs your action')
  assert.doesNotMatch(await seller.text('#main'), /request to accept or decline/)

  await buyer.hash('#/item/' + published)
  await until(buyer, 'Test Sealed Crackers')
  await buyer.click('[data-act=reserve]')
  await buyer.click('[data-act=mok]')
  await until(buyer, 'Waiting for the seller')
  const id = (await buyer.eval('return location.hash')).split('/').pop()
  assert.equal((await read(buyerApi, id)).pin, undefined)
  assert.equal(await seller.eval('return document.visibilityState'), 'visible')
  await until(seller, '1 request to accept or decline', 38_000)
  assert.equal(await seller.eval('return location.hash'), '#/dashboard')
  console.log('PASS the visible retailer Today page updates after a buyer reserves in another browser')
  await seller.hash('#/reservation/' + id)
  await until(seller, 'Waiting for the seller')
  await seller.click('[data-act=raccept]')
  await seller.click('[data-act=mok]')
  await until(seller, 'Ready for pickup')
  await buyer.reload()
  await until(buyer, 'Ready for pickup')
  const code = await buyer.text('.code')
  assert.match(code, /^\d{4}$/)
  assert.equal((await read(sellerApi, id)).pin, undefined)
  const before = await read(buyerApi, id)
  await seller.hash('#/sell/' + published)
  await until(seller, 'Product information')
  await seller.eval("document.querySelector('#f-wz').requestSubmit()")
  await seller.type('#wz-price', '5')
  for (let n = 0; n < 3; n++) {
    await seller.eval("document.querySelector('#f-wz').requestSubmit()")
    await seller.sleep(350)
  }
  await until(seller, 'Listings')
  assert.deepEqual((await read(buyerApi, id)).terms, before.terms)
  await seller.hash('#/reservation/' + id)
  await until(seller, 'Ready for pickup')
  await seller.click('[data-act=rhandover]')
  await waitForControl(seller, '#ho-code')
  await seller.type('#ho-code', code)
  await seller.check('#ho-item')
  await seller.check('#ho-pay')
  await seller.eval("document.querySelector('#f-handover').requestSubmit()")
  await until(seller, 'Handover recorded')
  await buyer.reload()
  await until(buyer, 'Handover recorded')
  const after = await read(buyerApi, id)
  assert.equal(after.status, 'completed')
  assert.equal(after.handover.method, 'code')
  assert.equal(after.terms.price, 4)
  await buyer.click('[data-act=addfrom]')
  await buyer.check('[data-b="man.ok"]')
  await buyer.eval("document.querySelector('#f-man').requestSubmit()")
  await waitForControl(buyer, '#main[data-page="inventory"] tbody tr.hl')
  const itemId = new URLSearchParams((await buyer.eval('return location.hash')).split('?')[1]).get('item')
  assert.ok(itemId)
  await buyer.hash('#/reservation/' + id)
  await until(buyer, 'View in My food')
  const {data: saved, error: savedError} = await buyerApi.from('inventory').select('id,quantity').eq('details->>reservationId', id).single()
  assert.equal(savedError, null)
  assert.deepEqual(saved, {id: itemId, quantity: 1})
  const payload = { input: { reservationId: id } }
  const replay = await buyerApi.rpc('freshsave_save_collected_food', payload)
  assert.equal(replay.data, itemId)
  assert.equal((await secondApi.rpc('freshsave_save_collected_food', payload)).error.code, 'FS002')
  console.log('PASS the collected item is linked to its reservation, replay is idempotent, and unrelated buyers are denied')
  assert.deepEqual(seller.errors, [])
  assert.deepEqual(buyer.errors, [])
  console.log('PASS independent browser sessions count, publish, reserve, accept, edit terms, and complete pickup')
} finally {
  await Promise.all([seller.close(), buyer.close()])
  if (published) await call(sellerApi, 'closeListing', { id: published, cancelOpen: true })
}
