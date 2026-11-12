// FreshSave – role-based navigation, router and global event delegation.
import { $, $$, ic, app, route, me, isRetailer, FORMS, HOOKS, closeModal, runOk, syncReminders, toast } from './core.js'
import * as auth from './views/auth.js'
import * as tracking from './views/tracking.js'
import * as market from './views/market.js'
import * as listings from './views/listings.js'
import * as reservations from './views/reservations.js'
import * as account from './views/account.js'
import { refreshChrome } from './components/navigation.js'
import { actions as popoverActions, closePops } from './components/notifications.js'

const MODS = [auth, tracking, market, listings, reservations, account]
const ROUTES = Object.assign({}, ...MODS.map((m) => m.routes))
const ACT = {}
MODS.forEach((m) => Object.entries(m.actions || {}).forEach(([k, f]) => { if (ACT[k]) console.warn('duplicate action', k); ACT[k] = f }))
const AUTH = ['login', 'register', 'forgot']
const RETAILER_ONLY = ['batches', 'batch', 'basket']
const INDIVIDUAL_ONLY = ['inventory']
document.querySelectorAll('[data-icon]').forEach((el) => {
  el.outerHTML = ic(el.dataset.icon, el.dataset.iconClass || '')
})

/* ---------------- Router ---------------- */
let lastPath = null
function render() {
  const { parts, q } = route()
  let p = parts[0]
  const u = me()
  if (!u && !AUTH.includes(p)) return void (location.hash = '#/login')
  if (u && (AUTH.includes(p) || p === '')) return void (location.hash = '#/market')
  if (u && RETAILER_ONLY.includes(p) && !isRetailer()) { toast('That page is for retailer accounts', 'info'); return void (location.hash = '#/inventory') }
  if (u && INDIVIDUAL_ONLY.includes(p) && isRetailer()) return void (location.hash = '#/batches')
  const path = location.hash.split('?')[0]
  if (path !== lastPath) { window.scrollTo(0, 0); closeModal(); }
  lastPath = path
  if (!u) {
    $('#app').hidden = true; $('#auth-root').hidden = false
    $('#auth-root').innerHTML = ROUTES[p]()
    return
  }
  $('#auth-root').hidden = true; $('#app').hidden = false
  $('#auth-root').innerHTML = ''
  syncReminders()
  const fn = ROUTES[p]
  $('#main').innerHTML = fn ? fn(parts, q) || '' : `<div class="empty">${ic('info')}<h3>Page not found</h3><p>The page you're looking for doesn't exist.</p><div class="acts"><a class="btn" href="#/dashboard">Go to dashboard</a></div></div>`
  $('#main').dataset.page = p
  $$('#main table.tbl').forEach((t) => { const w = document.createElement('div'); w.className = 'tblwrap'; t.before(w); w.appendChild(t) })
  refreshChrome()
}
app.render = render
app.refreshChrome = refreshChrome
window.addEventListener('hashchange', render)

const CORE = {
  mclose: () => closeModal(),
  mok: () => runOk(),
  home: (el, e) => { market.resetBrowse(); if (location.hash.split('?')[0] === '#/market') { e.preventDefault(); app.render() } },
}
Object.assign(ACT, CORE, popoverActions)

/* ---------------- Global events ---------------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]')
  if (!e.target.closest('.hwrap')) closePops()
  if (!e.target.closest('#searchbox')) $('#sdrop').classList.remove('open')
  if (e.target === $('#ov')) closeModal()
  if (e.target.closest('.pop a')) closePops()
  if (!el) return
  const f = ACT[el.dataset.act]
  if (f) f(el, e)
})
function bind(t) {
  const b = t.dataset?.b
  if (!b) return false
  const [f, k] = b.split('.')
  if (!FORMS[f]) return true
  FORMS[f][k] = t.type === 'checkbox' ? t.checked : t.value
  if (FORMS[f].err?.[k]) { delete FORMS[f].err[k]; t.closest('.fld,.chk')?.classList.remove('err') }
  HOOKS[f]?.(k)
  return true
}
document.addEventListener('input', (e) => { if (bind(e.target)) return; for (const m of MODS) if (m.input?.(e)) return })
document.addEventListener('change', (e) => { if (bind(e.target)) return; for (const m of MODS) if (m.change?.(e)) return })
document.addEventListener('submit', (e) => { e.preventDefault(); for (const m of MODS) if (m.submit?.(e)) return })
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closePops(); $('#sdrop').classList.remove('open'); $('#drawer').classList.remove('open') }
  market.keydown(e)
})
document.addEventListener('focusin', (e) => { if (e.target.id === 'q') market.renderDrop() })
// Fallback for images that fail to load (e.g. offline).
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f1f0ec"/><path d="M38 62c0-14 8-22 24-24-1 16-9 24-24 24z M38 62l12-12" fill="none" stroke="#a9a596" stroke-width="2.5" stroke-linecap="round"/></svg>')
document.addEventListener('error', (e) => { const t = e.target; if (t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = 1; t.src = FALLBACK } }, true)

reservations.resume()
render()
