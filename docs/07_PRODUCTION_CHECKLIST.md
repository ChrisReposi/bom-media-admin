# 07_PRODUCTION_CHECKLIST.md — Production Checklist

Run the detailed Admin Web release smoke test before launch:

```txt
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
```

## P0 — Must Finish Before Launch

### Secrets

- [ ] Rotate Cloudinary API key/secret if ever exposed.
- [ ] Rotate JWT access/refresh secrets.
- [ ] Rotate share token pepper.
- [ ] Rotate access-log IP pepper if exposed.
- [ ] Rotate DB password.
- [ ] Remove secrets from git history if committed.
- [ ] Keep production `.env` only on server/secret manager.

### Backend

- [ ] `NODE_ENV=production`.
- [ ] Swagger `/docs` protected or disabled publicly.
- [ ] CORS allowlist exact origins only.
- [ ] Helmet active.
- [ ] ValidationPipe whitelist/forbid/transform active.
- [ ] Auth guards on all admin routes.
- [ ] Role guards where required.
- [ ] Backend logout refresh-token revoke implemented.
- [ ] Rate limits for auth and public watch.
- [ ] No raw tokens in logs.
- [ ] Public watch rejects invalid/domain mismatch/revoked/expired/maxed links.
- [ ] Upload size/type limits verified.
- [ ] Metadata probe SSRF guard verified.
- [ ] LOCAL_FILE private storage root configured outside public web root.
- [ ] LOCAL_FILE chunk upload and token-protected playback verified.
- [ ] `VIDEO_DB_STORAGE_ENABLED=false` for production unless small fallback is explicitly approved.

### Admin Web

- [ ] Admin Web behind Cloudflare Access or equivalent.
- [ ] Admin Web production smoke test completed using `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`.
- [ ] Login works.
- [ ] Refresh flow works.
- [ ] Logout calls backend logout when refresh token exists. Implemented in Admin Web code; verify against deployed backend.
- [ ] Protected routes redirect correctly.
- [ ] 401 after session revoke clears local auth and redirects to login.
- [ ] 429 auth responses show safe retry messaging.
- [ ] Share-link creation shows raw URL only once.
- [ ] Settings password-change UI implemented; production/manual smoke test still required.
- [ ] LOCAL_FILE server-storage upload creates a video through chunked upload.
- [ ] Video `filterKey` create/edit/list filters work after backend migration is deployed.
- [ ] LOCAL_FILE thumbnail upload uses backend local thumbnail storage.
- [ ] LOCAL_FILE preview works without exposing storage keys/paths.
- [ ] Video card READY/DISABLED status toggle uses modal confirmation and no browser `window.confirm`.
- [ ] DISABLED videos can be restored to READY from the card action.
- [ ] Disable copy clearly states storage files are not deleted.
- [ ] Purge confirmation can permanently delete an unused LOCAL_FILE video.
- [ ] CSP/security headers added.
- [ ] Route/page chunks load on demand and create/edit video modals remain functional.
- [ ] Hostinger SPA fallback is deployed: direct open/refresh for `/videos`, `/websites`, and `/videos/:videoId` returns `index.html`, not Hostinger 404.
- [ ] Hidden `dist/.htaccess` is uploaded to the domain document root, e.g. `public_html/.htaccess`.
- [ ] `index.html` is no-cache/no-store and `/assets/*` is one-year immutable.
- [ ] Admin API and authenticated media responses are not publicly cached.
- [ ] No secrets in built files.
- [ ] Build passes.
- [ ] `yarn smoke:build` passed (static dist-output check).
- [ ] UX browser smoke test recorded using `docs/14_ADMIN_WEB_UX_SMOKE_TEST.md`.

### Public Sites

- [ ] No admin mini page.
- [ ] No admin login.
- [ ] No create video/share link.
- [ ] No hardcoded API origin.
- [ ] Calls `/_api` and `/_media`.
- [ ] Token removed from URL after load.
- [ ] Internal links do not append token.
- [ ] Invalid/expired/revoked/maxed token states shown.
- [ ] robots/security headers configured.

### Database

- [ ] Production DB has strong unique password.
- [ ] Production DB separate from dev/staging.
- [ ] DB user least privilege where possible.
- [ ] Automated backup enabled.
- [ ] Backup tested by restore.
- [ ] Backup stored offsite.
- [ ] Backup before migrations.
- [ ] AccessLog retention policy defined.
- [ ] Indexes verified for domain/token/status filters.
- [ ] Prisma connection limit configured.

### Cloudflare

- [ ] DNS proxied.
- [ ] WAF enabled.
- [ ] Rate limit rules configured.
- [ ] Access enabled for Admin Web.
- [ ] Worker routes for `/_api` and `/_media`.
- [ ] Worker secrets configured.
- [ ] Origin not leaked in public source.
- [ ] Security headers active.

### Monitoring

- [ ] API health uptime check.
- [ ] Error logging.
- [ ] DB connection error alert.
- [ ] Login spike alert.
- [ ] Public watch spike alert.
- [ ] 5xx alert.
- [ ] Backup failure alert.

## P1 — Soon After Launch

- [ ] Share-link list/revoke UI.
- [ ] Access logs UI.
- [ ] Audit logs UI.
- [ ] Domain group full UI.
- [ ] Role-aware admin UI.
- [ ] E2E tests.
- [x] Route-level bundle splitting and lazy heavy video modals.
- [ ] Revisit deeper vendor/manual chunk tuning only if production measurements justify it.
- [ ] Dependency audit automation.
- [ ] Monthly restore drill schedule.

## Build Commands

Admin Web:

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
yarn smoke:build
```

Workspace:

```bash
yarn workspace @video-share/admin-web typecheck
yarn workspace @video-share/admin-web lint
yarn workspace @video-share/admin-web build
```

Backend:

```bash
yarn workspace @video-share/api db:generate
yarn workspace @video-share/api db:validate
yarn workspace @video-share/api typecheck
yarn workspace @video-share/api build
```

## Smoke Tests

Use `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md` as the source of truth for Admin Web release smoke testing.

- [ ] Login admin.
- [ ] Refresh page and session recovers.
- [ ] Logout calls backend and clears local auth.
- [ ] Revoked session redirects to login.
- [ ] 429 auth response shows safe message.
- [ ] Create Video modal exposes only Server, Manual URL and Embed Code modes.
- [ ] Create manual video.
- [ ] Create embed video.
- [ ] Upload LOCAL_FILE server-storage video.
- [ ] Create/edit videos with `filterKey`, filter `/videos`, and filter Dashboard picker by key.
- [ ] Open video detail/player.
- [ ] Replace LOCAL_FILE thumbnail.
- [ ] Disable a LOCAL_FILE test video and confirm storage files remain.
- [ ] Purge unused LOCAL_FILE test video after confirming it is not assigned.
- [ ] Purge UI requires exact video ID plus explicit risk confirmation.
- [ ] Purge success toast shows local video/thumbnail reclaim result and any orphan-cleanup warning without storage paths.
- [ ] Create website/domain.
- [ ] Create share link with selected video.
- [ ] Open public share link on correct domain.
- [ ] Confirm wrong domain fails.
- [ ] Revoke link and confirm fails.
- [ ] Expired link fails.
- [ ] Over max views fails.
