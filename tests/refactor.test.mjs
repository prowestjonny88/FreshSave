import assert from 'node:assert/strict'
import test from 'node:test'
import { core } from './harness.mjs'
import { createDemoServices } from '../src/services/demo.ts'
import { collectionDeadline, storeDay, storeTime } from '../src/domain/time.ts'

test('pickup deadlines end inside Malaysian shop hours and preserve the 24-hour cap', () => {
  const window = { until: '2026-05-22', from: '09:00', to: '17:00' }
  const accepted = storeTime('2026-05-18', '19:00')
  assert.equal(collectionDeadline(window, accepted), storeTime('2026-05-19', '17:00'))
  assert.equal(collectionDeadline(window, storeTime('2026-05-18', '15:00')), storeTime('2026-05-19', '15:00'))
  assert.equal(collectionDeadline({ ...window, until: '2026-05-18' }, accepted), null)
  assert.equal(storeDay(Date.parse('2026-05-18T16:15:00Z')), '2026-05-19')
})

test('recount rejects units received below completed handovers', async () => {
  core.resetAll()
  core.S.session = 'u2'
  const service = createDemoServices()
  const batch = core.getB('b4')
  batch.verify = 'unverified'
  const result = await service.run('saveFood', {
    id: batch.id, name: batch.name, cat: batch.cat, qty: 1,
    expiry: batch.expiry, expiryType: batch.expiryType, date: batch.recorded, confirmed: true,
  })
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'stock')
  assert.equal(core.checkInvariants().length, 0)
})

test('batch publish validates the latest printed date type', async () => {
  core.resetAll()
  core.S.session = 'u2'
  const service = createDemoServices(), batch = core.getB('b7')
  batch.expiryType = 'use-by'
  const result = await service.run('offerBatch', {
    batchId: batch.id, name: batch.name, cat: batch.cat, expiry: batch.expiry, expiryType: 'best-before',
    qty: 1, orig: 8, price: 4, pack: 'sealed', c1: true, c2: true, c3: true, desc: '',
    instr: 'Collect at the counter.', pickupUntil: batch.expiry, pickFrom: '10:00', pickTo: '21:00', photos: [],
  })
  assert.equal(result.ok, false)
  assert.equal(result.error.field, 'pickupUntil')
  assert.equal(core.batchListings(batch).length, 0)
})

test('expired stock is withdrawn and eliminated from batch offer capacity', async () => {
  core.resetAll()
  core.S.session = 'u2'
  const service = createDemoServices(), batch = core.getB('b5'), listing = core.getL('m4')
  const initialCapacity = core.batchListable(batch)
  assert.equal((await service.run('closeListing', { id: listing.id })).ok, true)
  assert.equal(listing.status, 'closed')
  assert.equal(listing.removedQty, 5)
  assert.equal(core.batchListable(batch), initialCapacity)
  assert.equal((await service.run('closeListing', { id: listing.id })).ok, true)
  assert.equal(listing.removedQty, 5)
})
