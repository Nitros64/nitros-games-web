import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const externalURL = process.env.PLAYWRIGHT_BASE_URL;
const production = process.env.PLAYWRIGHT_PRODUCTION === "1";
export default defineConfig({
  testDir: "./tests",
  testMatch: production ? ["production.spec.ts", "catalog.spec.ts", "admin.spec.ts"] : ["theme.spec.ts", "homepage.spec.ts", "scenes.spec.ts", "catalog.spec.ts", "admin.spec.ts"],
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
    env: { BACKEND_URL: "http://127.0.0.1:3181", APP_URL: "http://127.0.0.1:3100",
      OIDC_ISSUER: "http://127.0.0.1:3181/oidc", OIDC_CLIENT_ID: "nitros-games-web",
      OIDC_CLIENT_SECRET: "", OIDC_ALLOW_HTTP: "true", OIDC_SCOPES: "openid profile email",
      AUTH_SECRET: randomBytes(32).toString("hex"), AUTH_SESSION_DIR: ".data/test-auth" },
    timeout: 120000,
  }],
});
