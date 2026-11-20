import { S, save, $, esc, ic, photo, LOCATIONS, uid, toast, go, syncReminders, app, focusErr } from '../core.js'

let regRole = 'individual'
const shell = (body) => `<div class="auth">
  <aside class="auth-brand" style="background-image:linear-gradient(180deg,#cc4a30e8,#cc4a30d4 45%,#9e3822f5),url('${photo('aisle', 0, 900)}')">
    <a class="logo inv" href="#/login"><i>${ic('leaf')}</i><span>Fresh<b>Save</b></span></a>
    <div><h2>Know what's in your kitchen. Find sealed surplus food nearby.</h2>
    <ul><li>${ic('box', 'sm')}<span><b>Track</b> – expiry dates and in-app reminders for food you own</span></li><li>${ic('basket', 'sm')}<span><b>Rescue</b> – reserve sealed pantry and bakery surplus, collect and pay in person</span></li></ul></div>
    <small>Design prototype · synthetic sample data · Kuala Lumpur &amp; Selangor</small>
  </aside>
  <section class="auth-main"><div class="auth-card"><div class="protonote">${ic('info', 'sm')}<span><b>Prototype.</b> Nothing you enter leaves this browser. Sellers are fictional and no real food, payments or notifications are involved. <a class="link" href="#/about">What is simulated?</a></span></div>${body}</div></section></div>`

const field = (id, label, type = 'text', extra = '') => `<div class="fld" data-fk="${id}"><label class="l" for="a-${id}">${label}</label><input type="${type}" id="a-${id}" name="${id}" ${extra}><div class="e"></div></div>`
const setErr = (form, id, msg) => { const f = form.querySelector(`[data-fk="${id}"]`); if (!f) return; f.classList.toggle('err', !!msg); f.querySelector('.e').textContent = msg || '' }

function login() {
  return shell(`<h1>Log in</h1><p class="mute">Welcome back to FreshSave.</p>
  <form id="f-login" novalidate>
    ${field('email', 'Email', 'email', 'autocomplete="email" placeholder="you@example.com"')}
    ${field('pw', 'Password', 'password', 'autocomplete="current-password"')}
    <div class="auth-row"><label class="chk"><input type="checkbox" name="keep" checked>Keep me logged in</label><a class="link sm" href="#/forgot">Forgot password?</a></div>
    <div class="formerr" id="loginerr" role="alert" hidden></div>
    <button class="btn block" type="submit">Log in</button>
  </form>
  <p class="auth-alt">New to FreshSave? <a class="link" href="#/register">Create an account</a></p>
  <div class="demo"><h6>Try a demo account (no sign-up needed)</h6>
    <button class="demo-acc" data-act="demo" data-e="aisyah@freshsave.my"><span class="avatar">AR</span><span><b>Aisyah Rahman</b><small>Individual · tracks home food, reserves rescues</small></span>${ic('cr', 'sm')}</button>
    <button class="demo-acc" data-act="demo" data-e="pakdin@freshsave.my"><span class="avatar">KR</span><span><b>Kedai Runcit Pak Din</b><small>Retailer · batch inventory and listings</small></span>${ic('cr', 'sm')}</button>
    <p class="mute sm">Demo password: demo1234. Accounts exist only in this browser. For real use you would need verified accounts and a shared database.</p></div>`)
}

function register() {
  const r = regRole
  return shell(`<h1>Create your account</h1><p class="mute">Choose how you'll use FreshSave.</p>
  <form id="f-register" novalidate>
    <div class="roles" role="radiogroup" aria-label="Account role">
      <button type="button" class="role ${r === 'individual' ? 'on' : ''}" data-act="role" data-r="individual" role="radio" aria-checked="${r === 'individual'}">${ic('user')}<b>Individual</b><small>Track food at home and reserve sealed surplus food nearby.</small></button>
      <button type="button" class="role ${r === 'retailer' ? 'on' : ''}" data-act="role" data-r="retailer" role="radio" aria-checked="${r === 'retailer'}">${ic('store')}<b>Retailer</b><small>Record stock batches and offer sealed surplus for pickup. Not verified in this prototype.</small></button>
    </div>
    ${field('name', r === 'retailer' ? 'Contact person name' : 'Full name', 'text', 'autocomplete="name"')}
    ${r === 'retailer' ? field('store', 'Store name', 'text', 'placeholder="e.g. Kedai Runcit Pak Din"') : ''}
    ${field('email', 'Email', 'email', 'autocomplete="email"')}
    ${field('pw', 'Password', 'password', 'autocomplete="new-password" placeholder="At least 8 characters"')}<p class="hint" style="margin-top:-10px">Stored as plain text in this browser – use a throwaway password, not a real one.</p>
    <div class="fld" data-fk="loc"><label class="l" for="a-loc">${r === 'retailer' ? 'Store neighbourhood' : 'Preferred location'}</label><select id="a-loc" name="loc">${LOCATIONS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('')}</select><div class="e"></div></div>
    ${r === 'retailer' ? `${field('address', 'Registered store / pickup address', 'text', 'placeholder="Street, area, postcode"')}<p class="hint" style="margin-top:-10px">Buyers collect at this fixed address. It is not updated from GPS.</p><p class="note warn" style="margin-top:12px">${ic('alert', 'sm')}<span>Anyone can register as a retailer here. In a real pilot, sellers would be approved by the FreshSave team first.</span></p>` : ''}
    <div class="fld" data-fk="consent"><label class="chk"><input type="checkbox" name="consent" id="a-consent">I understand this is a prototype: my details stay in this browser and I won't enter real personal data.</label><div class="e"></div></div>
    <button class="btn block" type="submit" style="margin-top:20px">Create account</button>
  </form>
  <p class="auth-alt">Already have an account? <a class="link" href="#/login">Log in</a></p>`)
}

let forgotSent = ''
function forgot() {
  return shell(forgotSent
    ? `<div class="okbar wait"><span class="c">${ic('info')}</span><div><b>No email was sent</b><div class="mute sm">This prototype has no email service, so nothing was sent to ${esc(forgotSent)}. Demo accounts use the password demo1234.</div></div></div><a class="btn block" href="#/login" data-act="forgotback">Back to log in</a>`
    : `<a class="link sm" href="#/login">${ic('cl', 'xs')} Back to log in</a><h1 style="margin-top:14px">Reset password</h1><p class="note warn">${ic('info', 'sm')}<span><b>Demo only.</b> No email is sent and passwords can't be recovered. Use “Reset demo data” in Profile if you are locked out.</span></p>
       <form id="f-forgot" novalidate>${field('email', 'Email', 'email', 'autocomplete="email"')}<button class="btn block" type="submit" style="margin-top:18px">Continue (demo)</button></form>`)
}

function startSession(u, keep = true, isNew = false) {
  S.session = u.id
  S.sessionTemp = !keep
  try { sessionStorage.setItem('fs-live', '1') } catch { /* storage unavailable */ }
  S.buyerLoc = null
  save()
  syncReminders()
  // Individuals land on the marketplace (finding food comes first); retailers and new users land on "Today".
  go(isNew || u.role === 'retailer' ? '#/dashboard' : '#/market')
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
    if (f.querySelector('.err')) return focusErr(f), true
    const u = S.users.find((x) => x.email.toLowerCase() === email && x.pw === pw)
    const er = $('#loginerr')
    if (!u) { er.hidden = false; er.textContent = 'Email or password is incorrect.'; $('#a-pw').focus(); return true }
    startSession(u, f.keep.checked)
    return true
  }
  if (f.id === 'f-register') {
    const v = (k) => (f[k]?.value || '').trim()
    const email = v('email').toLowerCase()
    setErr(f, 'name', v('name').length >= 2 ? '' : 'Enter your name.')
    if (regRole === 'retailer') { setErr(f, 'store', v('store').length >= 2 ? '' : 'Enter your store name.'); setErr(f, 'address', v('address').length >= 8 ? '' : 'Enter the full pickup address.') }
    setErr(f, 'email', !/\S+@\S+\.\S+/.test(email) ? 'Enter a valid email address.' : S.users.some((u) => u.email === email) ? 'An account with this email already exists.' : '')
    setErr(f, 'pw', f.pw.value.length >= 8 ? '' : 'Use at least 8 characters.')
    setErr(f, 'consent', f.consent.checked ? '' : 'Please confirm to continue.')
    if (f.querySelector('.err')) return focusErr(f), true
    const loc = LOCATIONS.find((l) => l.id === v('loc'))
    const id = uid('u'), sid = uid('s')
    S.sellers[sid] = { id: sid, name: regRole === 'retailer' ? v('store') : v('name'), role: regRole, kind: regRole === 'retailer' ? 'Retailer' : 'Individual', area: regRole === 'retailer' ? v('address') : `${loc.short} (not shown to others)`, x: loc.x + 0.3, y: loc.y + 0.2, since: new Date().getFullYear(), hue: '#4f6f55', hours: regRole === 'retailer' ? 'Set opening hours with each listing' : 'n/a' }
    const u = { id, name: v('name'), email, pw: f.pw.value, role: regRole, sellerId: sid, loc: loc.id, joined: Date.now(), onboard: true, prefs: { d7: true, d3: true, d1: true, expired: true, stock: true, resv: true } }
    S.users.push(u)
    toast('Account created – welcome to FreshSave')
    startSession(u, true, true)
    return true
  }
  if (f.id === 'f-forgot') {
    const email = f.email.value.trim()
    setErr(f, 'email', /\S+@\S+\.\S+/.test(email) ? '' : 'Enter a valid email address.')
    if (f.querySelector('.err')) return focusErr(f), true
    forgotSent = email
    app.render()
    return true
  }
  return false
}
export const logout = () => { S.session = null; S.sessionTemp = false; save(); forgotSent = ''; go('#/login') }
