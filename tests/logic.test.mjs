// Logic tests for ledger, reservation lifecycle, handover, eligibility and expiry rules.
// Run: node --test tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import { core, reset } from './harness.mjs'
const c = core
const as = (id) => { c.S.session = id }
const L = (id) => c.getL(id)
const live = () => c.S.listings.find((l) => l.id === 'l1')

test('seed data satisfies every ledger invariant and uses no real-chain seller names', () => {
  reset()
  assert.deepEqual(c.checkInvariants(), [])
  const names = Object.values(c.S.sellers).map((s) => s.name).join('|')
  for (const bad of ['Jaya Grocer', 'Village Grocer', 'Econsave']) assert.ok(!names.includes(bad), bad)
  assert.ok(c.S.listings.every((l) => ['sealed', 'bakery'].includes(l.pack)), 'only sealed ambient packs are seeded as listings')
})

test('A1: reserving reduces availability; cannot over-reserve or double-allocate units', () => {
  reset(); as('u1')
  const l = live(), before = c.avail(l)
  const a = c.createReservation(l, 4)
  assert.ok(a.r); assert.equal(c.avail(l), before - 4)
  const b = c.createReservation(l, before) // would need more than what is left
  assert.match(b.error, /Only/)
  const all = c.createReservation(l, before - 4)
  assert.ok(all.r); assert.equal(c.avail(l), 0)
  assert.match(c.createReservation(l, 1).error, /no longer available|reserved/i)
  assert.deepEqual(c.checkInvariants(), [])
})
test('A1: invalid quantities and own-listing reservations are rejected', () => {
  reset(); as('u1')
  for (const n of [0, -1, 1.5, NaN]) assert.ok(c.createReservation(live(), n).error, String(n))
  as('u2'); const own = L('l6')
  assert.match(c.createReservation(own, 1).error, /own listing/)
})
test('A1: reservation snapshots the agreed terms; later listing/profile edits never rewrite them', () => {
  reset(); as('u1')
  const l = live(), { r } = c.createReservation(l, 2)
  const t0 = JSON.stringify(r.terms)
  Object.assign(l, { price: 99, name: 'Changed', instr: 'elsewhere', expiry: '2099-01-01', pickupUntil: '2099-01-01' })
  c.S.sellers[l.seller].name = 'Renamed Shop'; c.S.sellers[l.seller].area = 'New address'
  assert.equal(JSON.stringify(r.terms), t0)
  assert.equal(r.terms.price, 4.5); assert.equal(r.terms.sellerName, 'Telawi Fresh Mart')
})
test('A1: cancel, decline and expiry release units exactly once', () => {
  reset(); as('u1')
  const l = live(), start = c.avail(l)
  const { r: a } = c.createReservation(l, 3); const { r: b } = c.createReservation(l, 2); const { r: d } = c.createReservation(l, 1)
  assert.equal(c.avail(l), start - 6)
  c.cancelRes(a, 'buyer'); assert.equal(c.avail(l), start - 3)
  c.cancelRes(a, 'buyer'); assert.equal(c.avail(l), start - 3, 'second cancel is a no-op')
  c.declineRes(b); assert.equal(c.avail(l), start - 1)
  d.respondBy = Date.now() - 1; assert.equal(c.processExpiries(), 1)
  assert.equal(d.status, 'expired'); assert.equal(d.reason, 'no-response'); assert.equal(c.avail(l), start)
  assert.deepEqual(c.checkInvariants(), [])
})
test('A2: pending requests lapse; accepted pickups expire when collection time passes; late acceptance is refused', () => {
  reset(); as('u1')
  const { r } = c.createReservation(live(), 1)
  r.respondBy = Date.now() - 5; assert.match(c.confirmRes(r), /expired/); assert.equal(r.status, 'expired')
  const { r: r2 } = c.createReservation(live(), 1)
  assert.equal(c.confirmRes(r2), ''); assert.ok(r2.collectBy <= Date.now() + c.POLICY.holdH * 36e5 + 1000)
  assert.ok(r2.collectBy <= c.termsDeadline(r2))
  r2.collectBy = Date.now() - 1; c.processExpiries()
  assert.equal(r2.status, 'expired'); assert.equal(r2.reason, 'not-collected')
})
test('A2: food that passes its date before collection is closed; use-by is blocked on the day itself', () => {
  reset(); as('u1')
  const { r } = c.createReservation(live(), 1); c.confirmRes(r)
  const y = new Date(); y.setDate(y.getDate() - 1); r.terms.expiry = c.iso(y)
  c.processExpiries(); assert.equal(r.status, 'expired'); assert.equal(r.reason, 'food-expired')
  assert.equal(c.termsBlocked({ expiry: c.todayIso(), expiryType: 'use-by' }), true)
  assert.equal(c.termsBlocked({ expiry: c.todayIso(), expiryType: 'best-before' }), false)
})
test('A2: only the seller, with the buyer\'s matching code, can complete a handover; buyers cannot self-complete', () => {
  reset(); as('u1')
  const l = L('l6'); l.seller = 'pakdin'
  const { r } = c.createReservation(l, 1); as('u2'); assert.equal(c.confirmRes(r), '')
  as('u1'); assert.match(c.completeRes(r, r.pin), /Only the seller/); assert.equal(r.status, 'confirmed')
  as('u2'); assert.match(c.completeRes(r, '0000' === r.pin ? '1111' : '0000'), /doesn't match/); assert.equal(r.status, 'confirmed')
  assert.match(c.completeRes(r, ''), /doesn't match/)
  assert.equal(c.completeRes(r, r.pin, { checked: true }), ''); assert.equal(r.status, 'completed')
  assert.equal(r.handover.method, 'code'); assert.equal(c.completeRes(r, r.pin), 'Only a confirmed reservation can be handed over.')
})
test('A2: handover after the deadline expires the reservation instead of completing it', () => {
  reset(); as('u1'); const l = L('l6')
  const { r } = c.createReservation(l, 1); as('u2'); c.confirmRes(r)
  r.collectBy = Date.now() - 10
  assert.match(c.completeRes(r, r.pin), /deadline has passed/); assert.equal(r.status, 'expired')
})
test('A2: simulated handover works only for the buyer of an account-less sample seller and is not a code-checked record', () => {
  reset(); as('u1')
  const r6 = c.getR('r6'); assert.equal(c.completeRes(r6, null, { simulated: true }), ''); assert.equal(r6.handover.method, 'simulated')
  const { r } = c.createReservation(L('l6'), 1); as('u2'); c.confirmRes(r)
  assert.match(c.completeRes(r, null, { simulated: true }), /only available/i)
})
test('A2: activity metrics count only code-checked, non-sample, non-disputed handovers', async () => {
  reset(); const { metrics, validHandover } = await import('../src/views/account.js')
  as('u2'); assert.equal(metrics().handovers, 0, 'seeded sample handovers do not count'); assert.ok(metrics().sampleDone >= 3)
  as('u1'); const { r } = c.createReservation(L('l6'), 2); as('u2'); c.confirmRes(r); c.completeRes(r, r.pin, { checked: true })
  assert.equal(metrics().handovers, 1); assert.equal(metrics().units, 2)
  as('u1'); c.disputeRes(r); as('u2'); assert.equal(validHandover(r), false); assert.equal(metrics().handovers, 0)
  as('u1'); const sim = c.getR('r6'); c.completeRes(sim, null, { simulated: true }); assert.equal(metrics().handovers, 0)
})
test('A1: batch ledger blocks listing more units than were received or are already allocated', () => {
  reset(); as('u2')
  const b = c.getB('b6'), l = L('l6') // received 30, listing total 16 (2 handed over, 2 held, 12 available)
  assert.equal(c.batchHanded(b), 2); assert.equal(c.batchOnOffer(b), 14); assert.equal(c.batchListable(b), 14)
  assert.equal(c.batchListable(b, l.id), 28, 'when editing the listing its own units are not double counted')
  assert.deepEqual(c.checkInvariants(), [])
  l.total = 40; assert.ok(c.checkInvariants().length, 'over-allocation is detected')
})
test('A1: listing edits cannot drop total below units already reserved / handed over', () => {
  reset(); as('u2'); const l = L('l6'), k = c.listingLocks(l)
  assert.equal(k.minTotal, 4); assert.equal(k.open, 1); assert.equal(k.product, true)
})
test('A1: withdrawing a listing cancels open reservations and returns only unsold units', () => {
  reset(); as('u2'); const l = L('l6')
  assert.match(c.closeListing(l), /must be resolved/)
  assert.equal(c.closeListing(l, { cancelOpen: true }), '')
  assert.equal(l.status, 'closed'); const g = c.ledger(l)
  assert.deepEqual([g.avail, g.held, g.handed, g.withdrawn], [0, 0, 2, 14]); assert.deepEqual(c.checkInvariants(), [])
  assert.equal(c.getR('r1').status, 'cancelled'); assert.equal(c.getR('r1').by, 'seller')
})
test('A1/A17: lifecycle is one derived status; ended listings with stock need action', () => {
  reset()
  assert.equal(c.lifecycle(L('m1')), 'awaiting'); assert.equal(c.lifecycle(L('m2')), 'reserved')
  assert.equal(c.lifecycle(L('m3')), 'completed'); assert.equal(c.lifecycle(L('m4')), 'ended')
  assert.equal(c.lifecycle(L('l6')), 'live'); assert.ok(!c.browsable().some((l) => l.id === 'm1' || l.id === 'm4'))
})
test('A3: pilot eligibility rejects chilled, frozen, raw, fresh, opened and past-date food; needs declarations', () => {
  const ok = { pack: 'sealed', c1: true, c2: true, c3: true, expiry: c.todayIso() }
  assert.equal(c.eligibility(ok).ok, true)
  for (const pack of ['chilled', 'frozen', 'raw', 'fresh', 'cooked', 'infant', 'opened']) { const r = c.eligibility({ ...ok, pack }); assert.equal(r.ok, false, pack); assert.equal(r.rejected, true, pack) }
  assert.equal(c.eligibility({ ...ok, c1: false }).ok, false); assert.equal(c.eligibility({ ...ok, c2: false }).ok, false); assert.equal(c.eligibility({ ...ok, c3: false }).ok, false)
  assert.equal(c.eligibility({ ...ok, expiry: '2000-01-01' }).rejected, true)
  assert.match(c.eligResult({ ...ok }), /not verified|does not inspect/i)
})
test('A3: collection window rules differ for use-by and best-before and reject past days', () => {
  const exp = c.iso(c.addDays(c.today0(), 5))
  assert.equal(c.lastPickupDay(exp, 'best-before'), exp); assert.equal(c.lastPickupDay(exp, 'use-by'), c.iso(c.addDays(c.today0(), 4)))
  const base = { expiry: exp, expiryType: 'use-by', pickFrom: '09:00', pickTo: '21:00' }
  assert.ok(c.pickupErrors({ ...base, pickupUntil: exp }).pickupUntil, 'use-by on the date itself is refused')
  assert.deepEqual(c.pickupErrors({ ...base, pickupUntil: c.lastPickupDay(exp, 'use-by') }), {})
  assert.ok(c.pickupErrors({ ...base, pickupUntil: '2000-01-01' }).pickupUntil)
  assert.ok(c.pickupErrors({ ...base, pickupUntil: c.todayIso(), pickTo: '08:00' }).pickTo, 'closing before opening')
  assert.equal(c.defaultPickupUntil(exp, 'use-by') <= c.lastPickupDay(exp, 'use-by'), true)
})
test('A4: expiry classes are distinct but the "within N days" tests are cumulative', () => {
  const d = (n) => c.iso(c.addDays(c.today0(), n))
  assert.equal(c.within(d(1), 7), true, 'tomorrow is within 7 days'); assert.equal(c.within(d(0), 3), true)
  assert.equal(c.within(d(4), 3), false); assert.equal(c.within(d(-1), 7), false, 'past date is not "within"')
  assert.equal(c.expStatus(d(1)).k, 'd1'); assert.equal(c.expStatus(d(3)).k, 'd3'); assert.equal(c.expStatus(d(4)).k, 'd7'); assert.equal(c.expStatus(d(8)).k, 'fresh')
  assert.equal(c.expStatus(d(-1)).k, 'expired')
})
test('A4: reminders are per-threshold, never duplicated, honour preferences and describe real timing', () => {
  reset(); as('u1'); const u = c.me()
  c.S.notifs = []; c.S.inventory.forEach((i) => (i.status = 'closed'))
  const mk = (id, n) => c.S.inventory.push({ id, owner: 'u1', name: id, cat: 'pantry', kind: 'rice', qty: 1, initial: 1, log: [], status: 'active', expiry: c.iso(c.addDays(c.today0(), n)), expiryType: 'best-before', purchased: c.todayIso(), addedAt: Date.now() })
  mk('four', 4); mk('two', 2); mk('zero', 0); mk('ten', 10)
  c.syncReminders()
  const texts = c.myNotifs().map((n) => n.text + ' | ' + n.sub)
  assert.equal(texts.length, 3, texts.join('\n'))
  assert.ok(texts.some((t) => t.startsWith('four expires in 4 days') && t.includes('7-day in-app reminder (4 days left when shown)')))
  assert.ok(texts.some((t) => t.startsWith('two') && t.includes('3-day')))
  assert.ok(texts.some((t) => t.startsWith('zero expires today') && t.includes('1-day')))
  c.syncReminders(); assert.equal(c.myNotifs().length, 3, 'idempotent')
  u.prefs.d3 = false; c.S.notifs = []; c.syncReminders(); assert.equal(c.myNotifs().length, 2, 'disabled 3-day reminder is skipped')
})
test('A4: use-by expiry wording differs from best-before in alerts', () => {
  reset(); as('u1'); c.S.notifs = []
  c.syncReminders(); const t = c.myNotifs().map((n) => n.text + n.sub).join('\n')
  assert.match(t, /Yoghurt.*past its use-by date/s); assert.match(t, /don't eat it/)
})
test('barcode check digits are validated', async () => {
  const { gtinOk } = await import('../src/views/tracking.js')
  for (const ok of ['9556041610018', '9556001062048', '9551234567896', '96385074', '036000291452']) assert.equal(gtinOk(ok), true, ok)
  for (const bad of ['9556041610016', '12345678', '123', '95560416100181']) assert.equal(gtinOk(bad), false, bad)
})
test('migration: a saved pre-ledger state is rebuilt with sample data but registered accounts survive', async () => {
  const { loadWith } = await import('./harness.mjs')
  const old = { users: [{ id: 'u1', email: 'aisyah@freshsave.my', pw: 'demo1234', role: 'individual', sellerId: 'aisyah' }, { id: 'ux', name: 'New User', email: 'new@x.my', pw: 'password1', role: 'retailer', sellerId: 'sx', prefs: {} }], sellers: { sx: { id: 'sx', name: 'My Shop' } }, listings: [{ id: 'old', qty: 3 }], reservations: [{ id: 'oldr', listingId: 'old', qty: 1, status: 'confirmed' }] }
  const m = await loadWith(old)
  assert.equal(m.MIGRATED, true); assert.equal(m.S.schema, 3)
  assert.ok(m.S.users.some((u) => u.id === 'ux') && m.S.sellers.sx.name === 'My Shop')
  assert.ok(!m.S.listings.some((l) => l.id === 'old')); assert.deepEqual(m.checkInvariants(), [])
  assert.ok(m.S.reservations.every((r) => r.terms), 'every reservation carries a snapshot')
  const again = await loadWith(JSON.parse(JSON.stringify(m.S)))
  assert.equal(again.MIGRATED, false, 'current-schema state is not migrated again')
})
