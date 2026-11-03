import { defineConfig, devices } from "@playwright/test";

const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const production = process.env.PLAYWRIGHT_PRODUCTION === "1";
export default defineConfig({
  testDir: "./tests",
  testMatch: production ? ["production.spec.ts", "catalog.spec.ts"] : ["theme.spec.ts", "homepage.spec.ts", "scenes.spec.ts", "catalog.spec.ts"],
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: externalURL || "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalURL ? undefined : [{
    command: "node tests/support/catalog-api.mjs",
    url: "http://127.0.0.1:3181/health",
    reuseExistingServer: false,
  }, {
    command: production ? "npm run start -- --hostname 127.0.0.1 --port 3100" : "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { BACKEND_URL: "http://127.0.0.1:3181" },
    timeout: 120000,
  }],
});
