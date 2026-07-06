# 06_API_CONTRACTS.md — API Contracts and Frontend Expectations

## Backend Base

```txt
/api/v1
```

Admin Web should use the configured API base URL from env.

Public site should not hardcode API origin; use same-origin proxy routes.

## Admin Auth

Expected endpoints:

```txt
POST /api/v1/admin/auth/login
POST /api/v1/admin/auth/refresh
POST /api/v1/admin/auth/logout
GET  /api/v1/admin/auth/me
POST /api/v1/admin/auth/change-password
```

Admin Web expectations:

- login returns safe admin + access/refresh tokens
- refresh rotates tokens
- logout revokes refresh token/server-side session when called with the current refresh token
- `me` returns safe admin only
- change password revokes existing refresh tokens

Logout request body for the current token-body contract:

```json
{ "refreshToken": "<current-refresh-token>" }
```

If refresh/logout moves to HttpOnly cookies later, update the auth client to follow the live backend contract without exposing token values in logs or UI.

Change-password request body for the current backend contract:

```json
{
  "oldPassword": "<current-password>",
  "newPassword": "<new-password>",
  "secretCode": "<operator-change-password-secret>"
}
```

After success, the backend revokes refresh tokens/sessions. Admin Web should clear local auth and redirect to `/login`.

## Videos

Expected endpoints:

```txt
GET    /api/v1/admin/videos
GET    /api/v1/admin/videos/:id
POST   /api/v1/admin/videos
POST   /api/v1/admin/videos/embed
POST   /api/v1/admin/videos/upload
POST   /api/v1/admin/videos/upload-local/init
POST   /api/v1/admin/videos/upload-local/:uploadId/chunks
GET    /api/v1/admin/videos/upload-local/:uploadId
POST   /api/v1/admin/videos/upload-local/:uploadId/complete
POST   /api/v1/admin/videos/upload-local/:uploadId/cancel
POST   /api/v1/admin/videos/upload-db
PATCH  /api/v1/admin/videos/:id
PATCH  /api/v1/admin/videos/:id/thumbnail-local
DELETE /api/v1/admin/videos/:id
POST   /api/v1/admin/videos/:id/purge
GET    /api/v1/admin/videos/:id/binary
GET    /api/v1/admin/videos/:id/local-file
GET    /api/v1/admin/videos/:id/thumbnail
```

Frontend rules:

- list with pagination/filter
- optional `filterKey` is supported on admin video list/create/update/upload flows; omit `filterKey` to list all videos
- valid `filterKey` values are lowercase letters, numbers and underscores such as `sml`, `msa`, `judge_judy`; `all` is reserved and must not be sent as a key
- show only safe response fields
- use admin-only binary endpoint only for admin preview
- use LOCAL_FILE chunked upload as the preferred large-video create path
- Create Video modal exposes only Server/LOCAL_FILE upload, Manual URL, and Embed Code create modes
- do not expose backend storage keys or absolute filesystem paths
- use protected LOCAL_FILE preview/thumbnail endpoints through authenticated API helpers
- embed preview must use sanitized `embedUrl`
- Cloudinary upload and DB_BLOB upload endpoints may remain backend/legacy-compatible but are not exposed as Create Video modes
- soft disable uses `DELETE /admin/videos/:id` and must not delete storage files
- purge requires explicit `confirmVideoId`, remains separate from soft disable, and may return safe storage reclaim fields such as `localVideoDeleted`, `localThumbnailDeleted`, `bytesReclaimed`, and `orphanCleanupRequired`
- Admin Web must not display raw storage keys or absolute filesystem paths from purge/storage workflows

Admin Web env:

```env
VITE_LOCAL_VIDEO_CHUNK_SIZE_MB=50
# Optional local-only override for nested public static-site testing.
VITE_PUBLIC_SHARE_BASE_URL=http://127.0.0.1:5500/bom-media-sites/mau-lam-xong/danny/refactored_danny_public_site
```

`VITE_PUBLIC_SHARE_BASE_URL` is optional. When set, Admin Web rewrites newly
created/listed public share URLs into hash-router-safe static SPA links such as
`BASE_URL/#/s/<short-code>/videos`. Leave it unset in normal production root
deployments so Admin Web derives the public site origin from the backend
`publicUrl`.

## Websites

Expected endpoints include:

```txt
GET    /api/v1/admin/websites
GET    /api/v1/admin/websites/:id
POST   /api/v1/admin/websites
PATCH  /api/v1/admin/websites/:id
DELETE /api/v1/admin/websites/:id
```

Website fields may include:

- id
- name
- slug
- status
- domains
- domainGroup
- createdAt
- updatedAt

## Domains

Expected lifecycle actions include:

```txt
POST /api/v1/admin/websites/:websiteId/domains/:domainId/activate
POST /api/v1/admin/websites/:websiteId/domains/:domainId/disable
POST /api/v1/admin/websites/:websiteId/domains/claim-current
```

Frontend rules:

- clearly show active/disabled
- confirm disable/transfer if destructive
- warn before claim-current
- never bypass uniqueness errors

## Domain Groups

Expected support:

- list
- create
- detail
- update
- disable
- attach to website by `domainGroupKey` or `domainGroupId`

Frontend rules:

- disabled/missing group must show error
- website filters may include domain group key/name

## Assign Videos to Websites

Expected behavior:

- assign videos to website
- sort assigned videos
- include direct/upload/manual/embed videos
- public watch returns only videos allowed by share link/domain

Frontend rules:

- show clear assigned/unassigned state
- confirm large replacement operations
- preserve sort order

## Share Links

Expected behavior:

- create share link for website with explicit `videoIds`
- backend generates raw token
- backend stores token hash
- backend returns raw token/public URL only once
- revoke link
- expiry
- max views
- current views

Frontend rules:

- never persist raw token
- show raw URL only after creation
- add copy button
- warn raw token cannot be recovered
- add revoke/history UI before production

## Public Watch

Preferred endpoint:

```txt
POST /api/v1/public/watch/exchange
```

Legacy fallback:

```txt
GET /api/v1/public/watch?host=<host>&token=<token>
```

Public site should call via:

```txt
POST /_api/public/watch/exchange
GET  /_api/public/watch?...   # fallback only
```

Expected backend checks:

- host/domain
- token hash
- revoked status
- expiry
- max views
- website/domain active status
- video READY status
- share-link video assignment

## Error Shape

Frontend should normalize errors from possible backend shapes:

```json
{ "message": "string" }
{ "message": ["string"] }
{ "error": "string", "statusCode": 400 }
```

Do not show raw stack traces.

Rate-limit responses should be shown with a safe user-facing message:

```txt
Có quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại.
```
