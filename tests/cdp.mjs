// Minimal Chrome DevTools Protocol driver (no dependencies) for end-to-end checks against the dev server.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8443/'
const browser = process.env.CHROME_PATH || (process.platform === 'win32'
  ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  : 'chromium')

export async function launch({ width = 1440, height = 900, url, realClock = false }) {
  const dir = mkdtempSync(join(tmpdir(), 'fs-chrome-'))
  if (!browser) throw new Error('Install Chrome or set CHROME_PATH to a Chromium browser.')
  const proc = spawn(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--disable-background-networking', '--disable-dev-shm-usage', '--remote-debugging-port=0',
    `--user-data-dir=${dir}`, `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true })
  let launchError
  proc.on('error', error => { launchError = error })
  let list
  for (let i = 0; i < 120 && !launchError && proc.exitCode === null; i++) {
    try {
      const port = Number(readFileSync(join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0])
      list = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) })).json()
      if (list.find(t => t.type === 'page')) break
    } catch { /* Chrome is starting */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  const page = list?.find((t) => t.type === 'page')
  if (!page) { proc.kill(); throw launchError || new Error('Chromium did not start its DevTools endpoint.') }
  const terminate = () => proc.kill()
  process.once('exit', terminate)
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chromium did not open its DevTools WebSocket.')), 10_000)
    ws.onopen = () => { clearTimeout(timeout); resolve() }
    ws.onerror = () => { clearTimeout(timeout); reject(new Error('Could not connect to Chromium DevTools.')) }
  })
  let id = 0; const pending = new Map(), errors = [], logs = [], netfails = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) { const { res, rej, timeout } = pending.get(d.id); clearTimeout(timeout); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result) }
    else if (d.method === 'Network.loadingFailed') netfails.push(d.params.errorText)
    else if (d.method === 'Network.requestWillBeSent' && globalThis.__NETLOG) logs.push('REQ ' + d.params.request.url)
    else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map((a) => a.value ?? a.description).join(' '))
    else if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.args.map((a) => a.value ?? a.description).join(' '))
  }
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id
    const timeout = setTimeout(() => { pending.delete(i); rej(new Error(`Chromium timed out during ${method}.`)) }, 20_000)
    pending.set(i, { res, rej, timeout })
    try { ws.send(JSON.stringify({ id: i, method, params })) }
    catch (error) { clearTimeout(timeout); pending.delete(i); rej(error) }
  })
  ws.onclose = () => {
    for (const { rej, timeout } of pending.values()) { clearTimeout(timeout); rej(new Error('Chromium DevTools closed.')) }
    pending.clear()
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*://images.unsplash.com/*'] })
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Kuala_Lumpur' })
  if (!realClock) await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => {
    const NativeDate = Date, start = ${Date.now()}, noon = NativeDate.parse('2026-05-18T04:00:00Z');
    const now = () => noon + NativeDate.now() - start;
    window.Date = new Proxy(NativeDate, {
      construct(target, args) { return new target(...(args.length ? args : [now()])); },
      apply(target) { return new target(now()).toString(); },
      get(target, key) { return key === 'now' ? now : Reflect.get(target, key); }
    });
  })()` })
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const api = {
    errors, logs, netfails, sleep, send,
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value },
    async ready() { for (let i = 0; i < 80; i++) { try { const ok = await api.eval(`return !!document.querySelector('#root')?.children.length && (!!document.querySelector('#a-email') || !!document.querySelector('#main')?.innerHTML.length || !!document.querySelector('.auth-plain'))`); if (ok) return } catch {} await sleep(150) } throw new Error('app did not render') },
    async goto(u) { await send('Page.navigate', { url: u }); await sleep(300); await api.ready() },
    async reload() { await send('Page.reload'); await sleep(300); await api.ready() },
    async fresh(u = new URL('#/login', BASE_URL).href) { await api.goto(u); await api.eval(`localStorage.clear(); sessionStorage.clear()`); await api.reload() },
    async login(email) { await api.fresh(); await api.type('#a-email', email); await api.type('#a-pw', 'demo1234'); await api.eval(`document.querySelector('#f-login').requestSubmit()`); await sleep(500) },
    async hash(h) { await api.eval(`location.hash=${JSON.stringify(h)}`); await sleep(250); await api.ready() },
    async click(sel) { const ok = await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true`); if (!ok) throw new Error('click: not found ' + sel); await sleep(200) },
    async text(sel = 'body') { return api.eval(`return document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`) },
    async has(sel) { return api.eval(`return !!document.querySelector(${JSON.stringify(sel)})`) },
    async type(sel, v) { await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), 'value').set.call(e, ${JSON.stringify(v)}); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))`); await sleep(80) },
    async check(sel, on = true) { await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); if(e.checked!==${on}) e.click()`); await sleep(80) },
    async shot(path) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(r.data, 'base64')) },
    async close() { try { ws.close() } catch {} process.removeListener('exit', terminate); terminate() },
  }
  if (url) await api.goto(url)
  return api
}
