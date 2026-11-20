import { session, ok, done } from './e2e-lib.mjs'
const audit = `
const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r, g, b, a } }
const lin = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }
const L = (c) => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b)
const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 })
const bgOf = (el) => { let stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage !== 'none') return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a === 1) break } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (const c of stack.reverse()) base = over(c, base); return base }
const bad = [], seen = new Set()
document.querySelectorAll('body *').forEach((el) => {
  if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return
  const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
  if (!own) return
  const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return
  const bg = bgOf(el); if (!bg) return
  let fg = parse(cs.color); if (!fg) return; fg = over({ ...fg, a: fg.a * (+cs.opacity || 1) }, bg)
  const [x, y] = [L(fg), L(bg)].sort((p, q) => q - p), ratio = (x + .05) / (y + .05)
  const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700, large = size >= 24 || (size >= 18.66 && bold)
  if (ratio < (large ? 3 : 4.5)) { const k = el.tagName + '.' + el.className + '|' + own.slice(0, 24); if (!seen.has(k)) { seen.add(k); bad.push(ratio.toFixed(2) + ' ' + k + ' (' + cs.color + ' on rgb(' + [bg.r, bg.g, bg.b].map(Math.round) + '))') } }
})
return bad`
const run = async (email, pages) => {
  const b = await session()
  await b.login(email)
  const all = []
  for (const p of pages) { await b.hash(p); await b.sleep(200); (await b.eval(audit)).forEach((x) => all.push(`${p}: ${x}`)) }
  await b.close(); return all
}
const ind = await run('aisyah@freshsave.my', ['#/market', '#/dashboard', '#/inventory', '#/inventory?st=d7', '#/scan', '#/reservations?tab=confirmed', '#/reservation/r6', '#/reservation/r5', '#/item/l1', '#/item/l14', '#/seller/jaya', '#/notifications', '#/impact', '#/profile', '#/about'])
const ret = await run('pakdin@freshsave.my', ['#/dashboard', '#/batches', '#/batch/b6', '#/batch/b7/list', '#/listings', '#/listings?tab=ended', '#/basket', '#/basket/l6', '#/reservations', '#/reservation/r2', '#/sell'])
const bad = [...new Set([...ind, ...ret])]
console.log(bad.length ? bad.join('\n') : 'no contrast failures')
ok(bad.length === 0, `text contrast >= 4.5:1 (3:1 for large text) on ${14 + 11} pages`)
process.exit(done() ? 1 : 0)
