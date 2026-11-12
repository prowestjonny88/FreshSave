// FreshSave – reference data and demo seed records (all values are sample data).

export const CATEGORIES = [
  { id: 'all', label: 'All Items', icon: 'grid' },
  { id: 'produce', label: 'Fruits & Vegetables', icon: 'leaf' },
  { id: 'dairy', label: 'Dairy & Eggs', icon: 'milk' },
  { id: 'bakery', label: 'Bakery', icon: 'wheat' },
  { id: 'meat', label: 'Meat & Seafood', icon: 'fish' },
  { id: 'frozen', label: 'Frozen Food', icon: 'snow' },
  { id: 'pantry', label: 'Pantry & Groceries', icon: 'jar' },
  { id: 'others', label: 'Others', icon: 'dots' },
]
export const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || 'Others'
export const CAT_KIND = { produce: 'veg', dairy: 'milk', bakery: 'bread', meat: 'chicken', frozen: 'nuggets', pantry: 'rice', others: 'juice' }

export const LOCATIONS = [
  { id: 'bangsar', name: 'Bangsar, Kuala Lumpur', short: 'Bangsar', x: 0, y: 0, ll: [3.13, 101.671] },
  { id: 'montkiara', name: 'Mont Kiara, Kuala Lumpur', short: 'Mont Kiara', x: -1, y: -6, ll: [3.17, 101.651] },
  { id: 'damansara', name: 'Damansara Heights, KL', short: 'Damansara Heights', x: 1, y: -3, ll: [3.153, 101.664] },
  { id: 'ss2', name: 'SS2, Petaling Jaya', short: 'SS2, PJ', x: -6, y: 2, ll: [3.118, 101.622] },
  { id: 'cheras', name: 'Cheras, Kuala Lumpur', short: 'Cheras', x: 7, y: 4, ll: [3.106, 101.726] },
  { id: 'subang', name: 'Subang Jaya, Selangor', short: 'Subang Jaya', x: -14, y: 6, ll: [3.049, 101.581] },
]

// Seller pickup locations are fixed at registration (x/y on the demo map grid).
export const SEED_SELLERS = {
  jaya: { id: 'jaya', name: 'Jaya Grocer Bangsar Village', role: 'retailer', kind: 'Supermarket', area: 'Bangsar Village II, Jalan Telawi 1, Bangsar', x: 0.4, y: 0.3, since: 2023, hue: '#4f6f55', hours: 'Daily 9am – 10pm' },
  village: { id: 'village', name: 'Village Grocer Mont Kiara', role: 'retailer', kind: 'Supermarket', area: 'Plaza Mont Kiara, Jalan Kiara', x: -1.2, y: -6.2, since: 2023, hue: '#8a6d1f', hours: 'Daily 9am – 10pm' },
  pakdin: { id: 'pakdin', name: 'Kedai Runcit Pak Din', role: 'retailer', kind: 'Grocery store', area: 'No. 12, Jalan Kerinchi, Bangsar South, 59200 Kuala Lumpur', x: 0.8, y: 1.8, since: 2024, hue: '#5c6650', hours: 'Daily 7am – 11pm' },
  aminah: { id: 'aminah', name: 'Roti Mama Aminah', role: 'retailer', kind: 'Bakery', area: '24, Jalan SS2/24, Petaling Jaya', x: -5.8, y: 2.4, since: 2024, hue: '#8b5e2b', hours: 'Tue – Sun 7am – 6pm' },
  econ: { id: 'econ', name: 'Econsave Cheras', role: 'retailer', kind: 'Supermarket', area: 'Jalan Cheras, Taman Segar, Cheras', x: 7.5, y: 4.2, since: 2022, hue: '#3f6f6a', hours: 'Daily 8am – 10pm' },
  segar: { id: 'segar', name: 'Segar Mart Subang', role: 'retailer', kind: 'Mini market', area: 'Jalan SS15/4, Subang Jaya', x: -13, y: 6.5, since: 2025, hue: '#4f6f55', hours: 'Daily 7am – 11pm' },
  siti: { id: 'siti', name: 'Siti Nurhaliza R.', role: 'individual', kind: 'Individual', area: 'Residensi Damansara lobby, Bukit Damansara', x: 0.8, y: -3.4, since: 2025, hue: '#8a6d1f', hours: 'By arrangement' },
  aisyah: { id: 'aisyah', name: 'Aisyah Rahman', role: 'individual', kind: 'Individual', area: 'Menara Maarof guardhouse, Jalan Maarof, Bangsar', x: -0.6, y: -0.8, since: 2025, hue: '#4f6f55', hours: 'By arrangement' },
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

/* Shared product catalogue – grows as users register products by barcode. */
export const SEED_CATALOGUE = [
  { barcode: '9556041610016', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', src: 'catalogue' },
  { barcode: '9556001062043', name: 'Milo Activ-Go Chocolate Malt Powder 1kg', cat: 'pantry', kind: 'milo', src: 'catalogue' },
  { barcode: '9557062311011', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', src: 'catalogue' },
  { barcode: '9556570310126', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', src: 'user', by: 'a FreshSave user', ago: 40 },
  { barcode: '9556089450016', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', src: 'user', by: 'Kedai Runcit Pak Din', ago: 12 },
]

/* Prototype OCR scenarios (OCR is simulated – no real recognition runs). */
export const SCAN_SAMPLES = [
  { id: 'milk', label: 'Dutch Lady milk – clear label', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', result: 'success', conf: 96, exp: 4 },
  { id: 'bread', label: 'Gardenia bread – blurry label', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', result: 'uncertain', conf: 58, exp: 3 },
  { id: 'milo', label: 'Milo tin – date not visible', name: '', cat: '', kind: 'milo', result: 'failed', conf: 0, exp: null },
]

export const ELIGIBILITY = [
  { id: 'unopened', label: 'Unopened packaged food', ok: true },
  { id: 'stored', label: 'Safely stored packaged goods', ok: true },
  { id: 'bakery', label: 'Sealed bakery product', ok: true },
  { id: 'cooked', label: 'Cooked food or restaurant leftovers', ok: false },
  { id: 'loose', label: 'Unpackaged or loose food', ok: false },
  { id: 'opened', label: 'Opened food package', ok: false },
]

/* Users (prototype only – stored in this browser). */
export const SEED_USERS = [
  { id: 'u1', name: 'Aisyah Rahman', email: 'aisyah@freshsave.my', pw: 'demo1234', role: 'individual', sellerId: 'aisyah', loc: 'bangsar' },
  { id: 'u2', name: 'Kamarudin Ismail', email: 'pakdin@freshsave.my', pw: 'demo1234', role: 'retailer', sellerId: 'pakdin', loc: 'bangsar' },
]

const L = (o) => ({ status: 'active', clearance: 'In Clearance Basket', photos: [], ...o })
// exp = days until expiry, posted = hours ago
export const SEED_LISTINGS = [
  L({ id: 'l1', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', seller: 'jaya', orig: 7.9, price: 4.5, qty: 11, exp: 2, posted: 3, pack: 'unopened', desc: 'UHT full cream milk, sealed cartons. Short-dated stock from the chiller shelf, within date.', instr: 'Collect from the Customer Service Counter, Level G (9am – 10pm). Show your reservation code.' }),
  L({ id: 'l2', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', seller: 'village', orig: 3.9, price: 1.8, qty: 18, exp: 1, posted: 5, pack: 'bakery', desc: 'Sealed sandwich loaf, best before tomorrow. Freezes well.', instr: 'Collect from Customer Service, Ground Floor. Mention FreshSave and your code.' }),
  L({ id: 'l3', name: 'Cameron Highlands Strawberries 250g (sealed punnet)', cat: 'produce', kind: 'strawb', seller: 'jaya', orig: 12.9, price: 6.9, qty: 7, exp: 1, posted: 2, pack: 'unopened', desc: 'Sealed punnet, kept chilled. Best eaten within a day.', instr: 'Collect from the Customer Service Counter, Level G. Kept in the chiller section of the Clearance Basket.' }),
  L({ id: 'l4', name: 'Del Monte Bananas Pre-packed 1kg', cat: 'produce', kind: 'banana', seller: 'segar', orig: 6.5, price: 2.9, qty: 15, exp: 3, posted: 8, pack: 'unopened', desc: 'Sealed retail pack, ripe and ready to eat.', instr: 'Collect at the cashier counter. Show your reservation code.' }),
  L({ id: 'l5', name: 'Mixed Salad Greens Pack 200g', cat: 'produce', kind: 'salad', seller: 'econ', orig: 8.9, price: 3.9, qty: 6, exp: 1, posted: 6, pack: 'unopened', desc: 'Washed salad leaves in a sealed bag. Keep refrigerated.', instr: 'Collect at the Customer Service desk with your code.' }),
  L({ id: 'l6', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', seller: 'pakdin', orig: 14.5, price: 8.9, qty: 12, exp: 6, posted: 20, pack: 'unopened', batchId: 'b6', desc: 'Grade A eggs in a sealed carton, stored at room temperature.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your code.' }),
  L({ id: 'l7', name: 'Ayamas Chicken Breast 500g (sealed tray)', cat: 'meat', kind: 'chicken', seller: 'econ', orig: 11.9, price: 6.5, qty: 5, exp: 0, posted: 4, pack: 'unopened', desc: 'Chilled chicken breast in a sealed tray. Cook or freeze today.', instr: 'Collect at the meat counter. Bring a cooler bag if possible.' }),
  L({ id: 'l8', name: 'Frozen Tiger Prawns 500g', cat: 'meat', kind: 'prawn', seller: 'segar', orig: 24.9, price: 13.9, qty: 7, exp: 5, posted: 7, pack: 'stored', desc: 'Frozen, sealed pack. Stored at -18°C.', instr: 'Collect at the cashier counter. Items are held in the freezer.' }),
  L({ id: 'l9', name: 'Marigold Peel Fresh Orange Juice 1L', cat: 'others', kind: 'juice', seller: 'village', orig: 8.5, price: 4.9, qty: 9, exp: 4, posted: 12, pack: 'unopened', desc: 'Chilled orange juice, sealed. Keep refrigerated.', instr: 'Show your code at Customer Service.' }),
  L({ id: 'l10', name: 'Ayamas Chicken Nuggets 800g', cat: 'frozen', kind: 'nuggets', seller: 'jaya', orig: 19.9, price: 11.9, qty: 9, exp: 7, posted: 20, pack: 'stored', desc: 'Frozen and sealed. Outer box slightly dented, inner pack intact.', instr: 'Collect from the Customer Service Counter, Level G.' }),
  L({ id: 'l11', name: 'Faiza Basmathi Rice 5kg', cat: 'pantry', kind: 'rice', seller: 'econ', orig: 32.9, price: 21.0, qty: 4, exp: 7, posted: 30, pack: 'unopened', desc: 'Sealed 5kg bag approaching its best-before date.', instr: 'Collect from the service desk with your code.' }),
  L({ id: 'l12', name: 'Marigold Natural Yoghurt 4 x 100g', cat: 'dairy', kind: 'yoghurt', seller: 'siti', orig: 7.2, price: 3.0, qty: 3, exp: 1, posted: 1, pack: 'unopened', desc: 'Unopened multipack, kept refrigerated since purchase.', instr: 'Pickup at the Residensi Damansara lobby. Message to arrange a time.' }),
  L({ id: 'l13', name: 'Kawan Roti Canai Frozen 20 pcs', cat: 'frozen', kind: 'roti', seller: 'econ', orig: 10.9, price: 5.5, qty: 14, exp: 5, posted: 9, pack: 'stored', desc: 'Frozen, sealed family pack. Cook from frozen in 3 minutes.', instr: 'Collect at Customer Service. Held in the freezer basket.' }),
  L({ id: 'l14', name: 'Kek Pisang Banana Cake (sealed box)', cat: 'bakery', kind: 'cake', seller: 'aminah', orig: 18.0, price: 9.0, qty: 3, exp: 1, posted: 2, pack: 'bakery', desc: 'Whole banana cake, baked and sealed in a labelled box yesterday.', instr: 'Collect at the shop counter, 2pm – 6pm.' }),
  L({ id: 'l15', name: 'Seri Murni Cooking Oil 2kg', cat: 'pantry', kind: 'oil', seller: 'village', orig: 17.5, price: 11.5, qty: 6, exp: 6, posted: 40, pack: 'unopened', desc: 'Sealed bottle approaching its best-before date.', instr: 'Show your code at Customer Service.' }),
  // Kedai Runcit Pak Din (retailer demo account)
  L({ id: 'm1', name: 'Gardenia Wholemeal Bread 400g', cat: 'bakery', kind: 'bread', seller: 'pakdin', orig: 4.2, price: 2.0, qty: 6, exp: 2, posted: 0.3, status: 'pending', clearance: 'Awaiting Physical Transfer', pack: 'bakery', batchId: 'b2', desc: 'Sealed wholemeal loaf.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your code.' }),
  L({ id: 'm2', name: 'ABC Kicap Manis 600ml', cat: 'pantry', kind: 'soy', seller: 'pakdin', orig: 7.9, price: 4.0, qty: 0, exp: 20, posted: 26, clearance: 'Reserved', pack: 'unopened', batchId: 'b3', desc: 'Sealed bottle, label slightly scuffed.', instr: 'Ask at the cashier for the FreshSave Clearance Basket and show your code.' }),
  L({ id: 'm3', name: 'Marigold Natural Yoghurt 4 x 100g', cat: 'dairy', kind: 'yoghurt', seller: 'pakdin', orig: 7.2, price: 3.5, qty: 0, exp: 1, posted: 72, status: 'completed', clearance: 'Collected', pack: 'unopened', batchId: 'b4', desc: 'Unopened multipack, refrigerated.', instr: 'Ask at the cashier for the FreshSave Clearance Basket.' }),
  L({ id: 'm4', name: "Jacob's Cream Crackers 428g", cat: 'pantry', kind: 'crackers', seller: 'pakdin', orig: 6.5, price: 3.0, qty: 5, exp: -2, posted: 140, pack: 'unopened', batchId: 'b5', desc: 'Sealed tin.', instr: 'Ask at the cashier for the FreshSave Clearance Basket.' }),
]

// d = days from today for expiry; rec/pur = days ago recorded/purchased
export const SEED_INVENTORY = [
  { id: 'i1', owner: 'u1', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', qty: 2, pur: 5, d: 1 },
  { id: 'i2', owner: 'u1', name: 'Gardenia Original Classic Bread 400g', cat: 'bakery', kind: 'bread', qty: 1, pur: 2, d: 3 },
  { id: 'i3', owner: 'u1', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', qty: 1, pur: 4, d: 6 },
  { id: 'i4', owner: 'u1', name: 'Marigold Natural Yoghurt 4 x 100g', cat: 'dairy', kind: 'yoghurt', qty: 1, pur: 9, d: -1 },
  { id: 'i5', owner: 'u1', name: 'Cameron Highlands Strawberries 250g', cat: 'produce', kind: 'strawb', qty: 1, pur: 2, d: 0 },
  { id: 'i6', owner: 'u1', name: 'Milo Activ-Go Chocolate Malt Powder 1kg', cat: 'pantry', kind: 'milo', qty: 1, pur: 30, d: 120 },
  { id: 'i7', owner: 'u1', name: 'Ayamas Chicken Nuggets 800g', cat: 'frozen', kind: 'nuggets', qty: 1, pur: 10, d: 45 },
  { id: 'i8', owner: 'u1', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', qty: 2, pur: 14, d: 160 },
  { id: 'i9', owner: 'u1', name: 'Massimo Sandwich Loaf 400g', cat: 'bakery', kind: 'bread', qty: 1, pur: 8, d: -3, status: 'consumed', closed: 4 },
  { id: 'i10', owner: 'u1', name: 'Mixed Salad Greens Pack 200g', cat: 'produce', kind: 'salad', qty: 1, pur: 9, d: -2, status: 'discarded', closed: 2 },
]

export const SEED_BATCHES = [
  { id: 'b1', owner: 'u2', name: 'Dutch Lady Full Cream Milk 1L', cat: 'dairy', kind: 'milk', qty: 20, rec: 12, d: 2, verify: 'unverified' },
  { id: 'b2', owner: 'u2', name: 'Gardenia Wholemeal Bread 400g', cat: 'bakery', kind: 'bread', qty: 15, rec: 3, d: 2, verify: 'listed', remaining: 6, listingId: 'm1' },
  { id: 'b3', owner: 'u2', name: 'ABC Kicap Manis 600ml', cat: 'pantry', kind: 'soy', qty: 10, rec: 40, d: 20, verify: 'listed', remaining: 5, listingId: 'm2' },
  { id: 'b4', owner: 'u2', name: 'Marigold Natural Yoghurt 4 x 100g', cat: 'dairy', kind: 'yoghurt', qty: 12, rec: 10, d: 1, verify: 'listed', remaining: 6, listingId: 'm3' },
  { id: 'b5', owner: 'u2', name: "Jacob's Cream Crackers 428g", cat: 'pantry', kind: 'crackers', qty: 24, rec: 60, d: -2, verify: 'listed', remaining: 5, listingId: 'm4' },
  { id: 'b6', owner: 'u2', name: 'Farm Fresh Eggs Grade A (10 pcs)', cat: 'dairy', kind: 'eggs', qty: 30, rec: 8, d: 6, verify: 'listed', remaining: 16, listingId: 'l6' },
  { id: 'b7', owner: 'u2', name: 'Maggi Kari Instant Noodles 5 x 79g', cat: 'pantry', kind: 'noodles', qty: 30, rec: 25, d: 5, verify: 'unverified' },
  { id: 'b8', owner: 'u2', name: 'Milo 3-in-1 Sachets 18 x 33g', cat: 'pantry', kind: 'milo', qty: 12, rec: 20, d: 9, verify: 'dismissed', remaining: 0 },
  { id: 'b9', owner: 'u2', name: 'Massimo Sandwich Loaf 400g', cat: 'bakery', kind: 'bread', qty: 18, rec: 2, d: 3, verify: 'unverified' },
  { id: 'b10', owner: 'u2', name: 'Marigold Peel Fresh Orange Juice 1L', cat: 'others', kind: 'juice', qty: 8, rec: 6, d: 14, verify: 'unverified' },
]

// created = hours relative to now; collected = days ago
export const SEED_RESERVATIONS = [
  { id: 'r1', listingId: 'l6', qty: 2, status: 'pending', buyerId: 'x1', buyerName: 'Nurul Ain A.', code: 'FS-4K7Q', created: -0.5 },
  { id: 'r2', listingId: 'm2', qty: 3, status: 'confirmed', buyerId: 'x2', buyerName: 'Daniel Tan', code: 'FS-9PD2', created: -5 },
  { id: 'r3', listingId: 'm3', qty: 6, status: 'completed', buyerId: 'x3', buyerName: 'Priya Nair', code: 'FS-2LM8', created: -50, collected: 2 },
  { id: 'r4', listingId: 'l6', qty: 2, status: 'completed', buyerId: 'x4', buyerName: 'Lim Mei Ling', code: 'FS-7HX3', created: -230, collected: 9 },
  { id: 'r5', listingId: 'l2', qty: 2, status: 'completed', buyerId: 'u1', buyerName: 'Aisyah Rahman', code: 'FS-K2W9', created: -110, collected: 4 },
  { id: 'r6', listingId: 'l3', qty: 1, status: 'confirmed', buyerId: 'u1', buyerName: 'Aisyah Rahman', code: 'FS-P8DN', created: -2 },
  { id: 'r7', listingId: 'l9', qty: 1, status: 'cancelled', buyerId: 'u1', buyerName: 'Aisyah Rahman', code: 'FS-3QTR', created: -70, by: 'buyer' },
  { id: 'r8', listingId: 'l1', qty: 1, status: 'completed', buyerId: 'u1', buyerName: 'Aisyah Rahman', code: 'FS-M6CE', created: -420, collected: 17 },
  { id: 'r9', listingId: 'm2', qty: 2, status: 'completed', buyerId: 'x5', buyerName: 'Ahmad Faiz', code: 'FS-B4NK', created: -380, collected: 16 },
]
