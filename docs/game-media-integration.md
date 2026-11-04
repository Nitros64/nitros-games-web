# Game Media integration

Contract source: the independent backend's `docs/game-media-api.md`, `AdminGameMediaController`, `PublicGameMediaController`, `GameMediaHttp`, `GameMediaResponse`, `GameMediaUploadRequest`, `GameMediaMetadataRequest` and `ScreenshotOrderRequest`. No backend, migration, infrastructure, Docker Compose or Terraform changes.

## Functionality

- `/admin/{id}/media`, linked from the existing editor: cover creation/replacement, multiple screenshot uploads, alt text and caption editing, complete-order updates via up/down controls, and typed deletion confirmation.
- DRAFT list and content use administrative endpoints. Spring Security authorizes all operations and the BFF performs an administrative list check before reading upload bodies.
- `/games/{id}` retains versions/downloads and adds an optional cover, screenshot gallery, full-image links and missing/unavailable image states. Only public API reads are used. No external storage URL is rendered.
- Existing themes, sprites, shooter and CSS files remain unchanged. The new forms reuse existing classes; images preserve aspect ratio and fit the container.

## Backend endpoints used

Base administrative path: `/api/v1/admin/games/{gameId}/media`.

| Method | Suffix | Purpose |
| --- | --- | --- |
| GET | empty | List cover/screenshots, including DRAFT |
| GET | `/{mediaId}/content` | Authenticated image bytes |
| POST | `/cover` | Create cover |
| PUT | `/cover` | Replace cover, preserving backend ID |
| DELETE | `/cover` | Delete cover |
| POST | `/screenshots` | Add screenshot at the end |
| PUT | `/{mediaId}/metadata` | `{altText, caption}` |
| PUT | `/screenshots/order` | `{screenshotIds}` with every screenshot exactly once |
| DELETE | `/screenshots/{mediaId}` | Delete screenshot |

Public GETs: `/api/v1/games/{gameId}/media` and `/api/v1/games/{gameId}/media/{mediaId}/content`. Spring Boot returns 404 for DRAFT, including requests with an ADMIN token. Public BFF reads never forward one.

Uploads forward a newly constructed multipart body containing only `file`, `altText` and `caption`. The fetch implementation sets the boundary; browser headers, cookies, filenames in URLs, arbitrary upstream URLs and upstream response headers are not proxied. JSON and DTOs are validated at the boundary. Content URLs must exactly match the documented parent/media path; the BFF builds its own path from positive safe-integer IDs.

## Security and transport

Existing OIDC sessions and server-only HTTP error handling are reused. Mutation Route Handlers require a live session, exact configured Origin and session CSRF header. A reader cannot pass the backend ADMIN preflight. Tokens are never sent in props or to browser storage. Backend errors are mapped to safe messages, including 413 limits and 415 invalid image content.

Next 16.4.3's installed docs specify a 1 MB default Server Action limit. Uploads instead use a Route Handler with bounded stream reads, checking both declared and actual bytes before multipart parsing. Limit: 10 MiB + 64 KiB multipart overhead; file limit: 10 MiB; JSON mutation limit: 64 KiB. Missing Content-Length does not bypass the stream limit. File name, extension, MIME and metadata lengths are checked locally; actual decoding, 20-million-pixel limit and recoding remain authoritative in Spring Boot. The existing backend global multipart limits are 10 MB/file and 11 MB/request. Proxy limits must accommodate this; no deployment configuration was changed.

Images are streamed through separate same-origin public/admin BFF routes, accepting only 200 PNG/JPEG responses, without redirects or conditional/cache validators. Every result, including errors, has `Cache-Control: no-store, private`, `X-Content-Type-Options: nosniff` and `Cross-Origin-Resource-Policy: same-origin`. Next Image is unoptimized for media, and `images.localPatterns` only allows built static assets into the optimizer, preventing direct optimizer requests from caching dynamic public media. A fresh render revision in the displayed URL forces re-fetch after same-ID cover replacement, even if dimensions and byte size are unchanged.

Already displayed/downloaded image bytes cannot be recalled from a visitor. After unpublication, subsequent content requests are checked by Spring Boot and return 404. There is no persistent media cache, public filesystem mount or permanent storage URL in this integration. External users must not be given direct access to the backend storage directory.

## Files

- New `src/features/game-media/{contracts.ts,data.ts,transport.ts,forms.tsx,pages.tsx,public-gallery.tsx}`.
- New `src/app/admin/[id]/media/page.tsx` and three BFF routes under `src/app/api`: administrative media mutations; administrative content; public content.
- Updated `src/server/admin-http.ts` to transport FormData without setting a JSON content type, using a 30-second upload timeout; existing JSON behavior is preserved.
- Updated `src/features/admin-games/pages.tsx`, `src/features/game-releases/public-page.tsx` and `next.config.ts` for navigation, gallery composition and optimizer exclusion.
- Tests: new `tests/media-cases.ts` and `tests/support/media-fixture.mjs`; registered in the existing serial admin tests and shared isolated OIDC/API fixture.
- Documentation: README and this report. No dependencies or secrets added; no commits or push.

## Verification

Automated coverage includes cover upload/replacement/deletion, multi-upload, metadata, order, screenshot deletion, confirmation, anonymous/reader denial, CSRF, DRAFT content privacy, publication/unpublication, optimizer exclusion, exact 10 MiB plus multipart overhead, oversized requests, invalid formats/content, upstream pixel rejection, contract validation, unavailable/missing images and mobile layout. Tests use isolated fixtures and never mutate Arcane Drift.

Verification on 2026-11-04: lint and typecheck passed; full development suite 54/54 passed; production build passed; production suite 30/30 passed. The initial sandbox build failed in the internal Turbopack CSS subprocess; its cached failure persisted outside the sandbox and was resolved by removing only the generated `.next/cache` and rebuilding. No application/style workaround or dependency change was needed. An initial UI test exposed duplicate sibling React keys in the upload form; distinct keys corrected the file selector and the complete scenario then passed in development and production.

Real Keycloak/Spring Boot verification: the user signed in manually as ADMIN. Created only the disposable game `QA Media Temporal` (game ID 6). Uploaded PNG cover media ID 1, replaced it preserving its ID, uploaded screenshots media IDs 2 and 3, edited ID 3 alt text/caption, moved it to position 1 and confirmed persistence after reload. Published the game and confirmed all three images loaded on `/games/6`, with edited metadata and order preserved. Anonymous public content returned 200 PNG with `no-store, private`; after unpublication the same content URL returned 404. Administrative content without a session returned 401. The DRAFT game page shows the not-found UI (with streaming, the document HTTP status can already be 200; the content endpoint itself returns 404).

Cleanup completed with the user's explicit authorization: deleted cover media ID 1, screenshot ID 2, then screenshot ID 3, all belonging exclusively to game ID 6. The admin media list showed both `No cover yet.` and `No screenshots yet.`. Before deleting the game, authenticated navigation to each of its three administrative content routes returned the mapped resource-not-found error. Only then was `QA Media Temporal` (game ID 6) deleted. The admin list subsequently showed only Arcane Drift; reopening `/admin/6` showed resource not found.

The four successful DELETE operations were accepted by the strict server HTTP adapter: the deletion decoders accept only `undefined`, which this adapter produces only for HTTP 204 (all other successful responses must parse as JSON). This verifies the backend 204 contract through the running application, rather than through a separately captured network trace. The media BFF translates success to JSON HTTP 200; game deletion redirects to the admin list. The mapped administrative resource-not-found message comes from HTTP 404. Direct anonymous HTTP checks after cleanup also returned 404 for `/api/v1/games/6`, `/api/v1/games/6/media` and the content routes for IDs 1, 2 and 3.

Arcane Drift (game ID 1), its versions, downloads and media match the public read-only reference `test-results/arcane-before-media-check.json` after cleanup (genre IDs compared in sorted order). Evidence: `test-results/media-live-published.png`, `test-results/media-live-delete-confirmation.png` and `test-results/media-live-cleaned.png`. Reader denial is covered automatically; a real non-ADMIN account remains unavailable as previously agreed. No code changed after the successful full verification; subsequent changes were documentation and live-test cleanup only.

## Operational limits

- Existing sessions require a single persistent Node deployment; the integration adds no new session storage.
- Uploads are sequential, not transactional across multiple files. On partial failure the UI reports successes and requires reload before retrying; no automatic retries that could duplicate screenshots.
- Browser file type/size checks are advisory; the BFF and backend enforce their own limits. Backend error bodies are not exposed.
- No S3 adapter, image transformations, crop editor, upload progress percentage or retry queue is introduced. Full screenshots open in a separate tab using the protected content endpoint.
