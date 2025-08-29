import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@app/schemas': path.resolve(__dirname,
        '../../schemas/src/index.ts')
    }
  }
})