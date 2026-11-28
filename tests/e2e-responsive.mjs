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
  for (const w of [1440, 1024, 768, 390, 320]) {
    const b = await session({ width: w, height: w === 320 ? 740 : w === 390 ? 844 : 900 })
    await b.login(role === 'individual' ? 'aisyah@freshsave.my' : 'pakdin@freshsave.my')
    if (w === 1440 || w === 390) {
      const selector = w === 1440 ? '#nav' : '#bnav'
      await b.hash('#/reservations?tab=confirmed')
      const labels = role === 'retailer'
        ? ['Store today', 'Stock', 'Listings', 'Reservations']
        : ['Today', 'My food', 'Find food', 'Reservations']
      eq(await b.eval(`return [...document.querySelectorAll('${selector} > a > span')].map(label => label.textContent)`), labels, `${role} @${w}px: navigation uses four destination labels`)
      eq(await b.eval(`return [...document.querySelectorAll('${selector} [aria-current="page"]')].map(link => link.getAttribute('href'))`), ['#/reservations'], `${role} @${w}px: Reservations is the only current destination`)
    }
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
    if (w === 320) {
      ok(await b.eval(`const rect = document.querySelector('button[aria-label="Account menu"]').getBoundingClientRect(); return innerWidth === 320 && rect.right <= 320 && rect.left >= 0`), `${role} @320px: account menu is wholly inside the viewport`)
      if (role === 'retailer') {
        await b.hash('#/listings?tab=live')
        ok(await b.eval(`const rows = [...document.querySelectorAll('.work-table tbody tr')]; return rows.length > 0 && rows.every(row => { const units = row.querySelector('.units'); const cell = units.closest('td'); return units.getBoundingClientRect().right <= cell.getBoundingClientRect().right + 1 && units.scrollWidth <= units.clientWidth + 1; })`), 'phone listing unit summaries stay inside their cells')
      }
    }
    if (role === 'individual' && w === 390) {
      await b.hash('#/market')
      const market = await b.eval(`
        const card = document.querySelector('#home .card');
        const navTop = document.querySelector('#bnav').getBoundingClientRect().top;
        return ['.nm', '.price'].every(selector => {
          const bounds = card.querySelector(selector).getBoundingClientRect();
          return bounds.top >= 0 && bounds.bottom <= navTop;
        });`)
      ok(market, 'phone market shows the first offer name and price above the bottom navigation')
      ok(await b.eval(`return [...document.querySelectorAll('#home .card .dtype')].every(label => label.scrollWidth <= label.clientWidth + 1)`), 'phone cards show the full printed date type')
      await b.eval(`document.querySelector('#q').focus()`)
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      ok(await b.eval(`return document.activeElement.matches('#sform button[type=submit]:focus-visible')`), 'keyboard focus moves from the search field to its button and stays visible')
      await b.hash('#/item/l1')
      ok(await b.eval(`
        const top = selector => document.querySelector(selector).getBoundingClientRect().top;
        return top('.product-heading') < top('.pickup-facts') && top('.pickup-facts') < top('[data-act=reserve]')
          && top('[data-act=reserve]') < top('.product-gallery');`), 'phone shows pickup facts and Reserve before the gallery')
    }
    if (role === 'individual' && w <= 390) {
      await b.hash('#/item/l1')
      ok(await b.eval(`const rect = document.querySelector('#pickup-heading').getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= document.querySelector('#bnav').getBoundingClientRect().top`), `@${w}px: pickup details are immediately visible`)
      await b.eval(`const reserve = document.querySelector('[data-act=reserve]'); reserve.scrollIntoView({block:'center',behavior:'instant'});`)
      ok(await b.eval(`const reserve = document.querySelector('[data-act=reserve]'); const rect = reserve.getBoundingClientRect(); return rect.bottom < document.querySelector('#bnav').getBoundingClientRect().top && document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('button') === reserve`), `@${w}px: Reserve is reachable above the fixed bottom navigation`)
      const unread = w === 320 ? 123 : 22
      await b.eval(`
        const key = 'freshsave-app-v2';
        const state = JSON.parse(localStorage.getItem(key));
        const sample = state.notifs.find(notice => notice.user === state.session);
        for (const notice of state.notifs) notice.unread = false;
        state.notifs.push(...Array.from({length: ${unread}}, (_, index) => ({ ...sample, id: 'badge-test-' + index, unread: true })));
        localStorage.setItem(key, JSON.stringify(state));`)
      await b.reload()
      ok(await b.eval(`
        const button = document.querySelector('[data-act=npop]');
        const badge = button.querySelector('.dot');
        const count = badge.getBoundingClientRect();
        const bell = button.getBoundingClientRect();
        const account = document.querySelector('[data-act=mpop]').getBoundingClientRect();
        return count.left >= bell.left && count.right <= bell.right && count.right < account.left
          && badge.textContent.trim() === '${unread > 99 ? '99+' : unread}'
          && button.getAttribute('aria-label') === 'Notifications, ${unread} unread';`), `@${w}px: ${unread} unread notifications fit without overlapping the account button`)
      await b.hash('#/market?browse=1')
      await b.send('Emulation.setFocusEmulationEnabled', { enabled: true })
      await b.click('.filter-toggle')
      ok(await b.eval(`const drawer = document.querySelector('#filters'); return drawer.matches(':modal') && drawer.contains(document.activeElement)`), `@${w}px: opening filters moves focus into a modal`)
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      ok(await b.eval(`return document.querySelector('#filters').contains(document.activeElement)`), `@${w}px: Tab stays in filters`)
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
      await b.sleep(150)
      ok(await b.eval(`return !document.querySelector('#filters').open && document.activeElement.matches('.filter-toggle')`), `@${w}px: Escape closes filters and restores focus`)
    }
    ok(b.errors.length === 0, `${role} @${w}px: no JS errors` + (b.errors.length ? ' ' + b.errors[0] : ''))
    await b.close()
  }
}
const uniq = [...new Set(issues)]
console.log('Accessibility findings (1440px):', uniq.length ? '\n  ' + uniq.join('\n  ') : 'none')
ok(uniq.length === 0, 'no unnamed controls / unlabelled fields / missing alt / duplicate ids')
process.exit(done() ? 1 : 0)
