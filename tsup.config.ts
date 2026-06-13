import { cp } from 'fs/promises'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: true,
  onSuccess: async () => {
    await cp('src/templates', 'dist/templates', { recursive: true })
  },
})