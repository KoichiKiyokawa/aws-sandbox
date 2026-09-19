import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    nitro({
      plugins: ['./src/database-lifecycle.ts'],
      serveStatic: process.env.NITRO_PRESET !== 'aws-lambda',
      rollupConfig: { external: [/^@sentry\//, '@electric-sql/pglite'] },
    }),

    tanstackStart(),
    viteReact(),
  ],
})

export default config
