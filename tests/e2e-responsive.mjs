import { session, ok, eq, done } from './e2e-lib.mjs'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const shots = mkdtempSync(join(tmpdir(), 'freshsave-shots-'))
const PAGES = {
  individual: ['#/market', '#/dashboard', '#/inventory', '#/scan', '#/barcode', '#/reservations?tab=confirmed', '#/reservation/r6', '#/item/l1', '#/seller/jaya', '#/notifications', '#/impact', '#/profile', '#/about', '#/market?x'],
  retailer: ['#/dashboard', '#/batches', '#/batch/b6', '#/batch/b7', '#/batch/b7/list', '#/listings', '#/listings?tab=awaiting', '#/sell', '#/basket', '#/basket/l6', '#/reservations', '#/reservation/r2', '#/impact', '#/profile', '#/item/l6'],
}
const a11y = `
const out = []
const name = (e) => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.innerText || e.textContent || e.getAttribute('title') || e.value || '').trim()
document.querySelectorAll('#main button, #main a[href], #hdr button, #hdr a[href], #bnav a').forEach((e) => { if (!name(e) && !e.querySelector('img[alt]:not([alt=""])')) out.push('unnamed control: ' + e.outerHTML.slice(0, 90)) })
document.querySelectorAll('#main input:not([type=hidden]), #main select, #main textarea').forEach((e) => { const has = e.getAttribute('aria-label') || (e.id && document.querySelector('label[for="' + e.id + '"]')) || e.closest('label'); if (!has) out.push('unlabelled field: ' + e.outerHTML.slice(0, 90)) })
document.querySelectorAll('#main img').forEach((e) => { if (!e.hasAttribute('alt')) out.push('img without alt: ' + e.src.slice(-40)) })
const ids = {}; document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1 }); Object.entries(ids).forEach(([k, v]) => { if (v > 1) out.push('duplicate id: ' + k) })
if (document.querySelectorAll('h1').length !== 1 && !location.hash.startsWith('#/market') && !location.hash.startsWith('#/item') && !location.hash.startsWith('#/dashboard')) out.push('h1 count ' + document.querySelectorAll('h1').length)
return out`
let issues = []
for (const role of ['individual', 'retailer']) {
  for (const w of [1440, 1024, 768, 390]) {
    const b = await session({ width: w, height: w < 700 ? 844 : 900 })
    await b.login(role === 'individual' ? 'aisyah@freshsave.my' : 'pakdin@freshsave.my')
    const bad = []
    for (const p of PAGES[role]) {
      await b.hash(p); await b.sleep(150)
      const o = await b.overflow(); if (o > 1) bad.push(`${p} overflows by ${o}px`)
      if (w === 1440) { const f = await b.eval(a11y); f.forEach((x) => issues.push(`${role} ${p}: ${x}`)) }
      if ([390, 768].includes(w) && ['#/market', '#/dashboard', '#/inventory', '#/listings', '#/reservations?tab=confirmed', '#/reservations', '#/batches', '#/item/l1', '#/reservation/r6', '#/batch/b7/list', '#/basket', '#/sell'].includes(p)) await b.shot(join(shots, `${role}_${w}_${p.replace(/[^a-z0-9]+/gi, '_')}.png`))
    }
    const nav = await b.eval(`const n=document.querySelector('#bnav'); return getComputedStyle(n).display`)
    ok(bad.length === 0, `${role} @${w}px: no horizontal overflow on ${PAGES[role].length} pages` + (bad.length ? ' – ' + bad.join('; ') : ''))
    eq(nav, w <= 1024 ? 'flex' : 'none', `${role} @${w}px: bottom nav ${w <= 1024 ? 'shown' : 'hidden'}`)
    ok(b.errors.length === 0, `${role} @${w}px: no JS errors` + (b.errors.length ? ' ' + b.errors[0] : ''))
    await b.close()
  }
}
const uniq = [...new Set(issues)]
console.log('Accessibility findings (1440px):', uniq.length ? '\n  ' + uniq.join('\n  ') : 'none')
ok(uniq.length === 0, 'no unnamed controls / unlabelled fields / missing alt / duplicate ids')
process.exit(done() ? 1 : 0)
