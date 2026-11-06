import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests for the playground. Runs the built app with `vite preview`
 * in the installed Google Chrome. Not part of `npm run check`:
 *
 *   npm run test:e2e
 */
const PORT = 4179;

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../../node_modules/.cache/playwright-results',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true,
  },
  webServer: {
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
