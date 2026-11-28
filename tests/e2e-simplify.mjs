// UX simplification pass: progressive disclosure, fewer competing actions, and that hidden detail still works.
import { session, ok, eq, done } from './e2e-lib.mjs'
const vis = (b, sel) => b.eval(`return [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e=>e.checkVisibility({checkVisibilityCSS:true,contentVisibilityAuto:true})).length`)
const inView = (b, sel) => b.eval(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight`)

console.log('Simplification: individual (Aisyah)')
let b = await session()
await b.login('aisyah@freshsave.my')
// Find food: one browse shortcut and no competing task strip.
eq(await vis(b, '[data-act=seeall]'), 1, 'marketplace home has a single Browse all shortcut')
ok(!(await b.text('#main')).includes('Track my food'), 'marketplace hero no longer competes with a second call to action')
ok(!(await b.has('.band.alt .rail')), '"Collect soon" rail (duplicate listings) removed from home')
ok(!(await b.text('#main')).includes('Sellers have 2 hours') || !(await vis(b, '.how')), 'pickup steps are collapsed by default')
await b.act('seeall'); await b.sleep(200)
ok(!(await b.has('#filters [data-f="cats"]')) && !(await b.has('#filters [data-f="dist"]')), 'filter panel no longer repeats category and distance from the top bar')
ok(!(await b.has('#filters details, #filters [name="collect"]')) && !(await b.text('#filters')).includes('Date type'), 'market filters no longer have a disclosure, Collect by, or Date type')
eq(await vis(b, '#filters [data-f="expiry"], #filters [data-f="min"], #filters [data-f="max"]'), 3, 'date and price filters are immediately available')
const allOffers = await b.eval(`return [...document.querySelectorAll('#results a.card')].map(card => card.href).sort()`)
await b.hash('#/market?browse=1&collect=0&dateType=use-by&sort=collect')
eq(await b.eval(`return [...document.querySelectorAll('#results a.card')].map(card => card.href).sort()`), allOffers, 'old collection and date type parameters do not hide any offers')
eq(await b.eval(`return document.querySelector('#sort').value`), 'collect', 'Collect soonest sorting remains available')
await b.type('#filters [data-f="expiry"]', '3')
ok((await b.eval(`return location.hash`)).includes('expiry=3'), 'printed date remains a filter')
await b.type('#filters [data-f="max"]', '5')
ok((await b.text('#results .tags')).includes('Up to RM5'), 'visible price fields still filter offers')
await b.act('freset')
ok(await b.eval(`return document.querySelector('#filters [data-f="expiry"]').value === 'all' && !document.querySelector('#filters [data-f="max"]').value`), 'Reset filters clears printed date and price')
// Today
await b.hash('#/dashboard')
ok(!(await b.has('.quick-acts')), 'Today has no buttons that repeat the header and nav')
ok((await vis(b, '.acts > li')) <= 3, 'Today shows at most three actions at once')
ok(!(await b.has('.fold, .dash-hello .kicker')), 'buyer Today removes the activity section and repeated label')
// My food: four tabs, three direct row actions, and one add entry point.
await b.hash('#/inventory?st=d7')
eq(await vis(b, '.tabs .tab'), 4, 'My food has four tabs')
eq(await b.eval(`return [...document.querySelectorAll('tbody tr:first-child .acts-cell > button')].map(b => b.dataset.s || b.dataset.act)`), ['consumed', 'invedit', 'discarded'], 'each row exposes Used, Edit and Discard in order')
ok(!(await b.has('tbody details.more, [data-act=invdel], #cta')) && await vis(b, '#main a[href="#/scan"]') === 1, 'the menu, Delete and duplicate Add food control are gone')
const filterWidth = () => b.eval(`return document.querySelector('.tbar summary').getBoundingClientRect().width`)
const closedWidth = await filterWidth()
await b.click('.tbar summary')
eq(await filterWidth(), closedWidth, 'Filter & sort keeps its width when opened')
await b.click('tbody tr:first-child [data-act=invdone][data-s=discarded]')
ok((await b.toastText()).includes('discarded') || (await b.modalOpen()), 'direct Discard works')
await b.hash('#/inventory?st=d1'); ok((await vis(b, '.tabs .tab.on')) === 1 && (await b.text('.tabs .tab.on')).includes('Use soon'), 'legacy within-1-day links land on Use soon')
// Scan
await b.hash('#/scan')
ok((await b.text('#main')).split('Simulated').length - 1 <= 2 && (await b.text('#main')).includes('Simulated scanning'), 'scan page states once that scanning is simulated')
eq(await vis(b, '[data-act=scan-sample]'), 3, 'clear, blurry and missing dates are directly selectable')
await b.act('scan-sample', '[data-id="milk"]')
ok(!(await b.has('.result .deflist')), 'confirm page no longer repeats the product details above the form')
ok(!(await vis(b, '#res-date')), 'purchase date is collapsed on the confirm page')
await b.eval(`const f=document.querySelector('#f-res'); document.querySelector('[data-b="res.ok"]').click(); f.requestSubmit()`); await b.sleep(400)
const st = await b.eval(`return JSON.parse(localStorage.getItem('freshsave-app-v2')).inventory[0]`)
ok(st.purchased === await b.eval(`return new Date().toLocaleDateString('en-CA')`), 'purchase date still defaults to today when collapsed')
await b.hash('#/notifications'); ok((await b.text('#main')).includes('while FreshSave is open'), 'notifications explain when optional device alerts work')
await b.hash('#/profile'); ok(!(await vis(b, '#f-pw input')), 'password fields are collapsed') ; ok((await b.text('#main')).includes('plain text'), 'plain-text password warning stays visible')
await b.close()

console.log('Simplification: retailer (Pak Din)')
b = await session()
await b.login('pakdin@freshsave.my')
ok((await b.text('#cta')).includes('Add stock'), 'header action follows the retailer workflow (add stock)')
await b.hash('#/dashboard')
ok(!(await b.has('.stats.snap')) && (await b.has('.snapline')), 'retailer Today uses one summary line instead of four tiles')
ok(!(await b.text('#main')).includes('Batches to count'), 'batch-count number is not repeated three times')
await b.hash('#/batches')
eq(await vis(b, '.tabs .tab'), 3, 'Stock has three tabs (To count, On Rescue, Finished)')
ok(!(await vis(b, '.note')), 'Stock has no stacked banners')
ok(!(await b.text('thead')).includes('Status') && !(await b.text('thead')).includes('Recorded'), 'To count table drops redundant columns')
await b.hash('#/batch/b7/list')
ok(!(await vis(b, '#bl-pickupUntil')), 'collection details are collapsed on the offer form')
ok((await b.text('#main')).includes('by '), 'collapsed section still summarises the collection window')
await b.type('#bl-remaining', '5'); await b.type('#bl-orig', '5'); await b.type('#bl-price', '2.5'); await b.type('#bl-pickupUntil', '')
await b.type('#bl-pack', 'sealed')
await b.check('[data-b="bl.c1"]'); await b.check('[data-b="bl.c2"]'); await b.check('[data-b="bl.c3"]')
await b.eval(`document.querySelector('#f-bl').requestSubmit()`); await b.sleep(300)
ok(await vis(b, '#bl-pickupUntil') === 1, 'collapsed section opens by itself when its field has an error')
await b.hash('#/listings')
ok((await b.text('.tabs .tab.on')).includes('Awaiting'), 'Listings opens on the tab that needs action')
ok(!(await vis(b, '.note')), 'Listings has no stacked banners')
ok(!(await b.text('thead')).includes('Reservations') && !(await b.text('thead')).includes('Price'), 'Listings table merges price and reservations into other columns')
ok(!(await vis(b, '[data-act=lremove]')), 'withdraw is behind the menu')
await b.hash('#/listings?tab=live'); await b.click('tbody tr:first-child details.more > summary'); ok(await vis(b, '[data-act=lremove]') === 1, 'withdraw is reachable from the menu')
ok(await inView(b, 'tbody tr:first-child .more-m'), 'listing menu stays inside the viewport')
await b.close()

console.log('Simplification: phone width (390px)')
b = await session({ width: 390, height: 844 })
await b.login('aisyah@freshsave.my')
await b.hash('#/inventory')
const mobileClosedWidth = await filterWidth()
await b.click('.tbar summary')
eq(await filterWidth(), mobileClosedWidth, 'Filter & sort keeps its width on a phone')
const category = '.tbar select:has(option[value=meat])'
await b.type(category, 'meat')
ok(await b.eval(`
  return ['.tbar .select-control:has(option[value=meat])', '.tbar .select-control:has(option[value=exp])'].every(selector => {
    const box = document.querySelector(selector + ' .sliding-label');
    const text = box.firstElementChild;
    const animation = text.getAnimations()[0];
    if (text.scrollWidth <= box.clientWidth || !animation) return false;
    animation.currentTime = animation.effect.getTiming().duration * 0.7;
    return text.getBoundingClientRect().right <= box.getBoundingClientRect().right + 1;
  });
`), 'long category and sort values slide far enough to reveal their ends')
await b.type(category, 'bakery')
ok(await b.eval(`return !document.querySelector('.tbar .select-control:has(option[value=meat]) .sliding-label').hasAttribute('data-sliding')`), 'a category that fits stays still')
await b.send('Emulation.setEmulatedMedia', { features: [{ name:'prefers-reduced-motion', value:'reduce' }] })
await b.type(category, 'meat')
ok(await b.eval(`
  const box = document.querySelector('.tbar .select-control:has(option[value=meat]) .sliding-label');
  return !box.hasAttribute('data-sliding') && !box.firstElementChild.getAnimations().length &&
    getComputedStyle(box.firstElementChild).textOverflow === 'ellipsis' &&
    box.previousElementSibling.selectedOptions[0].text === 'Meat, seafood & frozen';
`), 'reduced motion uses ellipsis and preserves the full native option')
await b.type(category, '')
ok(await b.eval(`
  const actions = document.querySelector('tbody tr:last-child .acts-cell');
  actions.scrollIntoView({block:'center', behavior:'instant'});
  const navTop = document.querySelector('#bnav').getBoundingClientRect().top;
  return [...actions.querySelectorAll('button')].every(button => {
    const box = button.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= navTop;
  });
`), 'all row actions fit above the bottom navigation on a phone')
eq(await b.overflow(), 0, 'no horizontal overflow on My food')
console.log('JS errors:', b.errors.length ? b.errors : 'none'); ok(b.errors.length === 0, 'no JavaScript errors')
await b.close()
process.exit(done() ? 1 : 0)
