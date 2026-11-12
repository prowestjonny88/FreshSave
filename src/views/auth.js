import { S, save, $, esc, ic, photo, LOCATIONS, uid, toast, go, syncReminders, app } from '../core.js'

let regRole = 'individual'
const shell = (body) => `<div class="auth">
  <aside class="auth-brand" style="background-image:linear-gradient(180deg,#f26b4fe0,#f26b4fcc 45%,#c94a31f2),url('${photo('aisle', 0, 900)}')">
    <a class="logo inv" href="#/login"><i>${ic('leaf')}</i><span>Fresh<b>Save</b></span></a>
    <div><h2>Track what's in your kitchen. Rescue what's left on the shelf.</h2>
    <ul><li>${ic('camera', 'sm')}Scan product photos to record expiry dates</li><li>${ic('bell', 'sm')}Reminders 7, 3 and 1 day before food expires</li><li>${ic('basket', 'sm')}Reserve discounted surplus food from nearby shops</li></ul></div>
    <small>Smart Food Expiry Tracker & Food Rescue Marketplace · Kuala Lumpur & Selangor</small>
  </aside>
  <section class="auth-main"><div class="auth-card">${body}</div></section></div>`

const field = (id, label, type = 'text', extra = '') => `<div class="fld" data-fk="${id}"><label class="l" for="a-${id}">${label}</label><input type="${type}" id="a-${id}" name="${id}" ${extra}><div class="e"></div></div>`
const setErr = (form, id, msg) => { const f = form.querySelector(`[data-fk="${id}"]`); if (!f) return; f.classList.toggle('err', !!msg); f.querySelector('.e').textContent = msg || '' }

function login() {
  return shell(`<h1>Log in</h1><p class="mute">Welcome back to FreshSave.</p>
  <form id="f-login" novalidate>
    ${field('email', 'Email', 'email', 'autocomplete="email" placeholder="you@example.com"')}
    ${field('pw', 'Password', 'password', 'autocomplete="current-password"')}
    <div class="auth-row"><label class="chk"><input type="checkbox" checked>Keep me logged in</label><a class="link sm" href="#/forgot">Forgot password?</a></div>
    <div class="formerr" id="loginerr" hidden></div>
    <button class="btn block" type="submit">Log in</button>
  </form>
  <p class="auth-alt">New to FreshSave? <a class="link" href="#/register">Create an account</a></p>
  <div class="demo"><h6>Prototype demo accounts</h6>
    <button class="demo-acc" data-act="demo" data-e="aisyah@freshsave.my"><span class="avatar">AR</span><span><b>Aisyah Rahman</b><small>Individual · tracks home food, reserves rescues</small></span>${ic('cr', 'sm')}</button>
    <button class="demo-acc" data-act="demo" data-e="pakdin@freshsave.my"><span class="avatar">KR</span><span><b>Kedai Runcit Pak Din</b><small>Retailer · batch inventory and listings</small></span>${ic('cr', 'sm')}</button>
    <p class="mute sm">Password for both: demo1234. Accounts are stored only in this browser.</p></div>`)
}

function register() {
  const r = regRole
  return shell(`<h1>Create your account</h1><p class="mute">Choose how you'll use FreshSave.</p>
  <form id="f-register" novalidate>
    <div class="roles" role="radiogroup" aria-label="Account role">
      <button type="button" class="role ${r === 'individual' ? 'on' : ''}" data-act="role" data-r="individual" role="radio" aria-checked="${r === 'individual'}">${ic('user')}<b>Individual</b><small>Track food at home and reserve surplus food nearby.</small></button>
      <button type="button" class="role ${r === 'retailer' ? 'on' : ''}" data-act="role" data-r="retailer" role="radio" aria-checked="${r === 'retailer'}">${ic('store')}<b>Retailer</b><small>Record stock batches and list verified surplus for pickup.</small></button>
    </div>
    ${field('name', r === 'retailer' ? 'Contact person name' : 'Full name', 'text', 'autocomplete="name"')}
    ${r === 'retailer' ? field('store', 'Store name', 'text', 'placeholder="e.g. Kedai Runcit Pak Din"') : ''}
    ${field('email', 'Email', 'email', 'autocomplete="email"')}
    ${field('pw', 'Password', 'password', 'autocomplete="new-password" placeholder="At least 8 characters"')}
    <div class="fld" data-fk="loc"><label class="l" for="a-loc">${r === 'retailer' ? 'Store neighbourhood' : 'Preferred location'}</label><select id="a-loc" name="loc">${LOCATIONS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('')}</select><div class="e"></div></div>
    ${r === 'retailer' ? `${field('address', 'Registered store / pickup address', 'text', 'placeholder="Street, area, postcode"')}<p class="hint" style="margin-top:-10px">Buyers collect at this fixed address. It is not updated from GPS.</p>` : ''}
    <button class="btn block" type="submit" style="margin-top:20px">Create account</button>
  </form>
  <p class="auth-alt">Already have an account? <a class="link" href="#/login">Log in</a></p>`)
}

let forgotSent = ''
function forgot() {
  return shell(forgotSent
    ? `<div class="okbar">${ic('check2')}<div><b>Check your email</b><div class="mute sm">If an account exists for ${esc(forgotSent)}, we've sent instructions to reset your password.</div></div></div>
       <p class="mute sm">Prototype: no email is actually sent.</p><a class="btn block" href="#/login" data-act="forgotback">Back to log in</a>`
    : `<a class="link sm" href="#/login">${ic('cl', 'xs')} Back to log in</a><h1 style="margin-top:14px">Reset password</h1><p class="mute">Enter the email you registered with and we'll send reset instructions.</p>
       <form id="f-forgot" novalidate>${field('email', 'Email', 'email', 'autocomplete="email"')}<button class="btn block" type="submit" style="margin-top:18px">Send reset instructions</button></form>`)
}

function startSession(u) {
  S.session = u.id
  S.buyerLoc = null
  save()
  syncReminders()
  go('#/market')
}

export const routes = { login, register, forgot }
export const actions = {
  demo: (el) => { $('#a-email').value = el.dataset.e; $('#a-pw').value = 'demo1234'; $('#f-login').requestSubmit() },
  role: (el) => { regRole = el.dataset.r; const keep = {}; ['name', 'email', 'pw'].forEach((k) => (keep[k] = $('#a-' + k)?.value || '')); app.render(); Object.entries(keep).forEach(([k, v]) => { const i = $('#a-' + k); if (i) i.value = v }) },
  forgotback: () => { forgotSent = '' },
}

export function submit(e) {
  const f = e.target
  if (f.id === 'f-login') {
    const email = f.email.value.trim().toLowerCase(), pw = f.pw.value
    setErr(f, 'email', /\S+@\S+\.\S+/.test(email) ? '' : 'Enter a valid email address.')
    setErr(f, 'pw', pw ? '' : 'Enter your password.')
    if (f.querySelector('.err')) return true
    const u = S.users.find((x) => x.email.toLowerCase() === email && x.pw === pw)
    const er = $('#loginerr')
    if (!u) { er.hidden = false; er.textContent = 'Email or password is incorrect.'; return true }
    startSession(u)
    return true
  }
  if (f.id === 'f-register') {
    const v = (k) => (f[k]?.value || '').trim()
    const email = v('email').toLowerCase()
    setErr(f, 'name', v('name').length >= 2 ? '' : 'Enter your name.')
    if (regRole === 'retailer') { setErr(f, 'store', v('store').length >= 2 ? '' : 'Enter your store name.'); setErr(f, 'address', v('address').length >= 8 ? '' : 'Enter the full pickup address.') }
    setErr(f, 'email', !/\S+@\S+\.\S+/.test(email) ? 'Enter a valid email address.' : S.users.some((u) => u.email === email) ? 'An account with this email already exists.' : '')
    setErr(f, 'pw', f.pw.value.length >= 8 ? '' : 'Use at least 8 characters.')
    if (f.querySelector('.err')) return true
    const loc = LOCATIONS.find((l) => l.id === v('loc'))
    const id = uid('u'), sid = uid('s')
    S.sellers[sid] = { id: sid, name: regRole === 'retailer' ? v('store') : v('name'), role: regRole, kind: regRole === 'retailer' ? 'Retailer' : 'Individual', area: regRole === 'retailer' ? v('address') : `${loc.short} (exact pickup point shared on reservation)`, x: loc.x + 0.3, y: loc.y + 0.2, since: new Date().getFullYear(), hue: '#4f6f55', hours: regRole === 'retailer' ? 'Store opening hours' : 'By arrangement' }
    const u = { id, name: v('name'), email, pw: f.pw.value, role: regRole, sellerId: sid, loc: loc.id, joined: Date.now(), prefs: { d7: true, d3: true, d1: true, expired: true, stock: true, resv: true } }
    S.users.push(u)
    toast('Account created – welcome to FreshSave')
    startSession(u)
    return true
  }
  if (f.id === 'f-forgot') {
    const email = f.email.value.trim()
    setErr(f, 'email', /\S+@\S+\.\S+/.test(email) ? '' : 'Enter a valid email address.')
    if (f.querySelector('.err')) return true
    forgotSent = email
    app.render()
    return true
  }
  return false
}
export const logout = () => { S.session = null; save(); forgotSent = ''; go('#/login') }
