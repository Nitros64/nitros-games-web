# Nitros Games Web

A public, independent game studio frontend built with Next.js 16.4, React and strict TypeScript. No games are released yet. Milestone 01 establishes the site, architecture and global retro appearance system.

## Local development

Use Node.js 24 LTS (verified with 24.20.0) and npm. Preserve the committed lockfile.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No AWS account, backend, environment variables or network-hosted fonts are required to run the frontend. `.env.example` documents the intentionally empty configuration; `.env.local` and credentials are ignored. Never place secrets in `NEXT_PUBLIC_*` variables.

## Architecture

- `src/app`: server-rendered routes, metadata, root layout and global layout styles.
- `src/features/home`: homepage composition, including honest Coming Soon content.
- `src/components`: shared server-rendered navigation and footer.
- `src/theme`: semantic CSS tokens, validated preference bootstrap and the only interactive client component.
- `tests`: Playwright browser behavior tests. `src/server` is intentionally absent until an integration requires it. Spring Boot remains a separate repository.

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

## Next milestone

Define the content model and editorial workflow for genuine studio updates and future game announcements. Add a typed, server-only backend adapter with a local fixture mode when an actual API contract is available; keep authentication and cloud services out until needed.

## Living world experiments

The homepage has two original decorative Canvas 2D scenes. In development (`npm run dev`), use the hero's **DEV / SCENE** buttons:

- **A · ARCADE BATTLEFIELD**: orbital outpost, parallax terrain and stars, ships, enemy formations, projectiles and small timed explosions.
- **B · LIVING PIXEL WORLD**: mountain ridges, a ruined watchtower, trees, water, bridge patrols and an occasional passing craft.

A is the provisional production default. The A/B controls are removed from production; neither experiment is a final art direction. The shared `RetroWindow` accepts a title, optional icon, content, optional status and optional action. Both renderers live independently in `src/features/home/scenes` and share only drawing utilities and the animation host.

The navigation maps **8-BIT → nes**, **16-BIT → snes**, **64-BIT → n64** and **RETRO MIX → retro-mix** without changing stored preference IDs. The new scene tokens provide separate day/night palettes. 8-bit uses a lower-resolution canvas; 64-bit adds faceted terrain and depth treatments, not a full 3D engine.

Animation uses one requestAnimationFrame loop outside React, drawing at up to 24 fps (12 on mobile). The low-resolution buffer stays independent of device pixel ratio. Mobile reduces entity counts and reserves a separate scenic band between the text and info window. IntersectionObserver, page visibility and reduced-motion listeners stop animation when appropriate; a public pause button is also available. Reduced motion renders a still scene. Listeners and animation frames are cleaned up on unmount. The previous SVG is the no-JavaScript/canvas fallback.

All sprites and environments are original source artwork. The supplied logo remains unchanged at `public/brand/nitros_games_logo.webp`. Tiny5 is locally bundled under SIL OFL 1.1 with its license in `public/fonts`; source: https://github.com/google/fonts/tree/main/ofl/tiny5. No game engine, external font service, backend or admin feature was added.

If another dev server already runs in this checkout, set `PLAYWRIGHT_BASE_URL=http://localhost:3000` before `npm test` to reuse it. After `npm run build`, set `PLAYWRIGHT_PRODUCTION=1` (and leave `PLAYWRIGHT_BASE_URL` unset) to run the production smoke test with `npm test`. It verifies the experimental controls are absent, animation works, preferences survive refresh, and navigation has no browser errors.

CONTACT remains a standby panel until a real public contact channel is supplied. Motion is decorative, with no gameplay, collision engine, audio or player input. Both designs require visual review before further development.
