import { defineConfig, devices } from '@playwright/test';

const port=Number(process.env.E2E_PORT??4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'on', screenshot: 'on', video: 'on' },
  webServer: {
    command: `pnpm build && NODE_ENV=test PORT=${port} node dist/server/apps/server/src/index.js`,
    port,
    reuseExistingServer: process.env.E2E_REUSE==='1',
    timeout: 120_000,
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'] } }],
});
