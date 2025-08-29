import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/storage',
      'packages/tools',
      'packages/@tools/*'
    ],
    coverage: {
      enabled: true,
      include: ['**\/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@app/schemas': path.resolve(__dirname,
        'packages/schemas/src/index.ts')
    }
  }
})