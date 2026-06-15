# AGENTS.md — Codex Rules for Video Share CMS Admin Web

## 0. Purpose

This repository/folder is the **Admin Web** for Video Share CMS / BOM Media.

Codex must treat this app as a production-facing admin dashboard that manages videos, websites, domains, domain groups, share links, access logs, audit workflows and settings through the backend API.

This app builds to static assets and is deployed separately from:

- the NestJS Backend API
- the Vanilla JS public static websites

## 1. Mandatory Reading Order

Before making changes, read these files:

```txt
AGENTS.md
PLAN.md
session-log.md
docs/00_PROJECT_BRIEF.md
docs/01_ARCHITECTURE.md
docs/02_ADMIN_WEB_RULES.md
docs/03_SECURITY_MODEL.md
docs/06_API_CONTRACTS.md
```

For security, DB, deploy or incident-related work, also read:

```txt
docs/04_DATABASE_RISK_REGISTER.md
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/07_PRODUCTION_CHECKLIST.md
docs/11_INCIDENT_RESPONSE.md
```

## 2. Project Boundaries

### This repo/folder may contain

- React Admin Web UI
- routes for admin-only pages
- typed API clients for admin endpoints
- admin auth/session logic
- dashboard and CRUD screens
- docs and deployment notes for Admin Web

### This repo/folder must not contain

- backend business logic
- Prisma schema or migrations
- DB credentials or secrets
- Cloudinary secrets
- public static website renderer code
- public mini admin page
- hardcoded production API origin in public-facing source
- raw share token persistence after creation

## 3. Current Admin Web Stack

Use the existing stack unless the task explicitly asks for a migration:

```txt
React
Vite
TypeScript
Tailwind CSS
shadcn/ui-compatible components
React Router
Axios
React Hook Form
Zod
Redux Toolkit
Redux Persist
Sonner
lucide-react
framer-motion
```

TanStack Query is recommended for future server-state work, but do not introduce it without adding the dependency and migrating carefully.

## 4. Current Route Reality

The current admin router includes:

```txt
/login
/
/videos
/videos/:videoId
/websites
/domains
/settings
*
```

Do not invent new pages unless requested. If adding new pages, update:

```txt
src/app/router.tsx
MainLayout/sidebar navigation
PLAN.md
session-log.md
docs/02_ADMIN_WEB_RULES.md
```

## 5. Architecture Rules

- Admin Web is the **only** place for admin management UX.
- Public websites are display-only and share-token-only.
- Public sites must call same-origin proxy routes such as `/_api` and `/_media`, not direct API origins.
- Admin Web may call the backend API directly or through a protected admin proxy depending on deployment.
- Backend remains the source of truth for auth, authorization, token verification, video ownership, website/domain checks and audit logs.
- Never rely on client-side checks alone for security.

## 6. Auth and Token Rules

- Access token is attached only to protected admin requests.
- Refresh token must be rotated by backend.
- Logout should call backend revoke/logout endpoint when available, then clear local state.
- Do not store raw share tokens in Redux, localStorage or persistent state.
- Raw share token/public URL may be shown only immediately after share-link creation.
- Warn admin that the raw token cannot be recovered later.
- Do not log passwords, refresh tokens, access tokens, share tokens or API secrets.

## 7. API Client Rules

- Use one central Axios setup.
- Normalize API errors before showing to UI.
- Avoid exposing backend stack traces in UI.
- Handle 401 consistently:
  - refresh once if refresh token exists
  - retry the original request once
  - clear auth only on true auth failure
  - preserve auth on temporary network/5xx when safe
- Do not call public endpoints for admin data.

## 8. UI Rules

Every async admin screen must have:

- loading state
- empty state
- error state
- retry/refetch action
- disabled submit while submitting
- toast success/error
- confirmation dialog for destructive actions

Every form must have:

- React Hook Form
- Zod validation
- accessible labels
- clear validation feedback
- safe default values

## 9. Video Rules

Supported source types include:

- manual/direct playback URL
- LOCAL_FILE server storage upload for production large videos
- safe embed URL or sanitized iframe src
- DB_BLOB admin-only fallback preview
- legacy Cloudinary/DB_BLOB records where existing data requires display or preview compatibility

Rules:

- Do not render raw iframe HTML.
- Extract and sanitize iframe `src`.
- Allow only approved embed hosts.
- Do not allow SVG thumbnail upload.
- Do not send `blob:` or `data:` URLs as persisted `thumbnailUrl`.
- Prefer LOCAL_FILE / private server storage for production uploads.
- Keep DB_BLOB as a small fallback only; do not promote it as the large-video path.

## 10. Website/Domain Rules

- Domain uniqueness must be enforced by backend.
- Admin UI must clearly show active/disabled domain status.
- Claim-current-domain UI must warn about host/domain assumptions.
- Disabled website/domain must not be considered public-resolvable.
- DomainGroup support must not break legacy website list/detail flows.

## 11. Share Link Rules

- Create share link with explicit `videoIds`.
- Share link must be tied to a website/domain.
- Show created public URL only after creation.
- Support expiry and max views.
- Provide copy action.
- Do not persist raw token.
- Add/reinforce revoke UI before production.

## 12. Security Work Priority

When asked to harden production, prioritize:

1. backend logout/revoke refresh token
2. rate limit and brute-force protection
3. Cloudflare WAF / Access / proxy rules
4. Admin Web token storage and CSP
5. database backup and restore drill
6. secret rotation
7. monitoring and alerting
8. audit/access log review
9. dependency vulnerability checks
10. E2E smoke tests

## 13. Required Checks Before Completing Code Tasks

Run the relevant checks based on files changed:

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
```

If the project has a workspace command, prefer:

```bash
yarn workspace @video-share/admin-web typecheck
yarn workspace @video-share/admin-web lint
yarn workspace @video-share/admin-web build
```

If a check cannot be run, document why in `session-log.md`.

## 14. Session Log Requirement

After each meaningful Codex change, append to `session-log.md`:

```md
## YYYY-MM-DD — Short title

### Changed

- ...

### Verified

- ...

### Pending

- ...
```

## 15. Do Not Do

Do not:

- add admin mini pages back into public static websites
- bypass backend authorization
- store secrets in source
- log tokens
- expose API origin in public site source
- add public DB_BLOB playback casually
- weaken DTO/API contracts to “make UI work”
- remove validation or confirmation dialogs
- silently ignore security warnings
