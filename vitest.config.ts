import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: ['packages/storage', 'packages/tools'],
    coverage: {
      enabled: true,
      include: ['**\/*.ts'],
      // exclude: [
      //   '**\/dist\/*',
      //   '**\/vite.config.js',
      //   '**\/vitest.config.ts',
      //   '**\/electron-builder.mjs',
      //   '**\/dev-mode.js',
      //   '**\/entry-point.mjs',
      // ]
    },
    // include: ['**\/**\/src\/*.ts']
    // exclude: ['**/']
  },
})