# session-log.md — Codex Handoff Log

This file records important project context and changes for future Codex sessions.

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
