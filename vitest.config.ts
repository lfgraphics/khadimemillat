import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
    setupFiles: [],
    coverage: {
      enabled: false
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname)
    }
  }
})
