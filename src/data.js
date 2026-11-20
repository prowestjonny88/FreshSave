// FreshSave – reference data and demo seed records (all values are sample data).

export const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: 'grid' },
  { id: 'produce', label: 'Fruits & Vegetables', icon: 'leaf' },
  { id: 'dairy', label: 'Dairy & Eggs', icon: 'milk' },
  { id: 'bakery', label: 'Bakery', icon: 'wheat' },
  { id: 'meat', label: 'Meat & Seafood', icon: 'fish' },
  { id: 'frozen', label: 'Frozen Food', icon: 'snow' },
  { id: 'pantry', label: 'Pantry & Groceries', icon: 'jar' },
  { id: 'drinks', label: 'Drinks', icon: 'milk' },
  { id: 'others', label: 'Others', icon: 'dots' },
]
// Pilot scope: only ambient (room-temperature), sealed, packaged food can be listed for rescue.
// Everything else (fresh, chilled, frozen, meat, eggs, dairy) can still be TRACKED but not listed.
export const RESCUE_CATS = ['pantry', 'bakery', 'drinks']
export const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Others'
export const CAT_KIND = { produce: 'veg', dairy: 'milk', bakery: 'bread', meat: 'chicken', frozen: 'nuggets', pantry: 'rice', drinks: 'juice', others: 'juice' }

export const LOCATIONS = [
  { id: 'bangsar', name: 'Bangsar, Kuala Lumpur', short: 'Bangsar', x: 0, y: 0, ll: [3.13, 101.671] },
  { id: 'montkiara', name: 'Mont Kiara, Kuala Lumpur', short: 'Mont Kiara', x: -1, y: -6, ll: [3.17, 101.651] },
  { id: 'damansara', name: 'Damansara Heights, KL', short: 'Damansara Heights', x: 1, y: -3, ll: [3.153, 101.664] },
  { id: 'ss2', name: 'SS2, Petaling Jaya', short: 'SS2, PJ', x: -6, y: 2, ll: [3.118, 101.622] },
  { id: 'cheras', name: 'Cheras, Kuala Lumpur', short: 'Cheras', x: 7, y: 4, ll: [3.106, 101.726] },
  { id: 'subang', name: 'Subang Jaya, Selangor', short: 'Subang Jaya', x: -14, y: 6, ll: [3.049, 101.581] },
]

// Seller pickup locations are fixed at registration (x/y on the demo map grid).
// ALL seed sellers are fictional. `sample` = no account behind them; `demo` = backed by a demo login.
export const SEED_SELLERS = {
  jaya: { id: 'jaya', sample: true, name: 'Telawi Fresh Mart', role: 'retailer', kind: 'Supermarket', area: 'Lot G-12, Jalan Telawi 3, Bangsar', x: 0.4, y: 0.3, hue: '#4f6f55', hours: 'Daily 9am – 9pm' },
  village: { id: 'village', sample: true, name: 'Kiara Pantry Mart', role: 'retailer', kind: 'Supermarket', area: 'Ground floor, Jalan Kiara 3, Mont Kiara', x: -1.2, y: -6.2, hue: '#8a6d1f', hours: 'Daily 9am – 9pm' },
  pakdin: { id: 'pakdin', demo: true, name: 'Kedai Runcit Pak Din', role: 'retailer', kind: 'Grocery store', area: 'No. 12, Jalan Kerinchi, Bangsar South, 59200 Kuala Lumpur', x: 0.8, y: 1.8, since: 2024, hue: '#5c6650', hours: 'Daily 10am – 9pm' },
  aminah: { id: 'aminah', sample: true, name: 'Roti Mama Aminah', role: 'retailer', kind: 'Bakery', area: '24, Jalan SS2/24, Petaling Jaya', x: -5.8, y: 2.4, hue: '#8b5e2b', hours: 'Tue – Sun 2pm – 6pm' },
  econ: { id: 'econ', sample: true, name: 'Cheras Jimat Mart', role: 'retailer', kind: 'Supermarket', area: 'Jalan Cheras, Taman Segar, Cheras', x: 7.5, y: 4.2, hue: '#3f6f6a', hours: 'Daily 8am – 9pm' },
  segar: { id: 'segar', sample: true, name: 'Segar Mart Subang', role: 'retailer', kind: 'Mini market', area: 'Jalan SS15/4, Subang Jaya', x: -13, y: 6.5, hue: '#4f6f55', hours: 'Daily 8am – 10pm' },
  aisyah: { id: 'aisyah', demo: true, name: 'Aisyah Rahman', role: 'individual', kind: 'Individual', area: 'Bangsar (not shown to others)', x: -0.6, y: -0.8, hue: '#4f6f55', hours: 'n/a' },
}

/* Product photography (Unsplash). v = crop variant for galleries. */
const PH = {
  milk: 'photo-1563636619-e9143da7973b', bread: 'photo-1549931319-a545dcf3bc73', strawb: 'photo-1587393855524-087f83d95bc9',
  banana: 'photo-1571771894821-ce9b6c11b08e', eggs: 'photo-1506976785307-8732e854ad03', salad: 'photo-1622122479356-b56d293407dc',
  veg: 'photo-1760108273106-63b58911a978', chicken: 'photo-1633096013004-e2cb4023b560', prawn: 'photo-1548587468-971ebe4c8c3b',
  juice: 'photo-1640213505284-21352ee0d76b', rice: 'photo-1686820740687-426a7b9b2043', yoghurt: 'photo-1571212515416-fef01fc43637',
  milo: 'photo-1542990253-0d0f5be5f0ed', oil: 'photo-1720468750623-39e9a09f5067', cake: 'photo-1632931057819-4eefffa8e007',
  crackers: 'photo-1691332663054-e05874913a3a', roti: 'photo-1708783741187-ff1d081d87da', noodles: 'photo-1612927601601-6638404737ce',
  nuggets: 'photo-1562967916-eb82221dfb92', soy: 'photo-1654245137394-1de7e1e16f6f', aisle: 'photo-1604719312566-8912e9227c6a',
}
export function photo(kind, v = 0, w = 640) {
  const id = PH[kind] || PH.rice
  const crop = v === 1 ? '&crop=focalpoint&fp-x=0.38&fp-y=0.45&fp-z=1.7' : v === 2 ? '&crop=focalpoint&fp-x=0.62&fp-y=0.6&fp-z=1.4' : ''
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${kind === 'aisle' ? Math.round(w * 1.25) : w}&q=70${crop}`
}

/* Demo product catalogue (stored in this browser only) – grows as you register products by barcode. */
export const SEED_CATALOGUE = [
  { barcode: '9556041610018', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', src: 'catalogue' },
  { barcode: '9556001062048', name: 'Milo Activ-Go Chocolate Malt Powder 1kg', cat: 'pantry', kind: 'milo', src: 'catalogue' },
  { barcode: '9557062311014', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', src: 'catalogue' },
  { barcode: '9556570310120', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', src: 'user', by: 'a sample user', ago: 40 },
  { barcode: '9556089450010', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', src: 'user', by: 'Kedai Runcit Pak Din', ago: 12 },
]

/* Prototype OCR scenarios (OCR is simulated – no real recognition runs). */
export const SCAN_SAMPLES = [
  { id: 'milk', label: 'Dutch Lady milk – clear label', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', result: 'success', et: 'use-by', exp: 4 },
  { id: 'bread', label: 'Gardenia bread – blurry label', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', result: 'uncertain', et: 'best-before', exp: 3 },
  { id: 'milo', label: 'Milo tin – date not visible', name: '', cat: '', kind: 'milo', result: 'failed', et: 'best-before', exp: null },
]

/* Pilot food rules. Seller declarations are NOT verified by FreshSave. */
export const ELIGIBILITY = [
  { id: 'sealed', label: 'Sealed, packaged food stored at room temperature', ok: true },
  { id: 'bakery', label: 'Sealed, labelled bakery item stored at room temperature', ok: true },
  { id: 'chilled', label: 'Chilled / refrigerated food (fresh dairy, juice, salad, ready meals)', ok: false, why: 'chilled food needs a cold chain that FreshSave cannot check' },
  { id: 'frozen', label: 'Frozen food', ok: false, why: 'frozen food needs a cold chain that FreshSave cannot check' },
  { id: 'raw', label: 'Raw meat, seafood or eggs', ok: false, why: 'raw animal products carry a higher food-safety risk' },
  { id: 'fresh', label: 'Fresh produce or loose / unlabelled items', ok: false, why: 'loose or fresh items have no sealed packaging or printed date' },
  { id: 'cooked', label: 'Cooked food or restaurant leftovers', ok: false, why: 'prepared food cannot be listed' },
  { id: 'infant', label: 'Infant formula, baby food or supplements', ok: false, why: 'these products are regulated and not suitable for this pilot' },
  { id: 'opened', label: 'Opened, damaged or leaking package', ok: false, why: 'packaging must be sealed and intact' },
]
export const EXP_TYPES = [
  { id: 'best-before', label: 'Best before', help: 'A quality date. Food is usually still safe a little after it, but may be past its best.' },
  { id: 'use-by', label: 'Use by', help: 'A safety date. Do not eat the food after this date.' },
]
export const expTypeLabel = (t) => (EXP_TYPES.find((x) => x.id === t) || EXP_TYPES[0]).label

/* Users (prototype only – stored in this browser; passwords are plain text, so never reuse a real one). */
export const SEED_USERS = [
  { id: 'u1', name: 'Aisyah Rahman', email: 'aisyah@freshsave.my', pw: 'demo1234', role: 'individual', sellerId: 'aisyah', loc: 'bangsar' },
  { id: 'u2', name: 'Kamarudin Ismail', email: 'pakdin@freshsave.my', pw: 'demo1234', role: 'retailer', sellerId: 'pakdin', loc: 'bangsar' },
]

// exp = days until the printed date, pu = last collection day (days from today), posted = hours ago,
// qty = units available when the seed is created (the ledger `total` is derived from it plus its reservations).
const L = (o) => ({ status: 'active', moved: true, photos: [], expiryType: 'best-before', pickFrom: '09:00', pickTo: '21:00', withdrawn: 0, ...o })
export const SEED_LISTINGS = [
  L({ id: 'l1', name: 'Dutch Lady UHT Full Cream Milk 1L', cat: 'drinks', kind: 'milk', seller: 'jaya', orig: 7.9, price: 4.5, qty: 11, exp: 5, pu: 4, posted: 3, pack: 'sealed', desc: 'Long-life (UHT) milk in sealed cartons, kept on an ambient shelf. Short-dated stock, still within its best-before date.', instr: 'Collect from the Customer Service Counter. Show your pickup code to the staff member.' }),
  L({ id: 'l2', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', seller: 'village', orig: 3.9, price: 1.8, qty: 18, exp: 2, pu: 1, posted: 5, pack: 'bakery', desc: 'Sealed sandwich loaf with printed best-before date. Kept on an ambient shelf. Freezes well at home.', instr: 'Collect from Customer Service. Mention FreshSave and show your pickup code.' }),
  L({ id: 'l3', name: 'Hup Seng Cream Crackers 428g', cat: 'pantry', kind: 'crackers', seller: 'jaya', orig: 6.9, price: 3.5, qty: 9, exp: 9, pu: 8, posted: 2, pack: 'sealed', desc: 'Sealed packs, best-before in about a week.', instr: 'Collect from the Customer Service Counter. Show your pickup code.' }),
  L({ id: 'l4', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', seller: 'segar', orig: 6.5, price: 3.9, qty: 15, exp: 8, pu: 7, posted: 8, pack: 'sealed', desc: 'Sealed multipack, dry noodles.', instr: 'Collect at the cashier counter. Show your pickup code.', pickFrom: '08:00', pickTo: '22:00' }),
  L({ id: 'l5', name: "Yeo's Chrysanthemum Tea 250ml x 6 (UHT packs)", cat: 'drinks', kind: 'juice', seller: 'econ', orig: 9.9, price: 5.5, qty: 6, exp: 6, pu: 5, posted: 6, pack: 'sealed', desc: 'Sealed 6-pack of long-life drink cartons.', instr: 'Collect at the Customer Service desk with your pickup code.', pickFrom: '08:00' }),
  L({ id: 'l6', name: 'Milo Activ-Go Chocolate Malt Powder 450g (refill pack)', cat: 'pantry', kind: 'milo', seller: 'pakdin', orig: 12.9, price: 8.0, qty: 12, exp: 6, pu: 5, posted: 20, pack: 'sealed', batchId: 'b6', desc: 'Sealed refill packs, best-before in under a week.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your pickup code.', pickFrom: '10:00' }),
  L({ id: 'l9', name: 'Nescafé Classic Instant Coffee 100g jar', cat: 'drinks', kind: 'milo', seller: 'village', orig: 14.9, price: 8.9, qty: 9, exp: 11, pu: 9, posted: 12, pack: 'sealed', desc: 'Sealed jars with intact safety seal.', instr: 'Show your pickup code at Customer Service.' }),
  L({ id: 'l11', name: 'Faiza Basmathi Rice 5kg', cat: 'pantry', kind: 'rice', seller: 'econ', orig: 32.9, price: 21.0, qty: 4, exp: 7, pu: 6, posted: 30, pack: 'sealed', desc: 'Sealed 5kg bag approaching its best-before date.', instr: 'Collect from the service desk with your pickup code.', pickFrom: '08:00' }),
  L({ id: 'l14', name: 'Kek Pisang Banana Cake (sealed, labelled box)', cat: 'bakery', kind: 'cake', seller: 'aminah', orig: 18.0, price: 9.0, qty: 3, exp: 2, pu: 1, posted: 2, pack: 'bakery', expiryType: 'use-by', desc: 'Whole banana cake baked yesterday, sealed in a box labelled with ingredients and a use-by date. Not refrigerated.', instr: 'Collect at the shop counter.', pickFrom: '14:00', pickTo: '18:00' }),
  L({ id: 'l15', name: 'Seri Murni Cooking Oil 2kg', cat: 'pantry', kind: 'oil', seller: 'village', orig: 17.5, price: 11.5, qty: 6, exp: 6, pu: 5, posted: 40, pack: 'sealed', desc: 'Sealed bottle approaching its best-before date.', instr: 'Show your pickup code at Customer Service.' }),
  // Kedai Runcit Pak Din (retailer demo account)
  L({ id: 'm1', name: 'Gardenia Wholemeal Bread 400g', cat: 'bakery', kind: 'bread', seller: 'pakdin', orig: 4.2, price: 2.0, qty: 6, exp: 2, pu: 1, posted: 0.3, status: 'pending', moved: false, pack: 'bakery', batchId: 'b2', desc: 'Sealed wholemeal loaf, kept on an ambient shelf.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your pickup code.', pickFrom: '10:00' }),
  L({ id: 'm2', name: 'ABC Kicap Manis 600ml', cat: 'pantry', kind: 'soy', seller: 'pakdin', orig: 7.9, price: 4.0, qty: 0, exp: 20, pu: 14, posted: 26, pack: 'sealed', batchId: 'b3', desc: 'Sealed bottle, label slightly scuffed.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your pickup code.', pickFrom: '10:00' }),
  L({ id: 'm3', name: 'Gardenia Raisin Loaf 400g', cat: 'bakery', kind: 'bread', seller: 'pakdin', orig: 4.5, price: 2.2, qty: 0, exp: 1, pu: 0, posted: 72, pack: 'bakery', batchId: 'b4', desc: 'Sealed raisin loaf, ambient shelf.', instr: 'Ask at the cashier for the FreshSave Clearance Basket.', pickFrom: '10:00' }),
  L({ id: 'm4', name: "Jacob's Cream Crackers 428g", cat: 'pantry', kind: 'crackers', seller: 'pakdin', orig: 6.5, price: 3.0, qty: 5, exp: -2, pu: -2, posted: 140, pack: 'sealed', batchId: 'b5', desc: 'Sealed tin.', instr: 'Ask at the cashier for the FreshSave Clearance Basket.', pickFrom: '10:00' }),
]

// d = days from today for expiry; rec/pur = days ago recorded/purchased; et = date type printed on pack
export const SEED_INVENTORY = [
  { id: 'i1', owner: 'u1', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', qty: 2, pur: 5, d: 1, et: 'use-by' },
  { id: 'i2', owner: 'u1', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', qty: 1, pur: 2, d: 3, et: 'best-before' },
  { id: 'i3', owner: 'u1', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', qty: 1, pur: 4, d: 6, et: 'best-before' },
  { id: 'i4', owner: 'u1', name: 'Marigold Natural Yoghurt 4 x 100g', cat: 'dairy', kind: 'yoghurt', qty: 1, pur: 9, d: -1, et: 'use-by' },
  { id: 'i5', owner: 'u1', name: 'Cameron Highlands Strawberries 250g', cat: 'produce', kind: 'strawb', qty: 1, pur: 2, d: 0, et: 'use-by' },
  { id: 'i6', owner: 'u1', name: 'Milo Activ-Go Chocolate Malt Powder 1kg', cat: 'pantry', kind: 'milo', qty: 1, pur: 30, d: 120, et: 'best-before' },
  { id: 'i7', owner: 'u1', name: 'Ayamas Chicken Nuggets 800g', cat: 'frozen', kind: 'nuggets', qty: 1, pur: 10, d: 45, et: 'best-before' },
  { id: 'i8', owner: 'u1', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', qty: 2, pur: 14, d: 160, et: 'best-before' },
  { id: 'i9', owner: 'u1', name: 'Massimo Sandwich Loaf 400g', cat: 'bakery', kind: 'bread', qty: 1, pur: 8, d: -3, et: 'best-before', status: 'consumed', closed: 4 },
  { id: 'i10', owner: 'u1', name: 'Mixed Salad Greens Pack 200g', cat: 'produce', kind: 'salad', qty: 1, pur: 9, d: -2, et: 'use-by', status: 'discarded', closed: 2 },
]

// qty = units RECEIVED. `counted` = units physically counted on the shelf when the listing was made.
export const SEED_BATCHES = [
  { id: 'b1', owner: 'u2', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', qty: 20, rec: 12, d: 2, et: 'use-by', verify: 'unverified' },
  { id: 'b2', owner: 'u2', name: 'Gardenia Wholemeal Bread 400g', cat: 'bakery', kind: 'bread', qty: 15, rec: 3, d: 2, et: 'best-before', verify: 'listed', counted: 6 },
  { id: 'b3', owner: 'u2', name: 'ABC Kicap Manis 600ml', cat: 'pantry', kind: 'soy', qty: 10, rec: 40, d: 20, et: 'best-before', verify: 'listed', counted: 5 },
  { id: 'b4', owner: 'u2', name: 'Gardenia Raisin Loaf 400g', cat: 'bakery', kind: 'bread', qty: 12, rec: 10, d: 1, et: 'best-before', verify: 'listed', counted: 6 },
  { id: 'b5', owner: 'u2', name: "Jacob's Cream Crackers 428g", cat: 'pantry', kind: 'crackers', qty: 24, rec: 60, d: -2, et: 'best-before', verify: 'listed', counted: 5 },
  { id: 'b6', owner: 'u2', name: 'Milo Activ-Go Chocolate Malt Powder 450g (refill pack)', cat: 'pantry', kind: 'milo', qty: 30, rec: 8, d: 6, et: 'best-before', verify: 'listed', counted: 16 },
  { id: 'b7', owner: 'u2', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', qty: 30, rec: 25, d: 5, et: 'best-before', verify: 'unverified' },
  { id: 'b8', owner: 'u2', name: 'Milo 3-in-1 Sachets 18 x 33g', cat: 'pantry', kind: 'milo', qty: 12, rec: 20, d: 9, et: 'best-before', verify: 'dismissed', counted: 0 },
  { id: 'b9', owner: 'u2', name: 'Massimo Sandwich Loaf 400g', cat: 'bakery', kind: 'bread', qty: 18, rec: 2, d: 3, et: 'best-before', verify: 'unverified' },
  { id: 'b10', owner: 'u2', name: 'Marigold Peel Fresh Orange Juice 1L', cat: 'drinks', kind: 'juice', qty: 8, rec: 6, d: 14, et: 'use-by', verify: 'unverified' },
]
// Which listing came from which batch (for seed linking).
export const SEED_BATCH_LINKS = { b2: 'm1', b3: 'm2', b4: 'm3', b5: 'm4', b6: 'l6' }

// SAMPLE records only: every buyer below is fictional and none of these handovers really happened.
// created = hours relative to now; collected = days ago. pin = pickup code shown to the buyer only.
export const SEED_RESERVATIONS = [
  { id: 'r1', listingId: 'l6', qty: 2, status: 'pending', buyerId: 'x1', buyerName: 'Nurul Ain A.', ref: 'FS-4K7Q', pin: '4073', created: -0.5 },
  { id: 'r2', listingId: 'm2', qty: 3, status: 'confirmed', buyerId: 'x2', buyerName: 'Daniel Tan', ref: 'FS-9PD2', pin: '9020', created: -5 },
  { id: 'r3', listingId: 'm3', qty: 6, status: 'completed', buyerId: 'x3', buyerName: 'Priya Nair', ref: 'FS-2LM8', pin: '2288', created: -50, collected: 2 },
  { id: 'r4', listingId: 'l6', qty: 2, status: 'completed', buyerId: 'x4', buyerName: 'Lim Mei Ling', ref: 'FS-7HX3', pin: '7319', created: -230, collected: 9 },
  { id: 'r5', listingId: 'l2', qty: 2, status: 'completed', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-K2W9', pin: '5512', created: -110, collected: 4 },
  { id: 'r6', listingId: 'l3', qty: 1, status: 'confirmed', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-P8DN', pin: '3847', created: -2 },
  { id: 'r7', listingId: 'l9', qty: 1, status: 'cancelled', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-3QTR', pin: '6150', created: -70, by: 'buyer' },
  { id: 'r8', listingId: 'l1', qty: 1, status: 'completed', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-M6CE', pin: '8264', created: -420, collected: 17 },
  { id: 'r9', listingId: 'm2', qty: 2, status: 'completed', buyerId: 'x5', buyerName: 'Ahmad Faiz', ref: 'FS-B4NK', pin: '1096', created: -380, collected: 16 },
  { id: 'r10', listingId: 'l15', qty: 1, status: 'expired', reason: 'not-collected', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-V2HT', pin: '7741', created: -80 },
  { id: 'r11', listingId: 'l11', qty: 1, status: 'declined', buyerId: 'u1', buyerName: 'Aisyah Rahman', ref: 'FS-D9RA', pin: '2905', created: -30, by: 'seller' },
]
