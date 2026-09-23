import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import net from 'node:net'
import { resolve } from 'node:path'

async function getAvailablePort(startPort = 5432): Promise<number> {
  for (let port = startPort; port < startPort + 50; port++) {
    const isFree = await new Promise<boolean>((res) => {
      const server = net.createServer()
      server.listen(port, '127.0.0.1', () => {
        server.close(() => res(true))
      })
      server.on('error', () => res(false))
    })
    if (isFree) return port
  }
  throw new Error('利用可能なポートが見つかりませんでした')
}

const dataDir = process.env.PGLITE_DATA_DIR || resolve(process.cwd(), '.data/todos')
await mkdir(dataDir, { recursive: true })

const port = process.env.PGPORT ? Number(process.env.PGPORT) : await getAvailablePort(5432)

const hasTableProApp =
  existsSync('/Applications/TablePro.app') ||
  existsSync(`${process.env.HOME}/Applications/TablePro.app`)
const openCommand = hasTableProApp
  ? `open -a TablePro postgresql://postgres@127.0.0.1:${port}/postgres`
  : `open postgresql://postgres@127.0.0.1:${port}/postgres`

console.log(`[TablePro PGlite] Database directory: ${dataDir}`)
console.log(`[TablePro PGlite] Port: ${port}`)
console.log(`[TablePro PGlite] Starting socket server and launching TablePro...`)

const child = spawn(
  'pnpm',
  ['exec', 'pglite-server', '-d', dataDir, '-p', String(port), '-m', '5', '-r', openCommand],
  { stdio: 'inherit' },
)

const handleShutdown = () => {
  if (!child.killed) {
    child.kill('SIGINT')
  }
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
