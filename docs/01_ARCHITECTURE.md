# 01_ARCHITECTURE.md — Architecture

## High-Level Flow

```txt
Admin Browser
  -> Admin Web static assets
  -> Backend API /api/v1/admin/*
  -> MySQL/MariaDB + Cloudinary

Viewer Browser
  -> Public static website
  -> same-origin /_api/public/watch/exchange
  -> Cloudflare Worker/reverse proxy
  -> Backend API /api/v1/public/watch/exchange
  -> MySQL/MariaDB
  -> same-origin /_media/public/watch/...
  -> Cloudflare Worker/reverse proxy
  -> media origin/CDN/API as allowed
```

## Backend Responsibilities

Backend owns:

- Admin auth
- refresh token rotation
- logout/revoke tokens
- role guards
- DTO validation
- embed URL sanitization
- upload validation
- share token hashing
- token verification
- website/domain resolution
- access logs
- audit logs
- DB integrity
- safe response shaping

## Admin Web Responsibilities

Admin Web owns:

- admin UX
- form validation UX
- calling admin API
- showing safe metadata
- copying one-time share URL
- warning admin about irreversible token visibility
- rendering previews using safe API fields
- never exposing secrets

Admin Web does not own security decisions. It can hide buttons, but backend must enforce all rules.

## Public Website Responsibilities

Public sites own:

- brand UI
- video grid/detail rendering after watch data is received
- token extraction and cleanup
- calling same-origin proxy routes
- best-effort anti-copy UX

Public sites must not own:

- admin login
- admin session
- create video
- create share link
- backend API origin
- business authorization

## Data Model Summary

Core backend models include:

- AdminUser
- AdminRefreshToken
- VideoAsset
- VideoBinaryAsset
- VideoLocalFileAsset
- VideoUploadSession
- Website
- WebsiteDomain
- DomainGroup
- ThemeConfig
- WebsiteVideo
- ShareLink
- ShareLinkVideo
- AccessLog
- AdminAuditLog

## Video Source Rules

```txt
DIRECT / MANUAL URL -> public playable if READY and share link allows it
LOCAL_FILE -> preferred production large-video storage on private server/NVMe; public playback uses token-protected media endpoint
CLOUDINARY UPLOAD -> legacy/compatibility upload path if backend still enables it
EMBED -> public iframe only after backend sanitization
DB_BLOB -> small fallback only; do not use as production large-video storage
```

## Public Token Flow

Recommended production flow:

1. Viewer opens `/#/videos?t=RAW_TOKEN` or another supported private link.
2. Public site extracts token.
3. Public site immediately removes token from URL/history.
4. Public site posts token to same-origin `/_api/public/watch/exchange`.
5. Worker proxies to backend.
6. Backend verifies host/domain + token hash + status + expiry + max views.
7. Backend returns only allowed website identity and video metadata.
8. Public site renders videos.
9. Internal links do not append raw token.

## Admin Web Deployment Options

### Option A — MVP

```txt
admin.example.com
  Cloudflare DNS/WAF/Access
  Static Admin Web
  API via configured protected origin
```

Use strict CSP and Cloudflare Access. Store tokens with current Redux Persist strategy.

### Option B — Stronger

```txt
admin.example.com
  Cloudflare Access
  Worker/BFF proxy
  HttpOnly SameSite cookies
  Backend API
```

This reduces token exposure in JavaScript but requires more backend/proxy work.

## Recommended MVP Choice

For current project stage:

- keep static Admin Web
- place behind Cloudflare Access
- keep Redux Persist for now
- add strict CSP
- implement backend logout revoke
- add rate limits
- revisit HttpOnly cookie/BFF after MVP stabilizes
