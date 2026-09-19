import { defineConfig, devices } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dataDir = mkdtempSync(join(tmpdir(), 'todo-e2e-'))
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm db:setup && pnpm build && node .output/server/index.mjs',
    url: 'http://127.0.0.1:3100',
    env: {
      PGLITE_DATA_DIR: dataDir,
      DSQL_HOST: '',
      DATABASE_URL: '',
      PORT: '3100',
      HOST: '127.0.0.1',
    },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
