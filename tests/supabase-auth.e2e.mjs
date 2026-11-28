import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { BASE_URL, launch } from './cdp.mjs'

const mailbox = new URL(process.env.E2E_MAILPIT_URL || 'http://127.0.0.1:55424/')
for (const url of [mailbox, new URL(BASE_URL)]) {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Use the disposable local stack.')
}
const email = `freshsave-${randomUUID()}@example.com`
const initialPassword = `FreshSave-${randomUUID()}!`
const newPassword = `FreshSave-${randomUUID()}!`
const b = await launch({ realClock: true })

async function until(check, message) {
  const deadline = Date.now() + 20_000
  do {
    const value = await check()
    if (value) return value
    await b.sleep(200)
  } while (Date.now() < deadline)
  throw new Error(message)
}

async function readMail(path) {
  const response = await fetch(new URL(path, mailbox), { signal: AbortSignal.timeout(5000) })
  assert.ok(response.ok, `Mailpit returned ${response.status}`)
  return response.json()
}

async function mailLink(type) {
  const query = new URLSearchParams({ query: `to:${email}` })
  return until(async () => {
    const inbox = await readMail('/api/v1/search?' + query)
    for (const entry of inbox.messages || []) {
      const message = await readMail('/api/v1/message/' + entry.ID)
      const links = (message.HTML || '').matchAll(/href="([^"]+)"/g)
      for (const [, href] of links) {
        const url = new URL(href.replaceAll('&amp;', '&'))
        if (url.searchParams.get('type') !== type) continue
        assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        return url.href
      }
    }
  }, `No ${type} link in the local test inbox`)
}

const submit = (id) => b.eval(`document.querySelector(${JSON.stringify(id)}).requestSubmit()`)
const heading = (selector) => b.eval(`return !!document.querySelector(${JSON.stringify(selector)})`)

async function logout() {
  await b.click('[data-act=mpop]')
  await b.click('[data-act=logout]')
  await until(() => heading('#f-login'), 'Log out did not return to Log in')
}

try {
  await b.goto(new URL('#/register', BASE_URL).href)
  assert.equal(await b.has('[data-r=retailer]'), false)
  await b.type('#a-name', 'Confirmation Test Buyer')
  await b.type('#a-email', email)
  await b.type('#a-pw', initialPassword)
  await submit('#f-register')
  await until(async () => (await b.text('.auth-card')).includes('Check your email to confirm'), 'Sign-up did not ask for email confirmation')
  await b.goto(await mailLink('signup'))
  await until(() => heading('#main h1'), 'Sign-up callback did not open the app')
  assert.equal(await b.eval('return location.hash'), '#/dashboard')
  assert.match(await b.text('#main h1'), /Hello, Confirmation/)
  assert.equal(await b.eval('return location.search'), '')
  await b.hash('#/profile')
  assert.equal(await b.eval("return document.querySelector('#pf-name').value"), 'Confirmation Test Buyer')
  console.log('PASS required email confirmation completes the buyer profile and opens Today')

  await logout()
  await b.hash('#/forgot')
  await b.type('#a-email', email)
  await submit('#f-forgot')
  await until(async () => (await b.text('.auth-card')).includes('check your email for reset instructions'), 'Reset did not acknowledge the request')
  await b.send('Page.navigate', { url: await mailLink('recovery') })
  await until(() => heading('#reset-password'), 'Recovery callback did not open the password form')
  assert.equal(await b.eval('return location.hash'), '#/recover')
  await b.type('#reset-password', newPassword)
  await b.eval("document.querySelector('#reset-password').form.requestSubmit()")
  await until(() => heading('#hdr'), 'Password change did not return to the app')
  await logout()
  await b.type('#a-email', email)
  await b.type('#a-pw', newPassword)
  await submit('#f-login')
  await until(() => heading('#hdr'), 'The new password did not sign the buyer in')
  console.log('PASS recovery callback opens the reset form and the new password signs in')

  await logout()
  const expired = new URL(BASE_URL)
  expired.searchParams.set('code', 'expired-test-code')
  await b.goto(expired.href)
  assert.match(await b.text('#loginerr'), /email link has expired or was opened in a different browser/)
  assert.deepEqual(b.errors, [])
  console.log('PASS an invalid callback returns to Log in with a recovery message')
} finally {
  await b.close()
}
