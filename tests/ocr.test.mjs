// OCR expiry-date parser tests (Module A). Run: node --test tests/
import test from 'node:test'
import assert from 'node:assert/strict'
import { findDates, parseOcrDate } from '../src/domain/ocr-date.ts'

test('labelled expiry dates are found with their type', () => {
  assert.deepEqual(
    [parseOcrDate('MFG 01/06/2026\nEXP 12/01/2027').date, parseOcrDate('MFG 01/06/2026\nEXP 12/01/2027').type],
    ['2027-01-12', 'use-by'],
  )
  const bb = parseOcrDate('BEST BEFORE\n15 MAR 2027')
  assert.equal(bb.date, '2027-03-15')
  assert.equal(bb.type, 'best-before')
  assert.equal(bb.detection, 'success')
  assert.equal(parseOcrDate('Baik Sebelum: 03.02.27').type, 'best-before')
  assert.equal(parseOcrDate('Tarikh Luput 2027-04-30').date, '2027-04-30')
})

test('common printed formats parse day-first', () => {
  assert.deepEqual(findDates('12.01.27'), ['2027-01-12'])
  assert.deepEqual(findDates('05JAN2027'), ['2027-01-05'])
  assert.deepEqual(findDates('31 DIS 2026'), ['2026-12-31'])
  assert.ok(findDates('JUN 2027').includes('2027-06-30'))
  assert.deepEqual(findDates('31/02/2027'), [])
})

test('unlabelled dates are uncertain and pick the latest; no date fails', () => {
  const r = parseOcrDate('01/06/2026 12/01/2027 L2345')
  assert.equal(r.detection, 'uncertain')
  assert.equal(r.date, '2027-01-12')
  assert.equal(r.type, null)
  assert.equal(parseOcrDate('NET WT 500g').detection, 'failed')
})

test('OCR letter O misread as zero is tolerated', () => {
  assert.equal(parseOcrDate('EXP 1O/O3/2027').date, '2027-03-10')
})
