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
})