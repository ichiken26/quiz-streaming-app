import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nuxtPort = Number(process.env.LOCAL_NUXT_PORT ?? 3000)
const workerPort = Number(process.env.LOCAL_WORKER_PORT ?? 8787)
const workerUrl = process.env.LOCAL_WORKER_URL ?? `http://127.0.0.1:${workerPort}`
const executable = name => path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? `${name}.cmd` : name,
)

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      ...options,
    })
    child.once('error', reject)
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${path.basename(command)} exited with code ${code ?? 'unknown'}`)))
  })
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () => reject(new Error(
      `Port ${port} is already in use. Stop the existing development server and run npm run dev again.`,
    )))
    server.once('listening', () => server.close(resolve))
    server.listen(port, '127.0.0.1')
  })
}

async function waitForWorker(worker) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (worker.exitCode !== null) throw new Error('Local Worker stopped before becoming ready')
    try {
      const response = await fetch(`${workerUrl}/api/health`)
      if (response.ok) return
    }
    catch {
      // Wrangler is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('Timed out waiting for the local Worker')
}

await Promise.all([
  assertPortAvailable(nuxtPort),
  assertPortAvailable(workerPort),
])

await run(executable('wrangler'), [
  'd1', 'migrations', 'apply', 'DB',
  '--local',
  '--config', 'wrangler.dev.jsonc',
], {
  env: { ...process.env, CI: '1' },
})

const worker = spawn(executable('wrangler'), [
  'dev',
  '--config', 'wrangler.dev.jsonc',
  '--port', String(workerPort),
  '--local',
  '--show-interactive-dev-session=false',
], { cwd: root, stdio: 'inherit' })

await waitForWorker(worker)

const nuxt = spawn(executable('nuxt'), ['dev', '--port', String(nuxtPort)], {
  cwd: root,
  stdio: 'inherit',
})

const children = [worker, nuxt]
let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null) child.kill(signal)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => stop(signal))
}

await Promise.race(children.map(child => new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', code => resolve(code ?? 1))
})))
  .then((code) => {
    process.exitCode = code
  })
  .finally(() => stop())
