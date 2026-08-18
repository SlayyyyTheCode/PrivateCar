import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Tests only ever touch `src/core` and `src/data`, which are pure TypeScript
 * with zero React Native imports. That is deliberate: the whole Singapore
 * finance engine runs under plain Node, so the numbers can be verified without
 * a simulator.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
