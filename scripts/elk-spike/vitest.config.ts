import { defineConfig } from 'vitest/config';

// The elkjs trial (docs/plan/06-elk-flow.md). Not part of `npm test`:
//   npx vitest run -c scripts/elk-spike/vitest.config.ts
export default defineConfig({
  test: { environment: 'jsdom', include: ['scripts/elk-spike/*.spike.ts'], testTimeout: 120000 },
});
