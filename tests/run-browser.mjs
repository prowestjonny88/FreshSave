import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BASE_URL } from './cdp.mjs'

const selected = process.argv.slice(2)
const names = (await readdir(new URL('./', import.meta.url)))
  .filter(name => /^e2e-.*\.mjs$/.test(name) && name !== 'e2e-lib.mjs' && name !== 'e2e-supabase.mjs')
  .filter(name => !selected.length || selected.includes(name.slice(4, -4)))
if (!names.length) throw new Error('No browser journeys matched the requested names.')
const base = new URL(BASE_URL)
try {
  if (!(await fetch(base, { signal: AbortSignal.timeout(5000) })).ok) throw new Error('HTTP error')
} catch {
  throw new Error(`FreshSave is unavailable at ${base.href}. Start Vite or set E2E_BASE_URL.`)
}

for (const name of names) {
  const file = fileURLToPath(new URL(name, import.meta.url))
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], { stdio: 'inherit', windowsHide: true })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  if (code !== 0) process.exitCode = 1
}
