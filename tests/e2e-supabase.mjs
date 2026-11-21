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

  await buyer.hash('#/item/' + published)
  await until(buyer, 'Test Sealed Crackers')
  await buyer.click('[data-act=reserve]')
  await buyer.click('[data-act=mok]')
  await until(buyer, 'Waiting for the seller')
  const id = (await buyer.eval('return location.hash')).split('/').pop()
  assert.equal((await read(buyerApi, id)).pin, undefined)
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
  assert.deepEqual(seller.errors, [])
  assert.deepEqual(buyer.errors, [])
  console.log('PASS independent browser sessions count, publish, reserve, accept, edit terms, and complete pickup')
} finally {
  await Promise.all([seller.close(), buyer.close()])
  if (published) await call(sellerApi, 'closeListing', { id: published, cancelOpen: true })
}
