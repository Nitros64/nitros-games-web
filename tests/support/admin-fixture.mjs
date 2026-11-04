import { resetReleases, releaseCatalog, handleReleases } from "./releases-fixture.mjs";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";

const origin = "http://127.0.0.1:3181";
const issuer = origin + "/oidc";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", alg: "RS256", use: "sig" };
const codes = new Map(), accessTokens = new Map(), attempts = new Map();
let games = [], nextId = 9000, lifetime = 3600, backendStatus = 0, invalidNonce = false;
const json = (res, value, status = 200) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); };
const body = async req => { let data = ""; for await (const chunk of req) data += chunk; return data; };
const random = () => randomBytes(24).toString("base64url");
const jwt = claims => {
  const data = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url") + "." + Buffer.from(JSON.stringify(claims)).toString("base64url");
  return data + "." + sign("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url");
};

export async function handleAdminFixture(req, res) {
  const url = new URL(req.url, origin), path = url.pathname;
  if (path === "/admin-scenario" && req.method === "POST") {
    const scenario = JSON.parse(await body(req));
    games = scenario.games ?? []; resetReleases(scenario); lifetime = scenario.lifetime ?? 3600; backendStatus = scenario.status ?? 0; invalidNonce = scenario.invalidNonce ?? false;
    json(res, { ok: true }); return true;
  }
  if (path === "/oidc/.well-known/openid-configuration") {
    json(res, { issuer, authorization_endpoint: issuer + "/authorize", token_endpoint: issuer + "/token",
      jwks_uri: issuer + "/jwks", end_session_endpoint: issuer + "/logout", response_types_supported: ["code"],
      subject_types_supported: ["public"], id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"] }); return true;
  }
  if (path === "/oidc/jwks") { json(res, { keys: [jwk] }); return true; }
  if (path === "/oidc/authorize") {
    const params = Object.fromEntries(url.searchParams);
    if (params.client_id !== "nitros-games-web" || params.redirect_uri !== "http://127.0.0.1:3100/auth/callback" ||
        params.code_challenge_method !== "S256" || !params.code_challenge || !params.state || !params.nonce) { json(res, {}, 400); return true; }
    const attempt = random(); attempts.set(attempt, params);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<html lang="en"><title>Test identity provider</title><form action="/oidc/approve" method="post"><input type="hidden" name="attempt" value="${attempt}"><button name="role" value="ADMIN">Test admin</button><button name="role" value="READER">Test reader</button></form></html>`);
    return true;
  }
  if (path === "/oidc/approve") {
    const form = new URLSearchParams(await body(req));
    const params = attempts.get(form.get("attempt")); attempts.delete(form.get("attempt"));
    if (!params) { json(res, {}, 400); return true; }
    const code = random(); codes.set(code, { ...params, role: form.get("role") });
    const redirect = new URL(params.redirect_uri); redirect.searchParams.set("code", code); redirect.searchParams.set("state", params.state);
    res.writeHead(303, { Location: redirect.href }).end(); return true;
  }
  if (path === "/oidc/token") {
    const form = new URLSearchParams(await body(req));
    const code = codes.get(form.get("code")); codes.delete(form.get("code"));
    if (!code || form.get("redirect_uri") !== code.redirect_uri || form.get("client_id") !== code.client_id ||
        createHash("sha256").update(form.get("code_verifier") ?? "").digest("base64url") !== code.code_challenge) { json(res, { error: "invalid_grant" }, 400); return true; }
    const access = random(); accessTokens.set(access, { role: code.role, expires: Date.now() + lifetime * 1000 });
    const now = Math.floor(Date.now() / 1000);
    json(res, { access_token: access, token_type: "Bearer", expires_in: lifetime,
      id_token: jwt({ iss: issuer, sub: "test-" + code.role, aud: code.client_id, iat: now, exp: now + lifetime,
        nonce: invalidNonce ? "invalid" : code.nonce }) }); return true;
  }
  if (path === "/oidc/logout") {
    res.writeHead(303, { Location: "http://127.0.0.1:3100/admin/login?loggedOut=1" }).end(); return true;
  }
  if (path === "/api/v1/game-genres") { json(res, [{ id: 3, name: "Arcade" }, { id: 7, name: "Shooter" }]); return true; }
  if (releaseCatalog(path, res)) return true;
  if (req.method === "GET" && /^\/api\/v1\/games\/\d+/.test(path)) {
    const game = games.find(item => item.id === Number(path.match(/games\/(\d+)/)?.[1]));
    if (game) {
      if (game.publicationStatus !== "PUBLISHED") { json(res, {}, 404); return true; }
      if (await handleReleases(req, res, path, game)) return true;
      json(res, game); return true;
    }
  }
  if (!path.startsWith("/api/v1/admin/games") && !(path.startsWith("/api/v1/games") && req.method !== "GET")) return false;
  const token = accessTokens.get(req.headers.authorization?.replace(/^Bearer /, ""));
  if (!token || token.expires <= Date.now()) { json(res, {}, 401); return true; }
  if (token.role !== "ADMIN") { json(res, {}, 403); return true; }
  if (backendStatus) { json(res, { secret: "upstream detail" }, backendStatus); return true; }
  const id = Number(path.match(/games\/(\d+)/)?.[1]);
  if (path === "/api/v1/admin/games") { json(res, games); return true; }
  if (path === "/api/v1/games" && req.method === "POST") {
    const input = JSON.parse(await body(req));
    const game = { ...input, id: nextId++, publicationStatus: "DRAFT" }; games.push(game); json(res, game, 201); return true;
  }
  const game = games.find(item => item.id === id);
  if (!game) { json(res, {}, 404); return true; }
  if (await handleReleases(req, res, path, game)) return true;
  if (req.method === "GET") { json(res, game); return true; }
  if (req.method === "DELETE") { games = games.filter(item => item.id !== id); res.writeHead(204).end(); return true; }
  Object.assign(game, JSON.parse(await body(req))); json(res, game); return true;
}
