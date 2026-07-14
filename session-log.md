# session-log.md — Codex Handoff Log

This file records important project context and changes for future Codex sessions.

## 2026-07-10 — Verify CreateVideoModal filterKey in a clean local runtime

### Root Cause

- Current Admin Web source and the freshly served Vite module already send normalized `filterKey` for create flows; the issue was stale/inconsistent local runtime or browser state rather than missing form/API-client code.
- All stale Node processes were stopped, the Vite dependency cache was cleared, and Admin Web was rebuilt and restarted from this repository against the intended local API.
- The original pre-clean browser request was not available, so the stale process versus stale browser lazy-chunk boundary cannot be identified more narrowly without guessing.

### Runtime Evidence

- A fresh headless Chrome session logged in through the real UI and submitted `CreateVideoModal` in embed mode with `filterKey=sml`.
- The actual browser create request contained `filterKey: "sml"` and returned `201` with the same key.
- The following video detail and list responses both contained `filterKey: "sml"`.
- `VideoInfoPanel` displayed `sml` immediately; opening `EditVideoModal` was not required.
- The temporary smoke video was disabled and purged after verification.

### Changed

- No Admin Web implementation code was changed in this runtime pass because the actual create request and UI response path passed after clean startup.
- Updated this session log with the runtime diagnosis and clean-start procedure.

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- `yarn test` ran the existing placeholder script successfully.
- Vite started from `C:\Users\Administrator\Desktop\code\bom-media-admin` on port 5173 and used the configured local API.

### Pending

- Existing browser tabs should be hard-refreshed or have local site data cleared before retesting.
- Deploy the backend API and its `filterKey` migration before any Admin Web production deployment if production has not yet received them.

## 2026-07-10 — Audit CreateVideoModal filterKey persistence

### Confirmed

- `CreateVideoModal` registers and normalizes `filterKey` and includes it for manual, embed, and LOCAL_FILE modes.
- The API client preserves the key in JSON create payloads, multipart `FormData`, and LOCAL_FILE init metadata.
- The deployed Admin Web lazy Create Video/API chunks contain the same `filterKey` payload behavior.
- Current Admin Web source therefore required no create-payload code change; the production symptom is on the deployed API create path/runtime rather than the current form or API client.

### Files Changed

- `session-log.md`

### Verified

- Backend end-to-end local HTTP smoke confirmed manual, embed, multipart, and LOCAL_FILE create responses/details/lists retain their normalized keys.
- Existing edit payload still sends a normalized key or `null` when clearing.
- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- `yarn test` ran the existing placeholder script successfully.
- `git diff --check` passed and no npm/pnpm lockfiles were found.

### Pending

- Deploy the current backend API and pending Prisma migrations, restart the API, then repeat production create/detail/list checks.
- Browser Network verification should confirm the production create request contains `filterKey` and the create response returns the same value.

## 2026-07-10 — Harden Dashboard production video search errors

### Changed

- Preserved the existing 400 ms debounce, two-character minimum, AbortController cancellation, request-version guard, cache behavior, load more, and selected-video behavior.
- Kept previously loaded videos visible when a search or filter request fails.
- Changed active search failures to the scoped inline message `Không thể tìm video lúc này. Vui lòng thử lại.` and active key-filter failures to `Không thể lọc video lúc này. Vui lòng thử lại.`.
- Ensured active search/filter failures render in the video picker retry area even when the initial default dataset has not completed, instead of escalating them into a full Dashboard error.
- Fixed successful website loading to return `true`, so manual Dashboard refresh can correctly report success when both website and video reloads succeed.

### Files Changed

- `src/pages/DashboardPage.tsx`
- `session-log.md`

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- `yarn test` ran the existing placeholder script successfully.
- `git diff --check` passed; no npm/pnpm lockfiles were found.

### Pending

- Manual browser verification against the deployed current API: refresh Dashboard, search `jeffy`, case variants and no-result terms, clear search, retry a simulated failure, and use manual `Tải lại`.
- Deploy/restart the backend API before the Admin Web build. If production search still returns `500`, capture the sanitized backend exception/Prisma code; Admin Web cannot determine the database-side cause.

## 2026-07-04 — Admin Web video filterKey UI

### Changed

- Added optional `filterKey` to video types, admin video list params, create payloads, LOCAL_FILE upload init payloads, and update payloads.
- Added frontend `filterKey` normalization/validation matching the backend contract: lowercase letters, numbers, underscores, max 64 chars, and reserved `all` rejected.
- Added `filterKey` fields to Create/Edit Video modals with blur normalization and Vietnamese validation copy.
- Added `/videos` filter-by-key UI while preserving manual search, status tabs, pagination, abort/request-version guards, and inline search errors.
- Added Dashboard share-link picker filter-by-key support while preserving selected video IDs, search debounce/min-length, load more, cache keys, manual refresh, and lazy thumbnails.
- Added key badges/metadata display on video cards, Dashboard ready-video cards, and video detail info panel.
- Updated Admin Web docs/checklists with `filterKey` behavior and deploy ordering.

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` initially flagged three touched TSX files; focused Prettier was run on those files and `yarn format:check` then passed.
- `yarn build` passed.
- `yarn test` ran the current placeholder script (`TODO_TEST: Admin web tests will be added later`) successfully.
- `git diff --check` passed.
- `git ls-files --others --exclude-standard | findstr /i "package-lock pnpm-lock"` found no npm/pnpm lockfiles.

### Pending

- Deploy backend API with the `VideoAsset.filterKey` migration before deploying this Admin Web build.
- Manual browser smoke tests against the updated backend: create/edit key, `/videos` key filter, Dashboard key filter, share-link creation with selected videos preserved across filters.

## 2026-07-03 — Dashboard initial video load after refresh

### Root cause

- `src/main.tsx` uses `React.StrictMode`, so local dev can mount, unmount, and remount Dashboard.
- The first Dashboard video request could be aborted during StrictMode cleanup.
- `dashboardCache.ts` deduped in-flight video page requests through a module-level `videoPageRequests` map, so the second mount could receive the aborted promise instead of starting a fresh request.
- `DashboardPage.tsx` marked `hasLoadedVideos=true` in `finally` even for canceled initial requests, causing the video picker to leave skeleton state with an empty video list until manual refresh bypassed cache.

### Changed

- Added `dedupeRequests?: boolean` to `loadDashboardVideoPage()` while preserving successful in-memory page caching and stale-time behavior.
- Made Dashboard first-page video requests opt out of in-flight request dedupe because they are tied to an AbortController lifecycle.
- Updated Dashboard canceled-request handling so a canceled first video load does not mark videos as successfully loaded.
- Incremented the video request version on Dashboard unmount before aborting, preventing stale StrictMode cleanup work from updating obsolete state.
- Kept manual `Tải lại`, website loading, search, load more, lazy thumbnails, and share-link creation behavior unchanged.

Files changed in this pass:

```txt
src/features/dashboard/dashboardCache.ts
src/pages/DashboardPage.tsx
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.

### Pending

- Browser Network verification on `http://localhost:5173/`: refresh Dashboard repeatedly and confirm the first READY video page loads automatically without clicking `Tải lại`.
- Verify quick Dashboard → `/videos` → Dashboard navigation uses fresh cache or loads automatically.
- Verify Dashboard search, clear search, Load more, and manual refresh still work.

## 2026-06-29 — Cross-project admin video search pipeline audit

### Changed

- Audited the Admin Web Dashboard search path against the backend search-hardening work in `bom-media-api`.
- Preserved the existing Dashboard implementation:
  - 24-item READY video pages
  - 400 ms debounce
  - normalized search text
  - two-character minimum before calling `/admin/videos`
  - abortable first-page video requests
  - inline picker hint/error UI
  - successful-response dashboard cache
  - lazy, cached, concurrency-limited LOCAL_FILE thumbnails
- No additional Admin Web code changes were needed in this pass beyond the existing uncommitted Dashboard search-safety files.

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- No `package-lock.json` or `pnpm-lock.yaml` was found in the Admin Web or API repo roots.

### Pending

- Deploy the API search fix first, running `yarn prisma migrate deploy` on production only if the backend migration has not been applied.
- Deploy the rebuilt Admin Web after the API deploy.
- Manually verify Dashboard search:
  - one-character input such as `i` sends no API request
  - valid input such as `i fell` sends one debounced request
  - special characters do not crash the page
  - clearing search reloads READY videos
  - Load more works for normal and searched lists
  - selected videos persist and share-link creation still succeeds

## 2026-06-29 — Dashboard video search safety hardening

### Root cause

- Dashboard video pagination, load more, cache, and thumbnail request throttling were already in place.
- The remaining frontend risk was the search-as-you-type path: one-character searches such as `search=i` could still be sent to `/admin/videos`, and stale first-page search requests were only ignored by version guards instead of being actively canceled.
- Backend search failures are being fixed separately, but the Admin Web should avoid expensive low-signal search requests and keep search failures local to the video picker.

### Changed

- Added Dashboard video search constants:
  - debounce: 400 ms
  - minimum search length: 2 characters
  - maximum normalized search length: 80 characters
- Added Dashboard search normalization: trim, collapse repeated whitespace, and cap to 80 characters before using the value for debounced search, API params, and cache keys.
- Short non-empty searches now skip `/admin/videos` entirely and show the inline hint: `Nhập ít nhất 2 ký tự để tìm video.`
- Added optional `AbortSignal` support to `getVideos()` and pass it to Axios.
- Dashboard now aborts stale first-page video requests, keeps the request-version guard, and suppresses errors for canceled requests.
- Search failures after initial load now show as an inline picker error with a `Thử lại` action instead of replacing the Dashboard with a global red error or toast-spamming during typing.
- Load more now refuses to run while search debounce is pending, the first page is refreshing, the query is below minimum length, or the current picker search is in an error state.
- Existing selected video IDs remain untouched when search changes, including when selected videos are hidden by the current search.
- Dashboard video cache keys now normalize search whitespace; successful responses remain cached, while canceled/failed/short-search states are not cached.

Files changed:

```txt
src/pages/DashboardPage.tsx
src/features/dashboard/dashboardCache.ts
src/features/dashboard/dashboardTypes.ts
src/features/dashboard/components/ShareLinkComposer.tsx
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/videos/videoApi.ts
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- `git diff --check` passed with Windows LF-to-CRLF working-copy notices only.
- No `package-lock.json` or `pnpm-lock.yaml` was created.

### Manual test notes

- Browser/API-panel manual verification was not run in this session.
- Recommended manual checks:
  - Open Dashboard and confirm the initial `/admin/videos` request uses `limit=24`.
  - Type `i` and confirm no `/admin/videos?...search=i` request is sent.
  - Confirm the picker shows `Nhập ít nhất 2 ký tự để tìm video.` without a global Dashboard error.
  - Type `i fell` and confirm only one debounced request is sent after typing pauses.
  - Type quickly through `i`, `i `, `i f`, `i fe`, `i fel`, `i fell` and confirm stale requests are canceled or ignored.
  - Clear search and confirm normal READY videos reload.
  - Confirm Load more works for normal and valid search results.
  - Confirm selected videos remain selected across search changes and share-link creation still uses the selected IDs.
  - Confirm no secrets, tokens, or Authorization headers appear in console logs.

### Pending

- Run the manual browser checks above against a local or production-like backend after the backend search fix is deployed.

## 2026-06-29 — Hostinger SPA fallback for Admin Web deep routes

### Root cause

- Admin Web uses React Router history routing through `createBrowserRouter`.
- Local Vite dev/preview servers fall back to `index.html`, but Hostinger Apache/LiteSpeed was only serving real files/folders.
- Direct opens or browser refreshes on extensionless client routes such as `/videos`, `/websites`, and `/videos/:videoId` therefore returned Hostinger's document-level 404 before React loaded.
- This was a static hosting rewrite issue, not a React route, API, or auth bug.

### Changed

- Updated `public/.htaccess` with `Options -MultiViews` and an Apache rewrite fallback to serve `index.html` for extensionless Admin Web routes.
- Kept existing file/directory handling before the fallback so real assets continue to be served normally.
- Excluded `/api` from the fallback in case the admin domain ever proxies API requests.
- Preserved no-cache headers for `index.html`; immutable `/assets/*` caching remains in `public/assets/.htaccess`.
- Updated Hostinger/Cloudflare deployment notes and production smoke-test docs to require uploading hidden `.htaccess` files and verifying deep-route refresh behavior.

Files changed:

```txt
public/.htaccess
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- `yarn.cmd format:check` passed.
- Focused Markdown Prettier check passed for the deployment/checklist/smoke-test docs and this log entry.
- `git diff --check` passed with Windows LF-to-CRLF working-copy notices only.
- `dist/.htaccess` and `dist/assets/.htaccess` were copied into the production artifact.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Manual production test notes

- Live pre-deploy curl checks on `bom-media-admin.site` confirmed the current production state still needs the rebuilt artifact uploaded:
  - `/` returns `200 OK` and serves Admin Web `index.html`.
  - `/videos`, `/websites`, and `/videos/fdd79f89-e372-456d-a30e-c907b0d0d75e` return Hostinger `404 Not Found`.
  - A real current hashed JS asset returns `200 OK` with `Cache-Control: public, max-age=31536000, immutable`.
  - A missing `.js` asset returns `404 Not Found`.
- After deployment, verify Hostinger uploads hidden files and that `.htaccess` exists at the active document root, usually `public_html/.htaccess` for `bom-media-admin.site`.
- Run again after deployment:

  ```bash
  curl -I https://bom-media-admin.site/
  curl -I https://bom-media-admin.site/videos
  curl -I https://bom-media-admin.site/websites
  curl -I https://bom-media-admin.site/videos/fdd79f89-e372-456d-a30e-c907b0d0d75e
  curl -I https://bom-media-admin.site/assets/<real-built-js-file>.js
  ```

- Expected result after the rebuilt `dist` is uploaded: extensionless SPA routes return `200 OK` and serve Admin Web HTML; real hashed assets return their asset content type and immutable cache header; missing extension-based assets should not be rewritten to `index.html`.
- The unrelated `td.doubleclick.net/... 404` console request is not part of this SPA fallback fix.

### Pending

- Deploy the rebuilt `dist` contents, including hidden `.htaccess`, to Hostinger.
- Verify direct browser open and refresh for `/videos`, `/websites`, and `/videos/:videoId`.
- Confirm logged-out protected deep routes load the app shell and redirect to `/login` instead of showing Hostinger 404.

## 2026-06-23 — Admin-wide route and bundle performance hardening

### Audit

- Preserved the completed Dashboard 24-item pagination, debounced search, response cache, and four-request local-thumbnail queue.
- Preserved the completed parallel 401 refresh queue and cancellation handling.
- Confirmed all major pages were still imported eagerly by the router.
- Confirmed Create Video and Edit Video modal modules were bundled with their parent page before the modal was opened.
- Confirmed Vite production minification was enabled by default and public source maps were disabled by default, but the policy was not explicit in config.
- Confirmed normal thumbnail images already reserve `aspect-video` space and use `loading="lazy"` plus `decoding="async"`.
- Confirmed the self-hosted Google Sans CSS already uses `font-display: swap`; no external font preconnect/preload is needed.
- Found the main Videos list still fetched every mounted LOCAL_FILE thumbnail immediately even though Dashboard thumbnails were already visibility-gated.

### Changed

- Converted Login, Dashboard, Videos, Video Detail, Websites, Domains, and Settings pages to `React.lazy` route chunks without changing route URLs or auth guards.
- Added a lightweight shared route loading skeleton within `Suspense`.
- Lazy-loaded the existing Create Video and Edit Video modal modules only when opened, with a small modal loading fallback.
- Reused the existing local-thumbnail object URL cache, failure TTL, request deduplication, and four-request queue in the main Videos list.
- Added `IntersectionObserver` with a 250 px root margin to LOCAL_FILE video cards so list thumbnails fetch only near the viewport.
- Made Vite production `minify: true` and `sourcemap: false` explicit.
- Added Hostinger Apache cache headers:
  - `index.html`: no-cache/no-store
  - generated `/assets/*`: one-year immutable
- Documented matching Cloudflare behavior and clarified that admin API/authenticated media responses must remain private/no-store.
- Updated the production checklist, smoke test, and plan to reflect route splitting and cache verification.

Files changed for this performance pass:

```txt
src/app/router.tsx
src/components/common/RouteLoadingFallback.tsx
src/components/common/LazyModalFallback.tsx
src/pages/VideosPage.tsx
src/pages/VideoDetailPage.tsx
src/features/videos/components/VideoCard.tsx
vite.config.ts
public/.htaccess
public/assets/.htaccess
PLAN.md
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Bundle result

- The previous unsplit main JavaScript artifact was approximately 865 kB.
- The new initial JavaScript artifact is approximately 366 kB (about 115 kB gzip).
- Vite emitted separate chunks for all major pages.
- Create Video and Edit Video are separate on-demand chunks.
- The previous Vite `>500 kB` chunk warning no longer appears.

### Intentionally not changed

- Did not add a bundle-analyzer dependency because the production build output already proved the required boundaries.
- Did not add `manualChunks`; route/modal splitting removed the warning without fragile vendor partitioning.
- Did not add font preload/preconnect or replace the existing font package because fonts are self-hosted, unicode-ranged, and already use `font-display: swap`.
- Did not change API contracts, routes, auth behavior, public URL normalization, or share-link payloads.
- Did not rewrite Websites/Domains list UX; deeper pagination there should be driven by production volume measurements and a separate scoped change.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build emitted separate page chunks plus `CreateVideoModal` and `EditVideoModal` chunks.
- `dist/.htaccess` and `dist/assets/.htaccess` were copied into the production artifact.
- Focused Prettier checks passed after formatting touched files.
- `git diff --check` passed with Windows LF-to-CRLF notices only.
- No `package-lock.json` or `pnpm-lock.yaml` files were created.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 14 pre-existing unrelated files; all files changed by this performance pass pass Prettier.

### Pending

- Run the production build locally and manually verify Login, Dashboard, Videos, Video Detail, Websites, Domains, Settings, create/upload modal, edit modal, share-link creation, and public URL normalization.
- Verify Hostinger uploads hidden `.htaccess` files and returns the documented cache headers.
- If Cloudflare overrides origin headers, add matching ordered cache rules in the Cloudflare dashboard.
- Confirm Videos list LOCAL_FILE thumbnails load progressively and 429 failures remain placeholders.

## 2026-06-23 — Parallel 401 refresh queue hardening

### Root cause

- The protected Axios client already shared an in-flight refresh promise, but a slower request could return 401 just after that promise completed and start a second refresh with the newly rotated refresh token.
- Requests did not carry a non-secret auth-session version, so the interceptor could not distinguish a late 401 from a current-token 401.
- Axios `CanceledError` responses were normalized as network failures, which could produce an incorrect error toast for an intentionally aborted upload.
- Missing/failed refresh handling did not have an explicit single-shot session-clear guard.

### Changed

- Added a typed `_authSessionVersion` field alongside `_retry` on protected Axios request configs.
- Every protected request now replaces any stale Authorization value with the current Redux session access token.
- Kept one module-level `refreshPromise`; all parallel first-attempt 401 responses wait for that same refresh.
- Added token-generation tracking so a late 401 from the previous access token retries once with the already-current token instead of starting another refresh.
- Kept retries bounded to one attempt and excluded login, refresh, and logout endpoints from refresh interception.
- Added a single-shot refresh-auth-failure latch so parallel 401/403 refresh failures clear the Redux session once and let the existing protected-route flow show the Vietnamese session-expired message on Login.
- Preserved the existing session on canceled, network, 429, and 5xx refresh failures so temporary API trouble does not force logout.
- Removed the interceptor hard reload; `ProtectedRoute` now performs the redirect after synchronous auth clearing.
- Prevented an in-flight refresh response from restoring a session after logout or another session replacement.
- Tagged protected requests with the safe admin ID and canceled stale responses if the active admin session changed before retry.
- Routed `/admin/auth/me` through the protected Axios client so it uses the same current-token and retry behavior.
- Added cancellation-aware API error normalization for Axios `CanceledError` and `AbortError`.
- Suppressed the local-upload error toast when the upload was intentionally canceled.
- Protected video/thumbnail Blob requests continue using `axiosClient`, so they participate in the same refresh queue and retain their existing placeholder/fallback handling.

Files changed for this auth pass:

```txt
src/lib/api/axiosClient.ts
src/lib/api/apiError.ts
src/features/auth/authApi.ts
src/features/auth/authSessionAccessor.ts
src/features/auth/components/AuthSessionBootstrap.tsx
src/features/videos/components/CreateVideoModal.tsx
src/store/index.ts
session-log.md
```

### Refresh queue design

- The first eligible 401 marks its request `_retry`, then creates `refreshPromise`.
- Concurrent 401 responses await the same promise; only one `/admin/auth/refresh` request is sent.
- Refresh success updates Redux with the rotated access/refresh tokens before waiting requests retry.
- Requests tagged with an older auth-session version reuse the already-current access token without refreshing again.
- Requests from a different/cleared admin session are canceled instead of being replayed under the replacement session.
- A retried request cannot enter the refresh flow again.
- Refresh 401/403 clears auth once; all waiters receive the same refresh rejection.
- Canceled, network, 429, and 5xx refresh failures reject consistently but preserve the current session for a later retry.
- Canceled requests reject as cancellation and do not clear auth or display the upload error toast.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build still reports the existing Vite large-chunk warning.
- Changed-file Prettier check passed:
  `yarn.cmd prettier --ignore-path ../../.prettierignore --check src/lib/api/axiosClient.ts src/lib/api/apiError.ts src/features/auth/authApi.ts src/features/auth/authSessionAccessor.ts src/features/auth/components/AuthSessionBootstrap.tsx src/features/videos/components/CreateVideoModal.tsx src/store/index.ts`
- `git diff --check` passed; Git only reported Windows LF-to-CRLF working-copy notices.
- No `package-lock.json` or `pnpm-lock.yaml` files were found.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 17 pre-existing unrelated files; all files changed by this auth pass Prettier-check successfully.

### Manual test notes

- A live expiry/refresh browser test was not run because this session did not have a controllable deployed/local backend session with forced access-token expiry.
- Static verification confirms one shared refresh promise, one retry marker, stale-token generation detection, current-token replacement, single-shot session clearing, and cancellation bypass.
- Source scan found no token, refresh token, Authorization header, password, or secret console logging.

### Pending

- Force an expired access token with valid refresh token and confirm Dashboard metadata plus thumbnail 401 responses produce exactly one refresh request and successful retries.
- Revoke/expire the refresh token and confirm auth clears once, Login shows `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.`, and no retry loop occurs.
- Abort a LOCAL_FILE upload and confirm no error toast and no logout.
- Inspect production console and Network tooling to confirm no application log exposes tokens or Authorization values.

## 2026-06-23 — Dashboard video pagination and lazy thumbnail loading

### Root cause

- Dashboard requested up to 100 READY video records on every mount and remount.
- Every mounted LOCAL_FILE card with a local thumbnail immediately fetched the protected `/admin/videos/:id/thumbnail` Blob in `useEffect`, so `loading="lazy"` on the later `<img>` did not prevent authenticated request bursts.
- Navigating away and back recreated the dashboard requests because the screen had no short-lived server-response cache.

### Changed

- Added 24-item READY video pages with `createdAt desc` ordering, a Vietnamese “Tải thêm video” action, and append-without-clearing behavior.
- Moved Dashboard video search to the server with a 300 ms debounce and page-1 reset while preserving selected video IDs across loaded pages and searches.
- Added a per-admin, in-memory 60-second cache for active websites and READY video page responses keyed by search, page, limit, status, sort field, and sort order.
- Manual Dashboard refresh bypasses both caches, keeps existing content visible, and shows a subtle refresh state.
- Refactored Dashboard video cards into memoized cards and uses a memoized selected-ID `Set`.
- LOCAL_FILE thumbnails now wait for an `IntersectionObserver` with a 250 px root margin before entering a four-request concurrency queue.
- Added thumbnail request deduplication, a 150-entry object-URL cache, active-consumer leases to prevent revoking visible images, checksum/updated-at version keys, and a 60-second failure cache.
- Kept non-LOCAL_FILE thumbnails on normal safe HTTP(S) `<img loading="lazy" decoding="async">` rendering.
- Kept share-link payloads and creation behavior unchanged; Dashboard still fetches metadata and thumbnails only.

Files changed:

```txt
src/pages/DashboardPage.tsx
src/features/dashboard/components/ShareLinkComposer.tsx
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/dashboard/dashboardCache.ts
src/features/dashboard/dashboardThumbnailCache.ts
src/features/videos/videoApi.ts
session-log.md
```

### Performance strategy

- Bound initial video metadata work to 24 records instead of 100.
- Fetch additional metadata only on explicit load-more actions.
- Reuse fresh page and website responses for 60 seconds, including React Strict Mode in-flight request deduplication.
- Start protected local-thumbnail requests only near the picker viewport and cap active requests at four.
- Reuse successful object URLs for the admin session and suppress repeated failures for 60 seconds.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build still reports the existing Vite large-chunk warning.
- Changed-file Prettier check passed:
  `yarn.cmd prettier --ignore-path ../../.prettierignore --check src/pages/DashboardPage.tsx src/features/dashboard/components/ShareLinkComposer.tsx src/features/dashboard/components/ReadyVideoPicker.tsx src/features/dashboard/dashboardCache.ts src/features/dashboard/dashboardThumbnailCache.ts src/features/videos/videoApi.ts`
- `git diff --check` passed; Git only reported the existing Windows LF-to-CRLF working-copy notices.
- No `package-lock.json` or `pnpm-lock.yaml` files were found.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 22 pre-existing unrelated files; all files changed by this task pass Prettier.

### Manual test notes

- A production-like browser test was not run because this session did not have a live authenticated backend/browser dataset with at least 40 READY videos.
- Static verification confirms Dashboard requests use `limit: 24`, READY status, paged server search, cache bypass on manual refresh, Intersection Observer gating, and four-request thumbnail concurrency.

### Pending

- Run the requested 40+ READY video browser test against a live authenticated backend.
- Confirm Network shows only page 1 initially, progressive `/admin/videos/:id/thumbnail` requests while scrolling, no 429 burst, successful cross-page selection/share-link creation, 60-second navigation cache reuse, and manual-refresh cache bypass.

## 2026-06-18 — Admin Web static-safe share URL normalization

### Summary

- Added an Admin Web share-link URL normalizer so backend `/s/<short-code>#/videos` URLs are displayed/copied as static hash-router URLs like `BASE_URL/#/s/<short-code>/videos`.
- Applied normalization in the websites API adapter for newly created share links and share-link lists, keeping Dashboard and share-link card UI unchanged.
- Added optional `VITE_PUBLIC_SHARE_BASE_URL` support for local nested public-site testing.

### Changed

- `.env.example`
- `docs/.env.production.example`
- `docs/06_API_CONTRACTS.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `src/features/websites/shareLinkUrlUtils.ts`
- `src/features/websites/websiteApi.ts`
- `src/vite-env.d.ts`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write src/features/websites/websiteApi.ts src/features/websites/shareLinkUrlUtils.ts src/vite-env.d.ts docs/06_API_CONTRACTS.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- Build still reports the existing Vite large chunk warning.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification: set `VITE_PUBLIC_SHARE_BASE_URL` to the local Danny public-site nested base, create a Dashboard share link, confirm the copied URL uses `/#/s/<short-code>/videos`, and open it in the public site.
- Verify production keeps `VITE_PUBLIC_SHARE_BASE_URL` unset unless a public site is intentionally deployed below a non-root path.

## 2026-06-15 — Remove unused Cloudinary and Legacy DB create modes

### Summary

- Removed Cloudinary Upload from the Create Video modal.
- Removed Legacy DB Upload from the Create Video modal.
- Kept Server/LOCAL_FILE, Manual URL, and Embed Code as the only create modes.
- Updated create-video validation so only `local-upload`, `manual`, and `embed` are accepted.
- Removed unused Admin Web Cloudinary upload and DB upload create helpers while keeping legacy DB_BLOB replacement/preview support.

### Changed

- `.env.example`
- `AGENTS.md`
- `src/features/videos/components/CreateVideoModal.tsx`
- `src/features/videos/videoApi.ts`
- `src/features/videos/videoSchemas.ts`
- `src/features/videos/videoTypes.ts`
- `src/vite-env.d.ts`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md`
- `docs/06_API_CONTRACTS.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write AGENTS.md .env.example src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoApi.ts src/features/videos/videoSchemas.ts src/features/videos/videoTypes.ts src/vite-env.d.ts docs/02_ADMIN_WEB_RULES.md docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md session-log.md`
  - This first formatting command failed only because Prettier cannot infer a parser for `.env.example`; all non-env files were checked.
- `yarn prettier --ignore-path ../../.prettierignore --write AGENTS.md src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoApi.ts src/features/videos/videoSchemas.ts src/features/videos/videoTypes.ts src/vite-env.d.ts docs/02_ADMIN_WEB_RULES.md docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md session-log.md`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `grep -R "Legacy DB\\|Upload DB\\|Tải lên Cloudinary\\|Cloudinary" src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoSchemas.ts || true`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- Removed UI string grep returned no matches for Create Video modal/schema.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification that Create Video shows only Server, Manual URL, and Embed Code.
- Manual creation tests for Server/LOCAL_FILE upload, Manual URL, and Embed Code against a live backend.
- Verify existing legacy DB_BLOB/CLOUDINARY records still render in list/detail when present.

## 2026-06-15 — Admin Web video status toggle modal

### Summary

- Replaced the video-card `window.confirm()` disable flow with a page-owned READY/DISABLED status confirmation modal.
- READY videos now show a Ban action that PATCHes status to `DISABLED`; DISABLED videos show a restore action that PATCHes status to `READY`.
- The modal explains that Disable is soft status change only and does not delete metadata, thumbnails, video files, or NVMe storage.
- DRAFT/PROCESSING/FAILED cards do not show an incorrect READY/DISABLED toggle.

### Changed

- `src/features/videos/components/VideoCard.tsx`
- `src/features/videos/videoApi.ts`
- `src/pages/VideosPage.tsx`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write src/pages/VideosPage.tsx src/features/videos/components/VideoCard.tsx src/features/videos/videoApi.ts`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification of READY -> DISABLED and DISABLED -> READY card actions against a live backend.
- Confirm no storage files are deleted by the status PATCH flow; storage reclaim remains the Video Detail purge flow.

## 2026-06-15 — Admin Web purge permanently storage reclaim UI

### Summary

- Replaced the Video Detail `window.prompt()` purge flow with an explicit danger-zone confirmation section.
- Purge now requires exact video ID plus an explicit risk acknowledgment checkbox before calling the backend.
- Added optional Cloudinary remote-delete confirmation only for Cloudinary videos with a provider asset id.
- Typed the expanded purge response defensively so Admin Web can show LOCAL_FILE video/thumbnail delete results, reclaimed bytes, and orphan-cleanup warnings when the backend provides them.
- Clarified that video card disable is soft-disable only and does not reclaim storage.
- Updated API contract and production smoke-test docs for disable-vs-purge behavior and storage reclaim feedback.

### Changed

```txt
src/features/videos/videoApi.ts
src/features/videos/videoTypes.ts
src/features/videos/components/VideoCard.tsx
src/pages/VideoDetailPage.tsx
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Verified

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
yarn test
git diff --check -- src/features/videos/videoApi.ts src/features/videos/videoTypes.ts src/features/videos/components/VideoCard.tsx src/pages/VideoDetailPage.tsx docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print
```

- Typecheck passed.
- Lint passed.
- Format check passed.
- Build passed. Vite still reports the existing large-chunk warning.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser/API purge test against a backend that returns the expanded purge response.
- Verify backend blocker errors for videos still assigned to websites/share links.
- Confirm physical LOCAL_FILE file deletion on the server storage root after purge.

## 2026-06-14 — Admin Web LOCAL_FILE upload integration

### Changed

- Resumed the partial LOCAL_FILE implementation instead of replacing it.
- Added LOCAL_FILE video/source types, upload-session/progress types, local asset metadata fields and Vite chunk-size env typing.
- Added Admin Web API helpers for chunked LOCAL_FILE upload init/chunk/complete/cancel, authenticated local video/thumbnail Blob preview, local thumbnail replacement and guarded purge.
- Made Server Storage the preferred Add Video mode while preserving manual URL, embed, Cloudinary upload and legacy DB upload.
- Added sequential chunk upload progress, cancel/abort handling and safe upload messaging.
- Kept captured/selected LOCAL_FILE thumbnails on backend local storage; external thumbnail URLs are patched as metadata only when explicitly provided.
- Updated video cards, dashboard ready-video picker and source filters so READY LOCAL_FILE videos are shown as shareable server videos.
- Added LOCAL_FILE admin preview support through protected API Blob fetches and added authenticated local thumbnail display for cards/picker/player/edit preview.
- Added LOCAL_FILE thumbnail replacement in the edit modal.
- Added guarded permanent purge action on video detail using exact video id confirmation.
- Updated env examples and Admin Web docs to reflect LOCAL_FILE/private server storage as the preferred production large-video path and DB_BLOB as small fallback only.

Files changed in this continuation:

```txt
.env.example
AGENTS.md
PLAN.md
docs/.env.production.example
docs/01_ARCHITECTURE.md
docs/02_ADMIN_WEB_RULES.md
docs/04_DATABASE_RISK_REGISTER.md
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/videos/components/CreateVideoModal.tsx
src/features/videos/components/EditVideoModal.tsx
src/features/videos/components/VideoCard.tsx
src/features/videos/components/VideoInfoPanel.tsx
src/features/videos/components/VideoPlayerPanel.tsx
src/features/videos/components/VideosEmptyState.tsx
src/features/videos/videoApi.ts
src/features/videos/videoSchemas.ts
src/features/videos/videoSourceUtils.ts
src/features/videos/videoTypes.ts
src/pages/VideoDetailPage.tsx
src/vite-env.d.ts
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed after formatting touched TSX files.
- `yarn build` passed. Vite still reports the existing large bundle warning.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Manual browser/API testing against the live backend is still required:
  LOCAL_FILE init/chunks/complete, cancel cleanup, local thumbnail upload, admin preview, share-link picker inclusion, public playback from backend/public site, and guarded purge rejection/success cases.
- Admin preview currently fetches protected LOCAL_FILE media as a Blob because native `<video src>` cannot attach the admin Bearer token. This is acceptable for verification but should be revisited if admins preview very large files often.
- Existing unrelated auth/settings documentation and source changes were already present in the worktree and were preserved.

## 2026-06-14 — Settings password-change verification

### Changed

- Verified the live Settings route already exists at `/settings` and is protected by `ProtectedRoute`.
- Confirmed the live typed password-change contract is `oldPassword`, `newPassword`, and `secretCode`.
- Updated `SettingsPage` copy/validation to Vietnamese auth UX.
- Preserved React Hook Form + Zod validation and current styling.
- Added safe form-level API errors.
- Added explicit handling for backend `401` verification failure on `/admin/auth/change-password` so wrong current password/secret shows a safe password-change error instead of a misleading session-expired message.
- On successful password change, local auth is cleared, Redux Persist is flushed, in-memory token accessors clear through store synchronization, and the admin is redirected to `/login`.
- Updated docs/checklists to mark Settings password-change UI as implemented while keeping browser/API verification pending.

Files changed:

```txt
src/pages/SettingsPage.tsx
docs/02_ADMIN_WEB_RULES.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
PLAN.md
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed. Vite still reports a large chunk warning; this is existing bundle optimization work, not caused by Settings.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Browser/API manual testing still needed:
  login, open `/settings`, validation errors, wrong password/secret, successful password change, redirect to `/login`, old session denied, login with new password, 429 behavior.

## 2026-06-14 — Production smoke-test checklist

### Changed

- Added `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md` with a concrete release smoke-test workflow.
- Covered pre-deploy checks, build artifact checks, production Vite env policy, deployment smoke tests, auth/logout/refresh tests, protected routes, feature screens, API docs exposure, Cloudflare checks, public mini-admin absence, incident/rollback notes, and evidence template.
- Added safe placeholder smoke script docs under `scripts/smoke/`.
- Updated README, production checklist, Codex workflow, backlog, and PLAN references to point release work at the smoke-test checklist.

Files changed:

```txt
README.md
PLAN.md
docs/07_PRODUCTION_CHECKLIST.md
docs/08_CODEX_WORKFLOW.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
scripts/smoke/README.md
scripts/smoke/api-smoke.example.sh
session-log.md
```

### Verified

- Documentation/template-only change.
- `yarn format:check` passed.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.
- Typecheck/lint/build were not rerun because no source TypeScript changed in this pass.

### Pending

- Manual smoke tests still need to be run after deployment.
- Cloudflare Access/WAF/rate-limit settings are documented but not configured by this repo change.
- Secret rotation, backups, off-site backup copies, and restore tests remain external operator actions.

## 2026-06-14 — Admin Web backend logout integration

### Changed

- Wired `MainLayout` logout buttons to a centralized `logoutAdminThunk`.
- Logout now calls `POST /admin/auth/logout` with the current refresh token when one exists.
- Logout always clears local Redux auth state and flushes Redux Persist after the attempt.
- Logout clears in-memory token/session accessors through existing store synchronization.
- Added logout loading/disabled state to prevent duplicate revoke requests.
- Added safe logout success/warning toasts.
- Added normalized `429` API error handling for auth throttling UX.
- Kept refresh-on-401 retry behavior to one retry and clear only on true auth failures.
- Updated Admin Web security/API/checklist docs for backend logout integration.

Files changed:

```txt
src/features/auth/authApi.ts
src/features/auth/authSlice.ts
src/features/auth/components/AuthSessionBootstrap.tsx
src/lib/api/apiError.ts
src/lib/api/axiosClient.ts
src/layouts/MainLayout.tsx
docs/02_ADMIN_WEB_RULES.md
docs/03_SECURITY_MODEL.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
PLAN.md
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed. Vite still reports a large chunk warning; this is pre-existing build optimization work, not caused by logout integration.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.
- Backend live logout testing was not performed in browser during this pass.

### Pending

- Run browser smoke test against deployed/local backend:
  login, refresh-on-reload, logout revoke request, protected-route redirect, revoked-session 401, login 429.
- HttpOnly refresh cookie migration remains a future hardening task.

## 2026-06-14 — Admin Web Codex documentation pack created

### Context

The project has been separated into:

- Backend API: NestJS + Prisma + MySQL/MariaDB.
- Admin Web: React + Vite + TypeScript static dashboard.
- Public Website: Vanilla JS static sites for display-only share-token video access.

The user wants the Admin Web to become the only management interface. Public websites must no longer contain admin mini page logic, admin API calls, video creation or share-link creation.

### Important architecture decisions

- Admin Web is the only admin surface.
- Public websites call `/_api` and `/_media` through Cloudflare Worker/reverse proxy.
- Backend API remains the source of truth for permissions, domain verification, token validation and logs.
- Raw share tokens must not be persisted.
- DB_BLOB public playback remains disabled.
- Hostinger MySQL is acceptable for MVP, but production must include backups, restore drills, rate limits and monitoring.

### Documents added

- `AGENTS.md`
- `PLAN.md`
- `docs/00_PROJECT_BRIEF.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/03_SECURITY_MODEL.md`
- `docs/04_DATABASE_RISK_REGISTER.md`
- `docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md`
- `docs/06_API_CONTRACTS.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/08_CODEX_WORKFLOW.md`
- `docs/09_DECISIONS.md`
- `docs/10_BACKLOG.md`
- `docs/11_INCIDENT_RESPONSE.md`

### Pending

- Implement/verify backend logout refresh-token revoke.
- Add production-grade rate limits.
- Add Cloudflare Access/WAF rules for Admin Web/API.
- Rotate exposed development secrets before production.
- Add backup and restore drill for Hostinger MySQL.
- Remove all admin logic from public static site variants.
- Add share-link history/list/revoke UI in Admin Web.
- Verify Settings password-change UI.
- Add E2E smoke tests.

## 2026-07-03 — Videos search guard and compact publishedAt input

### Changed

- Hardened `/videos` manual search so one-character input is handled locally with the hint `Nhập ít nhất 2 ký tự để tìm video.` and does not call `/admin/videos`.
- Normalized VideosPage search input by trimming, collapsing spaces and capping to 80 characters before applying it.
- Added AbortController cancellation and a request-version guard for VideosPage list requests so stale search/status/page requests cannot overwrite newer results.
- Added an inline VideosPage search retry message while preserving existing video results on search failures.
- Extended create-video publishedAt utilities to normalize and parse compact local date/time input such as `17031999`, `170319991041`, `17031999,1041`, and `17031999, 1041`.
- Updated CreateVideoModal to format publishedAt on blur/submit, keep the same ISO API payload behavior, and show helper/error text for quick compact input.

Files changed in this pass:

```txt
src/pages/VideosPage.tsx
src/features/videos/videoDateUtils.ts
src/features/videos/videoSchemas.ts
src/features/videos/components/CreateVideoModal.tsx
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` initially reported formatting drift in `VideosPage.tsx` and `videoDateUtils.ts`; targeted Prettier was run on the touched files.
- `yarn format:check` passed after formatting.
- `yarn build` passed.
- Lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Manual browser check on `/videos`: one-character search sends no request, `msa` sends one valid request, clearing search restores the normal list, and pagination keeps the active search.
- Manual browser check in CreateVideoModal: `17031999`, `17031999,1041`, and `17031999, 1041` format correctly; invalid date/time values show validation errors; created payload still sends ISO `publishedAt`.
- Deploy the backend API search fix before relying on production Admin Web search behavior.
