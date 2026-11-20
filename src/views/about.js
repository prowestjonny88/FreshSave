// About this prototype: what is real, what is simulated, the pilot food rules and the reservation policy.
import { ic, POLICY, ELIGIBILITY, EXP_TYPES } from '../core.js'

const row = (a, b, c) => `<tr><th scope="row">${a}</th><td><span class="sp ${c}">${c === 'g' ? 'Works' : c === 'y' ? 'Local only' : 'Simulated'}</span></td><td>${b}</td></tr>`
export function aboutBody() {
  return `<div class="about">
  <div class="pagehead"><div><span class="kicker">Read me first</span><h1>About this prototype</h1><p class="mute">FreshSave has two halves: <b>Track</b> (expiry dates for food you own) and <b>Rescue</b> (a pickup marketplace for sealed surplus food). This build is a design prototype with synthetic data.</p></div></div>
  <section class="box"><h2>What is real, local or simulated</h2>
    <table class="tbl plain"><thead><tr><th>Area</th><th>Status</th><th>Detail</th></tr></thead><tbody>
    ${row('Accounts &amp; passwords', 'Stored as plain text in this browser. No real login security. Never use a real password or real personal data.', 'y')}
    ${row('Data storage', "Everything lives in this browser's local storage. Two devices never share data, so a buyer on one phone cannot reserve from a shop on another.", 'y')}
    ${row('Sellers &amp; listings', 'Every seller except the two demo logins is fictional sample data. Brand names appear only as examples; no shop or brand is a partner.', 'y')}
    ${row('Photo scanning (OCR)', 'No camera opens and no text is read. The outcome is picked on the Scan page. You always confirm the date yourself.', 'o')}
    ${row('Barcode lookup', 'A tiny demo catalogue plus products you register on this browser. Check digits are validated.', 'y')}
    ${row('Reminders &amp; notifications', 'In-app only, created when the app is open. No push, SMS or email, so they can arrive late.', 'y')}
    ${row('Messages', 'A simulated chat with automatic demo replies. Nobody reads your messages.', 'o')}
    ${row('Distances', 'Estimated between sample neighbourhood points, not between you and the shop. “Within ~5 km” is not a measured radius.', 'o')}
    ${row('Reservations &amp; timers', 'Real logic: unit accounting, locked terms, deadlines and automatic expiry (checked on every screen and once a minute while the app is open).', 'g')}
    ${row('Handover record', 'The seller enters the buyer\'s 4-digit pickup code. This is a record kept in the browser, not independent proof that food changed hands or was paid for.', 'y')}
    ${row('Activity numbers', 'Counts of records in this browser. Sample, simulated and disputed handovers are excluded. No waste, CO₂ or savings are estimated.', 'g')}
    </tbody></table></section>
  <section class="box"><h2>Pilot food rules</h2>
    <p>Only <b>sealed, packaged food that is safe at room temperature</b> can be listed on Rescue. Everything can still be tracked in Track.</p>
    <div class="two"><div><h3>Accepted</h3><ul class="tips">${ELIGIBILITY.filter((x) => x.ok).map((x) => `<li>${x.label}</li>`).join('')}</ul></div><div><h3>Not accepted</h3><ul class="tips">${ELIGIBILITY.filter((x) => !x.ok).map((x) => `<li>${x.label}</li>`).join('')}</ul></div></div>
    <h3 style="margin-top:14px">Date types</h3><ul class="tips">${EXP_TYPES.map((t) => `<li><b>${t.label}:</b> ${t.help}</li>`).join('')}<li>Food past its printed date can never be listed or handed over. “Use by” food must be collected at least ${POLICY.useByBufferDays} day before its date.</li></ul>
    <h3 style="margin-top:14px">Who is responsible</h3><ul class="tips"><li><b>Seller:</b> declares the pack is sealed, intact, room-temperature safe and that the date is correct. These declarations are <b>not verified</b> by FreshSave.</li><li><b>Buyer:</b> checks the seal, date, date type and allergen label at pickup and declines anything that looks different.</li><li><b>FreshSave:</b> does not inspect, test or certify food and cannot mediate disputes in this prototype.</li></ul></section>
  <section class="box"><h2>How a reservation works</h2>
    <ol class="how plain"><li><b>1</b><div><h3>Request</h3><p>Units are held straight away. Price, date, seller and pickup details are copied into the reservation and never change afterwards, even if the listing is edited.</p></div></li><li><b>2</b><div><h3>Seller responds</h3><p>Within ${POLICY.respondH} hours. If not, the request expires and the units are released.</p></div></li><li><b>3</b><div><h3>Hold</h3><p>After acceptance, units are held for at most ${POLICY.holdH} hours and never beyond the seller's collection window. Nothing can be reserved within ${POLICY.leadMin} minutes of the window closing.</p></div></li><li><b>4</b><div><h3>Handover</h3><p>The buyer shows a 4-digit code; the seller enters it. Buyers cannot complete their own collection. If the deadline passes, the reservation expires and units are released.</p></div></li></ol>
    <p class="mute sm">Cancelled, declined and expired reservations release their units automatically: units are never edited by hand, so stock cannot go negative or be allocated twice. Payment is always in person; there is no delivery.</p></section>
  <section class="box"><h2>Open questions for a real pilot</h2><ul class="tips"><li>Real accounts, a shared database and seller verification are required before any real food or real people are involved.</li><li>Whether individuals may ever list food (this prototype allows retailers only).</li><li>Whether chilled and frozen items could join later with a verifiable cold-chain process.</li></ul></section>
  </div>`
}
export const routes = { about: () => aboutBody() }
