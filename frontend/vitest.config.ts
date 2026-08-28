import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/shared/lib/storage-scope.ts',
        'src/shared/lib/training-sync-meta.ts',
        'src/entities/training/lib/**/*.ts',
        'src/entities/session/lib/**/*.ts',
        'src/features/rest-timer/lib/**/*.ts',
        'src/features/sync-trainings/model/pending-summary.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
