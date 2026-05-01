import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  bundle: true,
  banner: { js: '#!/usr/bin/env node' },
})
