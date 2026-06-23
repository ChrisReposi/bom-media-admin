# PLAN.md — Production Plan for Admin Web Separation

## 0. North Star

Build a production-safe Video Share CMS where:

- Backend API is the single source of truth.
- Admin Web is the only management interface.
- Public websites are static display-only sites.
- Video access is granted only through share links/tokens.
- Database is protected from brute force, resource exhaustion, data corruption and accidental destructive operations.

## 1. Current Confirmed State

### Backend API

Completed or mostly completed:

- NestJS API under `apps/api`
- Global prefix `/api/v1`
- Health endpoint
- Swagger internal docs
- Config validation
- Prisma 7 + MySQL/MariaDB
- Pino logger
- Helmet
- CORS allowlist
- global `ValidationPipe`
- Admin auth with access/refresh tokens
- refresh token rotation
- change password with secret
- video management
- Cloudinary upload
- safe embed API
- DB_BLOB fallback upload
- admin-only binary preview
- website/domain/domain-group management
- video assignment to website
- share link creation/revocation
- public watch endpoint
- access/audit logs

Known backend pending:

- backend logout/revoke refresh token final integration
- production-grade rate limiting
- production backup/restore drill
- final secret rotation
- monitoring/log review

### Admin Web

Completed or mostly completed:

- React + Vite + TypeScript static dashboard
- login route
- protected shell
- dashboard share-link composer
- videos list/detail/create flows
- LOCAL_FILE server-storage chunked upload flow
- websites/domains management
- settings route
- auth persistence and refresh flow
- typed API clients
- loading/error/empty/toast states
- route-level page splitting and on-demand video create/edit modal chunks

Known Admin Web pending:

- browser-verify backend logout endpoint integration after deploy/local API is available
- run production smoke-test workflow before launch
- revoke/share-link history UI
- browser-verify settings password-change flow against deployed/local backend
- browser-verify LOCAL_FILE chunked upload, thumbnail replacement, preview and purge against deployed/local backend
- advanced admin tables/forms
- further bundle analysis/tuning only if production measurements justify it
- E2E tests against live API

### Public Websites

Target state:

- public sites only display UI and shared videos
- no admin login
- no create video
- no create share link
- no direct API origin hardcoded
- API/media calls go through same-origin proxy, e.g. `/_api`, `/_media`
- public token exchange uses POST where possible
- token removed from URL after load
- public anti-copy is best-effort only, not DRM

## 2. Phase Roadmap

### Phase P0 — Critical Security Before Public Launch

- [ ] Rotate all exposed Cloudinary/API/JWT/pepper secrets.
- [ ] Implement/verify backend logout refresh-token revoke.
- [ ] Add auth rate limit: login, refresh, register, change-password.
- [ ] Add public watch rate limit by IP hash, token hash, host/domain and user-agent risk.
- [ ] Add Cloudflare WAF rules for admin and public APIs.
- [ ] Put Admin Web behind Cloudflare Access or equivalent identity gate.
- [ ] Disable `/docs` Swagger publicly or protect it by IP/VPN/Access.
- [ ] Confirm `CORS_ALLOWED_ORIGINS` and domain DB allowlist.
- [ ] Create backup and restore procedure for Hostinger MySQL.
- [ ] Run restore drill into a separate database.
- [ ] Ensure DB user has least privilege.
- [ ] Keep DB_BLOB as small fallback only and prefer LOCAL_FILE/private server storage for production uploads.
- [ ] Set `VIDEO_DB_STORAGE_ENABLED=false` in production unless explicitly needed.

### Phase P1 — Admin Web Hardening

- [x] Wire logout button to backend `/admin/auth/logout` in Admin Web code.
- [ ] Browser-verify logout revoke request against deployed/local backend.
- [x] Add password change UI in Settings.
- [ ] Browser-verify Settings password-change flow against deployed/local backend.
- [ ] Add share-link list/history/revoke UI.
- [ ] Add destructive action confirmation everywhere.
- [ ] Add audit log viewer for OWNER/ADMIN.
- [ ] Add access log viewer with filters.
- [ ] Add role-aware UI if STAFF/ADMIN/OWNER permissions differ.
- [ ] Add CSP/security headers for Admin Web deployment.
- [ ] Decide token storage strategy:
  - MVP: Redux Persist/localStorage with strict CSP and Cloudflare Access.
  - Stronger: HttpOnly SameSite cookies via backend/proxy.
- [ ] Add session timeout / idle logout UX.
- [ ] Add dependency audit script.

### Phase P2 — Public Website Simplification

- [ ] Remove mini admin pages from all public static sites.
- [ ] Remove admin auth/sessionStorage logic from public sites.
- [ ] Remove public create-video/create-share-link code.
- [ ] Ensure all public API calls use `/_api`.
- [ ] Ensure all public media calls use `/_media`.
- [ ] Ensure token is removed from URL after exchange.
- [ ] Ensure internal navigation never appends raw token.
- [ ] Add robots.txt and noindex headers where needed.
- [ ] Keep anti-copy features as best-effort only.

### Phase P3 — DB and Availability

- [ ] Define RPO and RTO:
  - Suggested MVP RPO: <= 24h backup loss.
  - Suggested MVP RTO: <= 4h manual restore.
- [ ] Schedule automated backups.
- [ ] Keep encrypted backup copies outside Hostinger.
- [ ] Test restore monthly.
- [ ] Add read/write DB connection limits.
- [ ] Add query timeouts and pagination limits.
- [ ] Archive old access logs.
- [ ] Avoid storing large videos in MySQL long term.
- [ ] Use LOCAL_FILE/private server storage or external object/CDN storage for video binaries.
- [ ] Reserve DB_BLOB for local/MVP fallback only.

### Phase P4 — Observability

- [ ] Structured logs with token redaction.
- [ ] Error monitoring.
- [ ] Uptime checks for API health.
- [ ] Alerts for DB connection errors.
- [ ] Alerts for login spikes and public watch spikes.
- [ ] Alerts for high 401/403/429/5xx rate.
- [ ] Track Cloudinary/API failures.
- [ ] Track backup job success/failure.

### Phase P5 — Scale and Optimization

- [ ] Add cache for public watch response where safe.
- [ ] Add CDN caching for static assets and thumbnails.
- [x] Add route-level chunk splitting and lazy heavy video modals.
- [ ] Add OpenAPI-generated TypeScript client if backend contract stabilizes.
- [ ] Add TanStack Query for server-state screens if desired.
- [ ] Split videos, websites, share-links, access-logs into feature modules.
- [ ] Add E2E tests with Playwright.

## 3. Production Definition of Done

A release is production-ready only when:

- `typecheck`, `lint`, `format:check`, `build` pass.
- Admin Web production smoke test is completed from `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`.
- Backend API build/typecheck pass.
- Migrations applied safely.
- No secrets in source.
- Secrets rotated.
- Cloudflare proxy/WAF/Access active.
- Admin Web protected by auth plus Cloudflare Access or equivalent.
- Swagger not public.
- Public sites cannot call admin APIs.
- Share token is not persisted client-side.
- Large production videos are not stored in MySQL.
- DB backup is recent and restore has been tested.
- Monitoring is active.
- Rollback plan is written.
