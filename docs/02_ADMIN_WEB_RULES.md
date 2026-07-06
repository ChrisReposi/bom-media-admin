# 02_ADMIN_WEB_RULES.md — Admin Web Rules

## Scope

Admin Web is the sole management UI.

It should manage:

- dashboard
- videos
- video detail/player
- websites
- domains
- domain groups
- share links
- access logs
- audit logs
- settings/password

## Current Routes

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

Future routes should be added intentionally:

```txt
/share-links
/share-links/:id
/access-logs
/audit-logs
/domain-groups
```

## State Management

Use Redux Toolkit + Redux Persist for:

```txt
auth
theme
local UI preferences
```

Use local React state for small form/modal state.

TanStack Query is recommended later for server state, but do not use it unless installed and planned.

## Auth UX

Required:

- public-only `/login`
- protected admin routes
- redirect unauthenticated users to `/login`
- redirect authenticated users away from `/login`
- restore session on reload
- refresh token retry flow
- safe error messages
- logout calls backend `/admin/auth/logout` with the current refresh token when available, then clears local auth either way
- revoked/expired session responses clear local auth on true auth failure
- auth throttling responses show safe retry messages without raw backend dumps

## Dashboard UX

Dashboard should support quick share-link creation:

- load active websites
- load READY shareable videos
- filter READY videos by optional backend `filterKey`
- select website
- select one or more videos
- set label/max views/expiry
- create share link
- show one-time URL
- copy URL
- warn if no active domain

## Videos UX

Videos page should support:

- list
- filters by status
- optional `filterKey` create/edit metadata and list filtering
- pagination
- loading/error/empty states
- create modal
- detail route
- update metadata
- update status through explicit READY/DISABLED confirmation modal
- soft disable only; disabling must not delete metadata, thumbnails, video files, or NVMe storage
- protected purge where allowed
- preferred LOCAL_FILE server storage chunked upload
- manual URL
- embed
- legacy Cloudinary/DB_BLOB record display and preview where existing records require it

## Video Detail UX

Video detail should support:

- metadata panel
- status
- source type
- preview player
- DB_BLOB admin preview using protected binary endpoint
- LOCAL_FILE admin preview using protected local-file endpoint
- LOCAL_FILE local thumbnail replacement through backend storage
- embed preview with sanitized iframe URL
- edit metadata modal
- safe object URL cleanup

## Websites/Domains UX

Websites page should support:

- list/search/filter
- create website
- update website
- disable website
- attach/create domain
- activate/disable domain
- claim current domain
- show active primary domain
- show domain group when available

## Share Link UX

Share-link production UI should support:

- list share links
- filter by website/domain/status
- view expiry/max views/current views
- revoke link
- copy public URL only when raw URL exists at creation time
- show “raw token cannot be recovered” warning

## Settings UX

Settings should include:

- current admin info
- change password
- session logout
- security notes
- optional theme preference

Change-password UI must require:

- old password
- new password
- backend-required secret code if the backend contract still requires it

After a successful password change, Admin Web should clear local auth and send the admin back to `/login` unless the backend explicitly returns a fresh trusted session.

## Component Rules

- Prefer typed feature modules.
- Keep API calls out of presentational components.
- Keep unsafe HTML out of React render.
- Prefer reusable cards/tables/forms.
- Use accessible labels and button text.
- Keep destructive actions explicit and confirmed.

## Error Handling

Do:

- show safe error message
- offer retry where useful
- log details only in dev if safe
- avoid token/secret leakage

Do not:

- expose backend stack traces
- stringify unknown errors directly to UI
- ignore 401/403
- auto-retry destructive POST/PATCH/DELETE without user action
