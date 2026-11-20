// Node harness: loads the real core.js with a disposable in-memory localStorage (no browser needed).
const mem = new Map()
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
globalThis.sessionStorage = { getItem: () => '1', setItem() {}, removeItem() {} }
globalThis.location = { hash: '' }
export const core = await import('../src/core.js')
export const reset = () => { mem.clear(); core.resetAll() }
// Loads a second copy of core.js against a given persisted blob (used to test migration).
export async function loadWith(blob) {
  mem.clear(); if (blob) mem.set('freshsave-app-v2', JSON.stringify(blob))
  return import('../src/core.js?v=' + Math.random())
}
