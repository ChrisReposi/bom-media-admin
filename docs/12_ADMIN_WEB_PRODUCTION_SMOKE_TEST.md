# 12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md — Admin Web Production Smoke Test

This checklist verifies a deployed Admin Web release and its backend API integration. It is a manual release workflow; it does not mean production checks, Cloudflare changes, secret rotation, backups or restore tests have already been completed.

Use placeholders only. Do not paste credentials, access tokens, refresh tokens, raw share tokens, API keys or backend stack traces into this file, tickets or logs.

## 1. Pre-Deploy Checks

Run before building or uploading static assets:

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print
```

Expected:

```txt
typecheck/lint/format/build pass
no package-lock.json
no pnpm-lock.yaml
```

If this app is run from a monorepo workspace, use:

```bash
yarn workspace @video-share/admin-web typecheck
yarn workspace @video-share/admin-web lint
yarn workspace @video-share/admin-web format:check
yarn workspace @video-share/admin-web build
```

Do not deploy if `yarn build` fails.

## 2. Build Artifact Checks

After `yarn build`:

- [ ] `dist/` exists.
- [ ] `dist/index.html` exists.
- [ ] No source `.env` file is copied into `dist/`.
- [ ] No obvious backend secret names or values appear in built assets.
- [ ] No Cloudinary API secret appears in built assets.
- [ ] No JWT/refresh/share-token secret appears in built assets.
- [ ] No hardcoded access token, refresh token or raw share token appears in built assets.
- [ ] API base is configured through Vite env, not hardcoded as a backend secret.

Coarse safety checks:

```bash
find dist -maxdepth 2 -name ".env*" -print
grep -R "CLOUDINARY_API_SECRET\|JWT_ACCESS_SECRET\|REFRESH_TOKEN\|SHARE_TOKEN_PEPPER" dist || true
grep -R "DATABASE_URL\|DB_PASSWORD\|ACCESS_LOG_IP_PEPPER" dist || true
```

Notes:

- These grep checks are a coarse safety check, not a full secret scanner.
- Operators must still ensure `.env.production` and real secret files are not committed.
- Vite env values starting with `VITE_` are public client-side values after build.

## 3. Production Env Checklist

Current Admin Web env surface:

```env
VITE_API_BASE_URL=https://api.example.com/api/v1
VITE_APP_NAME=Video Share CMS Admin
VITE_LOCAL_VIDEO_CHUNK_SIZE_MB=50
```

Rules:

- Do not hardcode the real production API origin in source files.
- Do not put backend secrets in `VITE_*`.
- Do not put Cloudinary API secret, JWT secret, database URL, refresh pepper, share-token pepper or access-log IP pepper in Admin Web env.
- Keep `VITE_LOCAL_VIDEO_CHUNK_SIZE_MB` aligned with backend upload-session limits.
- Admin Web env is public once built.

## 4. Deployment Smoke Test

Manual post-deploy checks:

- [ ] Open the admin domain.
- [ ] Cloudflare Access gate appears before the app if enabled.
- [ ] Admin Web static assets load.
- [ ] No console error appears on first load.
- [ ] `/login` route loads.
- [ ] Logged-out visit to `/` redirects to `/login`.
- [ ] Logged-in visit to `/login` redirects to dashboard.
- [ ] Browser refresh preserves/restores session if refresh token is valid.

Do not mark these complete until verified in the target environment.

## 5. Auth Smoke Tests

### Login Success

1. Open `/login`.
2. Enter valid admin username/password.
3. Submit.
4. Confirm redirect to dashboard.
5. Confirm no token is printed in console or visible logs.

### Login Failure

1. Enter an invalid password.
2. Confirm a safe generic error appears.
3. Confirm no backend stack trace is shown.

### 429 Login Throttling

1. Trigger repeated invalid login attempts in a safe staging/controlled environment.
2. Confirm UI shows:

   ```txt
   Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.
   ```

3. Confirm no infinite retry loop occurs.

### Refresh After Reload

1. Login.
2. Refresh the browser.
3. Confirm session bootstrap/refresh works.
4. Confirm protected routes remain available.

### Backend Logout Integration

1. Login.
2. Click logout.
3. Confirm `POST /admin/auth/logout` is called when a refresh token exists.
4. Confirm local auth clears.
5. Confirm redirect to `/login`.
6. Confirm protected routes redirect to `/login` after logout.
7. If backend has session-bound access tokens, confirm old protected requests fail after logout.

### Revoked Or Expired Session

1. Revoke the session/backend refresh token in staging or use password change.
2. Refresh the page or perform a protected API request.
3. Confirm Admin Web clears auth on true auth failure.
4. Confirm redirect to `/login`.

### Logout API Failure

1. Simulate API unavailable or logout endpoint `5xx` in staging.
2. Click logout.
3. Confirm local session still clears.
4. Confirm safe warning appears if implemented.
5. Confirm no token is displayed.

## 6. Protected Route Smoke Tests

Verify these routes:

```txt
/
/videos
/videos/:videoId
/websites
/domains
/settings
```

For each route:

- [ ] Logged out -> redirects to `/login`.
- [ ] Logged in -> route loads.
- [ ] API loading state appears if the backend is slow.
- [ ] API error state is safe and does not expose raw backend dumps.
- [ ] Retry/refetch exists where appropriate.

Do not require production data creation unless the release environment has approved fixtures.

## 7. Feature Smoke Tests

### Dashboard

- [ ] Loads active websites.
- [ ] Loads READY shareable videos.
- [ ] Handles empty state.
- [ ] Handles API error safely.
- [ ] Creates share link only with explicit selected `videoIds`.
- [ ] Shows raw public URL only after creation.
- [ ] Does not persist raw token after navigation/reload.
- [ ] Copy action works.

### Videos

- [ ] List loads.
- [ ] Filters/search still work if implemented.
- [ ] Detail route loads.
- [ ] Player preview does not expose unsafe data.
- [ ] Create Video modal shows only Server, Manual URL, and Embed Code modes.
- [ ] Create Video modal does not show Cloudinary upload, Legacy DB upload, or database-disabled notes.
- [ ] LOCAL_FILE server-storage upload shows progress and completes.
- [ ] LOCAL_FILE upload cancel stops the browser request and calls cancel when an upload session exists.
- [ ] LOCAL_FILE thumbnail upload stores thumbnail through the backend local-thumbnail route.
- [ ] LOCAL_FILE preview works from video detail without exposing storage keys or absolute paths.
- [ ] READY video cards show a Ban action that opens a modal, not `window.confirm`.
- [ ] Disable confirmation makes the video `DISABLED` and clearly states storage files are not deleted.
- [ ] DISABLED video cards show a restore action that opens a modal and sets status back to `READY`.
- [ ] DRAFT/PROCESSING/FAILED cards do not show an incorrect READY/DISABLED toggle.
- [ ] Purge flow is available only from video detail danger zone.
- [ ] Purge flow requires exact video id plus explicit risk confirmation.
- [ ] Purge success shows local video/thumbnail delete result, reclaimed bytes when provided, and orphan-cleanup warning when provided.
- [ ] Purge blocker errors for assigned/shared videos are shown safely.
- [ ] Existing DB_BLOB admin preview still works for legacy records when the backend returns binary metadata.
- [ ] Create/edit actions still validate forms.

### Websites / Domains

- [ ] Websites list loads.
- [ ] Domain status is visible.
- [ ] Domain group info is visible if supported.
- [ ] Claim-current-domain warning is visible if present.
- [ ] Destructive actions require confirmation where implemented.

### Settings

- [ ] Current admin info is visible.
- [ ] Change password works if enabled in target environment.
- [ ] Change password failure is safe.
- [ ] Wrong current password or wrong change-password secret shows a safe verification error.
- [ ] After password change, session behavior matches backend contract.

## 8. Backend/API Smoke Checks From Admin Web Release Perspective

Use placeholders only.

API health:

```bash
curl -i https://api.example.com/api/v1/health
```

Expected:

```txt
200 OK
```

Docs exposure:

```bash
curl -i https://api.example.com/docs
```

Expected production behavior:

```txt
404, 403, or protected by Access/WAF.
Swagger must not be publicly accessible.
```

Auth endpoint existence without credentials:

```bash
curl -i https://api.example.com/api/v1/admin/auth/login
```

Expected:

```txt
Not a successful login.
Exact status may depend on method/validation.
No backend stack trace should be exposed.
```

Do not add curl commands that print real tokens.

## 9. Cloudflare / Security Checks

Manual/external checks:

- [ ] Admin Web domain is behind Cloudflare Access or equivalent.
- [ ] API auth endpoints have WAF/rate-limit rules.
- [ ] Public watch endpoints have WAF/rate-limit rules.
- [ ] Origin API is not directly exposed if origin protection is configured.
- [ ] Security headers are active.
- [ ] Admin Web is not indexable.

These are not completed by this repository. Confirm in Cloudflare/hosting dashboards.

## 10. Public Mini-Admin Absence Checklist

Admin Web separation must be preserved.

Check public website repos separately:

- [ ] Public websites do not include `/login` admin page.
- [ ] Public websites do not include `/admin/videos`.
- [ ] Public websites do not call `/admin/auth/login`.
- [ ] Public websites do not call `/admin/videos`.
- [ ] Public websites do not create share links.
- [ ] Public websites do not persist admin tokens.

This Admin Web repo does not prove public website cleanup is complete.

## 11. Incident And Rollback

If smoke test fails:

- If Admin Web build fails: do not deploy.
- If login fails: check `VITE_API_BASE_URL`, API health, CORS, Cloudflare Access and backend auth logs.
- If refresh fails after reload: check refresh endpoint, persisted auth state, backend session revocation and CORS.
- If logout does not call backend: re-check Admin Web backend logout integration.
- If `/docs` is public: block release.
- If a raw token appears in localStorage/Redux after share creation: block release.
- If a public site still has mini-admin: block public launch.

Rollback notes:

- Keep previous Admin Web `dist/` artifact available.
- If new Admin Web breaks auth, restore previous `dist/` and investigate in staging.
- Do not roll back backend migrations casually without DB backup and migration review.

## 12. Evidence Template

Record release evidence outside git:

```txt
Date:
Environment:
Admin Web URL:
API base URL:
Build commit:
Operator:
Pre-deploy checks:
Build artifact checks:
Auth smoke result:
Protected route result:
Feature smoke result:
Cloudflare/security result:
Public mini-admin absence result:
Issues:
Rollback needed:
Next action:
```
