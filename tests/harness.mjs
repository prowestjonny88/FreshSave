// Node harness: loads the demo state with disposable in-memory localStorage.
const mem = new Map()
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) }
globalThis.sessionStorage = { getItem: () => '1', setItem() {}, removeItem() {} }
globalThis.location = { hash: '' }
export const core = await import('../src/services/demo-state.js')
export const reset = () => { mem.clear(); core.resetAll() }
// Load a fresh copy of the demo state against a persisted record.
export async function loadWith(blob) {
  mem.clear(); if (blob) mem.set('freshsave-app-v2', JSON.stringify(blob))
  return import('../src/services/demo-state.js?v=' + Math.random())
}
