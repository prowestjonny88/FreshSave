// Minimal Chrome DevTools Protocol driver (no dependencies) for end-to-end checks against the dev server.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function launch({ width = 1440, height = 900, url }) {
  const dir = mkdtempSync(join(tmpdir(), 'fs-chrome-'))
  const port = 9300 + Math.floor(Math.random() * 400)
  const proc = spawn('chromium', ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 60; i++) { try { list = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (list.find((t) => t.type === 'page')) break } catch {} await new Promise((r) => setTimeout(r, 250)) }
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0; const pending = new Map(), errors = [], logs = [], netfails = []
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data)
    if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(JSON.stringify(d.error))) : res(d.result) }
    else if (d.method === 'Network.loadingFailed') netfails.push(d.params.errorText)
    else if (d.method === 'Network.requestWillBeSent' && globalThis.__NETLOG) logs.push('REQ ' + d.params.request.url)
    else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map((a) => a.value ?? a.description).join(' '))
    else if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.args.map((a) => a.value ?? a.description).join(' '))
  }
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 })
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const api = {
    errors, logs, netfails, sleep, send,
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value },
    async ready() { for (let i = 0; i < 80; i++) { try { const ok = await api.eval(`return !!document.querySelector('#root')?.children.length && (!!document.querySelector('#a-email') || !!document.querySelector('#main')?.innerHTML.length || !!document.querySelector('.auth-plain'))`); if (ok) return } catch {} await sleep(150) } throw new Error('app did not render') },
    async goto(u) { await send('Page.navigate', { url: u }); await sleep(300); await api.ready() },
    async reload() { await send('Page.reload'); await sleep(300); await api.ready() },
    async fresh(u = 'http://127.0.0.1:3000/#/login') { await api.goto(u); await api.eval(`localStorage.clear(); sessionStorage.clear()`); await api.reload() },
    async login(email) { await api.fresh(); await api.type('#a-email', email); await api.type('#a-pw', 'demo1234'); await api.eval(`document.querySelector('#f-login').requestSubmit()`); await sleep(500) },
    async hash(h) { await api.eval(`location.hash=${JSON.stringify(h)}`); await sleep(250) },
    async click(sel) { const ok = await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true`); if (!ok) throw new Error('click: not found ' + sel); await sleep(200) },
    async text(sel = 'body') { return api.eval(`return document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`) },
    async has(sel) { return api.eval(`return !!document.querySelector(${JSON.stringify(sel)})`) },
    async type(sel, v) { await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); e.value=${JSON.stringify(v)}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}))`); await sleep(80) },
    async check(sel, on = true) { await api.eval(`const e=document.querySelector(${JSON.stringify(sel)}); if(e.checked!==${on}) e.click()`); await sleep(80) },
    async shot(path) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(path, Buffer.from(r.data, 'base64')) },
    async close() { try { ws.close() } catch {} proc.kill('SIGKILL') },
  }
  if (url) await api.goto(url)
  return api
}
