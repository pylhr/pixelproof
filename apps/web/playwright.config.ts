import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // The tests run against `next dev`, which compiles each route on first request.
  // On a cold cache with many workers (8 GB dev machine) 3 of 14 tests timed out at
  // 30 s; a warm re-run passed. Fewer workers and a longer timeout are a mitigation,
  // not a proven root-cause fix. Revisit by testing against `next start`.
  workers: 2,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
