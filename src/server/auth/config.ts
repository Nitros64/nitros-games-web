import "server-only";
import path from "node:path";

export function authSettings() {
  const origin = new URL(process.env.APP_URL || "http://localhost:3000");
  const issuer = new URL(process.env.OIDC_ISSUER || "http://localhost:8081/realms/nitros-games");
  const local = (url: URL) => url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password ||
      (origin.protocol !== "https:" && !local(origin))) throw new Error("Invalid APP_URL");
  if (issuer.username || issuer.password || issuer.search || issuer.hash ||
      (issuer.protocol !== "https:" && !(local(issuer) && process.env.OIDC_ALLOW_HTTP === "true"))) throw new Error("Invalid OIDC issuer");
  const secret = process.env.AUTH_SECRET;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) throw new Error("AUTH_SECRET must contain 32 random bytes as hex");
  return {
    origin: origin.origin, issuer, key: Buffer.from(secret, "hex"),
    clientId: process.env.OIDC_CLIENT_ID || "nitros-games-web",
    clientSecret: process.env.OIDC_CLIENT_SECRET || undefined,
    scopes: process.env.OIDC_SCOPES || "openid profile email",
    // Runtime session data belongs to the private volume, never to the deployment bundle.
    directory: path.resolve(/* turbopackIgnore: true */ process.env.AUTH_SESSION_DIR || ".data/auth"),
    secure: origin.protocol === "https:",
    callback: new URL("/auth/callback", origin).href,
  };
}

export function authConfigured() {
  try { authSettings(); return true; } catch { return false; }
}

export function sessionCookieName() { return authSettings().secure ? "__Host-ng-session" : "ng-session"; }
export function transactionCookieName() { return authSettings().secure ? "__Host-ng-oidc" : "ng-oidc"; }
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: authSettings().secure, sameSite: "lax" as const, path: "/", maxAge };
}
