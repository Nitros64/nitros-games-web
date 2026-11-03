# Nitros Games Web

A public, independent game studio frontend built with Next.js 16.4, React and strict TypeScript. The public catalog reads published games from the independent Spring Boot backend.

## Local development

Use Node.js 24 LTS (verified with 24.20.0) and npm. Preserve the committed lockfile.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No AWS account, backend, environment variables or network-hosted fonts are required to run the frontend. Development uses `http://localhost:8080` by default; `.env.example` documents the server-only `BACKEND_URL` override; `.env.local` and credentials are ignored. Never place secrets in `NEXT_PUBLIC_*` variables.

## Architecture

- `src/app`: server-rendered routes, metadata, root layout and global layout styles.
- `src/features/home`: homepage composition and independent decorative canvas scenes.
- `src/components`: shared server-rendered navigation and footer.
- `src/theme`: semantic CSS tokens, validated preference bootstrap and interactive appearance controls.
- `src/features/admin-games`: administrative UI, validation and server actions.
- `tests`: Playwright browser behavior tests. `src/server` contains server-only HTTP and backend configuration. Spring Boot remains a separate repository.

The root layout applies `data-theme` and `data-mode` globally. Four looks (Retro mix, NES, SNES, N64) each have light and dark palettes, plus distinct type, corners, shadows and surface treatments. The names describe visual eras; the site is not affiliated with Nintendo. Retro Mix uses an experimental animated retro world with original pixel sprites and server-rendered navigation icons. Its Tiny5 pixel font is bundled locally; longer text uses system sans-serif. NES, SNES and N64 retain their own theme tokens.

A fixed inline script in the document head validates localStorage before first paint, following the installed Next.js preventing-flash guide. Only the root HTML attributes suppress the expected hydration difference. `useSyncExternalStore` provides a stable server snapshot for controls, which stay disabled until hydrated; page content is always rendered. Auto mode follows the OS; an explicit light/dark choice overrides it. Preferences survive navigation and refresh and synchronize across tabs. Blocked storage degrades to an in-memory preference. With JavaScript disabled, CSS follows the system color preference and the default retro-mix look.

If a strict Content Security Policy is added later, authorize the bootstrap with a script hash or nonce before enabling it. Do not move preference initialization into an effect: that introduces a flash.

## Verification

```sh
npx playwright install chromium
npm run lint
npm run typecheck
npm test
npm run build
```

Browser tests start an isolated development server on port 3100. They cover all eight combinations, route navigation, refresh persistence, system preference changes, pre-hydration application, bad/blocked storage, cross-tab changes, keyboard use and mobile overflow. For production serving, run `npm run build` then `npm start`.

## Public catalog integration

`src/app/page.tsx` composes `HomePage` and `Catalog`. The catalog feature owns its validated `Game` contract, data adapter, server-rendered list and scoped styles. `src/server` owns environment configuration and the typed JSON transport; presentation never constructs API URLs. No authentication, route handler or client state library is needed for this public read.

The contract was checked against the independent backend's `GameController`, `GameResponse`, `PublicationStatus`, `GameRequest` and API contract tests, and against a live `GET /api/v1/games` response. The endpoint returns an array (not a paginated envelope): numeric id, name, description, boolean jam, positive developerCount, numeric genreIds and DRAFT/PUBLISHED publicationStatus. Only PUBLISHED entries render. Unknown fields are discarded; malformed records, unsafe or duplicate identifiers and unexpected envelopes reject the whole response. Genre IDs are retained without inventing names. No covers, screenshots, downloads or substitute games are fabricated.

Set `BACKEND_URL` to the backend **origin** in each server environment:

- Local: `http://localhost:8080` (default under `npm run dev`).
- Staging: the actual staging HTTPS origin, supplied by deployment configuration.
- Production: the actual production HTTPS origin, supplied by deployment configuration.

Both staging and production use a production Next.js build. No invented environment hostname or public browser variable is used. For a local production smoke test, set `BACKEND_URL=http://localhost:8080` before `npm start`. A missing or malformed production origin produces an unavailable state. The app and build work without a backend; unavailable is deliberately distinct from an empty successful catalog.

The server requests `/api/v1/games` without JWT, cookies or redirects. JSON is validated at the boundary, HTTP/network/timeout/configuration/invalid-data failures are discriminated internally, and upstream response bodies or URLs are never exposed in error messages. A five-second timeout bounds waiting. `connection()` keeps this read out of the build and speculative prefetch, while `cache: no-store` avoids persistent data caching. A local Suspense boundary streams a loading message without blocking the hero. Refresh Catalog performs a full navigation, without depending on a client event handler. The streamed catalog requires JavaScript to reveal its content; a noscript notice explains this limitation. Publication changes appear on the next server request or refresh; an already-open page does not poll, and browser back/forward history may restore its previous snapshot.

The existing animation host, renderers, theme tokens, fonts and artwork are unchanged. The homepage's static announcement now points to the catalog so it does not contradict published content. The catalog reuses `RetroWindow` and existing semantic colors. No broad refactoring or empty future modules were added.

## Catalog verification

`npm test` starts a test-only HTTP server on port 3181 and the frontend on 3100 with an explicit backend override. Tests cover successful metadata rendering, draft exclusion, empty results, publication changes, escaped content, HTTP errors, disconnects, timeout, invalid JSON/schema, streaming, mobile overflow and canvas identity. Existing theme, storage, navigation and animation tests also run. Fixtures exist only under `tests`; they never replace unavailable data in the application.

After `npm run build`, set `PLAYWRIGHT_PRODUCTION=1` and run `npm test` for the production catalog and animation checks. `PLAYWRIGHT_BASE_URL` reuses an external frontend without starting the controlled API; catalog scenario tests are skipped in that mode.

## Next milestone

Validate Cognito issuer, logout and backend role mapping before enabling that provider. Move the session store to shared infrastructure before deploying multiple frontend replicas. Versions, downloads and image uploads remain future features.

## Living world experiments

The homepage has two original decorative Canvas 2D scenes. In development (`npm run dev`), use the hero's **DEV / SCENE** buttons:

- **A · ARCADE BATTLEFIELD**: orbital outpost, parallax terrain and stars, ships, enemy formations, projectiles and small timed explosions.
- **B · LIVING PIXEL WORLD**: mountain ridges, a ruined watchtower, trees, water, bridge patrols and an occasional passing craft.

A is the provisional production default. The A/B controls are removed from production; neither experiment is a final art direction. The shared `RetroWindow` accepts a title, optional icon, content, optional status and optional action. Both renderers live independently in `src/features/home/scenes` and share only drawing utilities and the animation host.

The navigation maps **8-BIT → nes**, **16-BIT → snes**, **64-BIT → n64** and **RETRO MIX → retro-mix** without changing stored preference IDs. The new scene tokens provide separate day/night palettes. 8-bit uses a lower-resolution canvas; 64-bit adds faceted terrain and depth treatments, not a full 3D engine.

Animation uses one requestAnimationFrame loop outside React, drawing at up to 24 fps (12 on mobile). The low-resolution buffer stays independent of device pixel ratio. Mobile reduces entity counts and reserves a separate scenic band between the text and info window. IntersectionObserver, page visibility and reduced-motion listeners stop animation when appropriate; a public pause button is also available. Reduced motion renders a still scene. Listeners and animation frames are cleaned up on unmount. The previous SVG is the no-JavaScript/canvas fallback.

All sprites and environments are original source artwork. The supplied logo remains unchanged at `public/brand/nitros_games_logo.webp`. Tiny5 is locally bundled under SIL OFL 1.1 with its license in `public/fonts`; source: https://github.com/google/fonts/tree/main/ofl/tiny5. No game engine or external font service was added. Administration is documented below.

If another dev server already runs in this checkout, set `PLAYWRIGHT_BASE_URL=http://localhost:3000` before `npm test` to reuse it. After `npm run build`, set `PLAYWRIGHT_PRODUCTION=1` (and leave `PLAYWRIGHT_BASE_URL` unset) to run the production smoke test with `npm test`. It verifies the experimental controls are absent, animation works, preferences survive refresh, and navigation has no browser errors.

CONTACT remains a standby panel until a real public contact channel is supplied. Motion is decorative, with no gameplay, collision engine, audio or player input. Both designs require visual review before further development.

## Administration and OIDC

Open `/admin` to manage games. The public site and its decorative scenes remain independent. `src/app/admin` composes server-rendered routes; `src/features/admin-games` owns contracts, forms, server actions and the backend adapter. `src/server/auth` owns OIDC configuration, encrypted session storage and CSRF checks. Only interactive forms use Client Components. The existing catalog decoder is shared without filtering drafts in the administrative list.

The only new direct dependency is `openid-client` 6.8.9, a maintained OAuth/OIDC client. It handles discovery, Authorization Code exchange, PKCE S256, state, nonce, issuer/audience/expiry and ID token signature validation. There is no password collection, password grant, browser bearer-token storage, or client-side role authority. The existing public Keycloak client uses token endpoint authentication `none`; an optional server-side client secret supports a later confidential-client configuration. Spring Boot decides ADMIN authorization for every protected read and mutation.

### Local setup and exact Keycloak URIs

Keep Next.js at **http://localhost:3000** and Spring Boot at **http://localhost:8080**. Use the existing `nitros-games-web` client in realm `nitros-games`, issuer **http://localhost:8081/realms/nitros-games**. Keep Authorization Code / Standard Flow enabled and PKCE S256. Preserve existing Postman/other redirect entries. Add:

- Valid redirect URI: `http://localhost:3000/auth/callback`
- Valid post logout redirect URI: `http://localhost:3000/admin/login`

The login request is POST `/auth/login`; the callback is GET `/auth/callback`; logout is POST `/auth/logout`. No wildcard callback is required. Use **localhost**, not 127.0.0.1, for this configuration: the configured origin and redirect URI must match exactly. No new browser-to-API CORS permission is needed because API requests originate on the Next.js server. This implementation does not alter Keycloak configuration automatically.

Copy the documented settings from `.env.example` into an ignored local environment file and generate `AUTH_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Never commit the result. `AUTH_SECRET` must be 64 hexadecimal characters; do not reuse an example key. A missing/invalid configuration disables sign-in without breaking the public site. Restart the server after configuration changes.

For each staging/production deployment, supply its actual HTTPS `APP_URL`, `BACKEND_URL`, issuer, client ID and scopes through server configuration. Register precisely `<APP_URL>/auth/callback` and `<APP_URL>/admin/login` with that provider. Set `OIDC_ALLOW_HTTP=false`. No deployment hostname is invented here. The configuration is provider-neutral; Cognito itself, its logout behavior and its backend trust/role mapping have not been implemented or validated.

### Sessions and security boundaries

Cookies contain only random opaque identifiers. Session records, including access and ID tokens, stay on the server in AES-256-GCM encrypted files under `AUTH_SESSION_DIR`; the filenames are SHA-256 hashes of the cookie values. The directory is private and ignored by Git. Cookies are HttpOnly, SameSite=Lax and host-only, with Secure and a `__Host-` prefix on HTTPS. Loopback HTTP uses development cookies. Session IDs rotate after authentication; logout deletes the server record before contacting Keycloak. State, nonce and PKCE verifier are held in a single-use server transaction consumed with an atomic rename.

Sessions expire five seconds before the access token, with an absolute maximum of one hour. This first version intentionally requires reauthentication at expiry instead of retaining refresh tokens. Existing Keycloak SSO can complete that sign-in without another password prompt. Provider rejection, expiry and sign-in errors are shown without exposing tokens or upstream error bodies. Local logout remains effective if the provider cannot be reached; in that case the provider's SSO session may still exist.

All form mutations require a live session, an exact configured Origin and a session CSRF token, in addition to Next.js Server Action checks. Login also requires a same-origin POST. Redirect destinations are fixed server configuration, not user input. Mutations send the bearer token only from the server to Spring Boot, use no-store and do not follow redirects. Deletion requires typing the current game name and is checked again on the server. Tokens never appear in localStorage or component props. The standard OIDC logout redirect may include an ID-token hint; it never contains the access token.

This initial session store targets a **single Node.js deployment with a private persistent filesystem**, not ephemeral serverless instances or independent replicas. Provision storage permissions/backups appropriately; use a shared session store before horizontally scaling. Changing AUTH_SECRET invalidates existing sessions. Expired records are rejected on read, removed when encountered, and records older than one hour are swept when a new record is created. A stopped service can retain encrypted expired files until the next creation; expiration is still enforced on access.

### Integrated API contracts

Contracts were inspected in the independent Spring Boot repository: `GameController`, `AdminGameController`, `GameRequest`, `PublicationRequest`, `GameGenreController`, `GameGenreResponse` and `SecurityConfiguration`.

- GET `/api/v1/admin/games`: all games, including DRAFT.
- GET `/api/v1/admin/games/{id}`: administrative detail.
- POST `/api/v1/games`: create a DRAFT.
- PUT `/api/v1/games/{id}`: edit metadata.
- DELETE `/api/v1/games/{id}`: confirmed permanent deletion.
- PUT `/api/v1/admin/games/{id}/publication`: `{ publicationStatus: "DRAFT" | "PUBLISHED" }`.
- GET `/api/v1/game-genres`: existing `{ id, name }` options.

Game input is `{ name, description, jam, developerCount, genreIds }`. Both name and description currently require **4–30 characters**, developerCount is a positive Java integer, and at least one existing genre is required. Publication is a separate operation. Lists and individual responses are validated as unknown data; no genre names or statuses are invented.

### Administration tests

`tests/admin.spec.ts` runs against a local test-only OIDC provider and API, with a generated signing key and PKCE verification. It covers login, opaque cookies, draft creation, editing, publishing/unpublishing, deletion confirmation, logout, reader denial, CSRF rejection, invalid state/nonce, expiry, HTTP failures and mobile overflow. Test credentials/keys and fixture data are never used by the application in normal operation. The test runner overrides all relevant server endpoints and uses an isolated encrypted session directory. No actual game is modified by automated fixture tests.

Run `npm test` for development and, after `npm run build`, set `PLAYWRIGHT_PRODUCTION=1` and run `npm test` for production. Tests using `PLAYWRIGHT_BASE_URL` intentionally skip controlled OIDC/API scenarios. For real Keycloak verification, the user enters credentials in the provider page. Only clearly named disposable games may be created, edited and deleted for verification; preserve Arcane Drift and all existing data.

Versions, downloads, image uploads and Cognito integration remain outside this milestone.

Local verification on 2026-11-03 passed with the real Keycloak client and Spring Boot: manual administrator login, draft creation, persisted editing, publishing, unpublishing, confirmed deletion of the disposable test game (ID 4), and logout with subsequent route protection. Arcane Drift (ID 1) remained published and unchanged. The real non-ADMIN check is deferred because no test account is available; reader denial is covered by the controlled API/OIDC tests. Development tests: 45 passed; production tests: 21 passed; lint, typecheck and production build passed. The filesystem session store still requires a single persistent Node.js deployment as described above.
