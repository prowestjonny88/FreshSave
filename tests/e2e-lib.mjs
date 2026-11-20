import { launch } from './cdp.mjs'
export const URL = 'http://127.0.0.1:3000/'
let pass = 0, fail = 0
export const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS', msg) } else { fail++; console.log('  FAIL', msg) } }
export const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}${JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`}`)
export const done = () => { console.log(`\n${pass} passed, ${fail} failed`); return fail }
export async function session(opts = {}) {
  const b = await launch({ width: opts.width || 1440, height: opts.height || 900 })
  b.state = () => b.eval(`return JSON.parse(localStorage.getItem('freshsave-app-v2'))`)
  b.loginKeep = async (email) => { await b.hash('#/login'); await b.sleep(300); await b.type('#a-email', email); await b.type('#a-pw', 'demo1234'); await b.eval(`document.querySelector('#f-login').requestSubmit()`); await b.sleep(500) }
  b.logout = async () => { await b.click('[data-act=mpop]'); await b.click('[data-act=logout]'); await b.sleep(300) }
  b.act = async (act, extra = '') => b.click(`[data-act="${act}"]${extra}`)
  b.modal = () => b.text('#modal')
  b.modalOpen = () => b.eval(`return document.querySelector('#ov').classList.contains('open')`)
  b.toastText = () => b.text('#toasts')
  b.overflow = () => b.eval(`const w=document.documentElement; return w.scrollWidth - w.clientWidth`)
  return b
}
