import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// The analysis tests need the real FastAPI backend. Start it from the project's venv when that
// exists (scripts\setup.ps1 creates it); otherwise only the web server starts and the
// analysis specs skip themselves. Test data goes to a temp folder, never to your real data dir.
const pythonPath = path.resolve(__dirname, "../api/.venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const hasApiEnv = fs.existsSync(pythonPath);

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
  webServer: [
    {
      command: "pnpm dev --hostname 127.0.0.1 --port 3000",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ...(hasApiEnv
      ? [
          {
            command: `"${pythonPath}" -m uvicorn pixelproof.main:app --host 127.0.0.1 --port 8000`,
            cwd: path.resolve(__dirname, "../api"),
            url: "http://127.0.0.1:8000/health",
            reuseExistingServer: !process.env.CI,
            timeout: 60_000,
            env: { PIXELPROOF_DATA_DIR: path.join(os.tmpdir(), "pixelproof-e2e") },
          },
        ]
      : []),
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
