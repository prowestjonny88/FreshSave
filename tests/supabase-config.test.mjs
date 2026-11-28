import assert from 'node:assert/strict'
import test from 'node:test'
import { supabaseEndpoint } from '../src/services/supabase-config.ts'

const publishable = 'sb_publishable_example'
const token = (role) => ['test', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'sig'].join('.')

test('Supabase accepts HTTPS project URLs and local development URLs', () => {
  assert.equal(supabaseEndpoint('https://freshsave-staging.supabase.co', publishable).protocol, 'https:')
  assert.equal(supabaseEndpoint('http://127.0.0.1:55421', token('anon')).hostname, '127.0.0.1')
})

test('Supabase rejects unsafe URLs and administrator keys', () => {
  for (const url of ['http://freshsave.supabase.co', 'https://user:pass@freshsave.supabase.co', 'https://freshsave.supabase.co/?key=example', 'not-a-url']) {
    assert.throws(() => supabaseEndpoint(url, publishable), /HTTPS Supabase URL/)
  }
  for (const key of ['sb_secret_example', token('service_role'), 'not-a-key']) {
    assert.throws(() => supabaseEndpoint('https://freshsave.supabase.co', key), /publishable or legacy anon/)
  }
})
