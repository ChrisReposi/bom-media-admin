# 00_PROJECT_BRIEF.md — Project Brief

## Product

Video Share CMS / BOM Media is a multi-site video publishing and private sharing system.

The system lets an admin:

- upload or register videos
- manage websites and domains
- assign videos to websites
- create private share links
- share videos to specific domains
- track access logs and audit logs

Viewers do not need accounts. They receive share links and can watch only the videos granted by that share link.

## System Parts

### 1. Backend API

The backend API is a NestJS application with:

- `/api/v1` global prefix
- Admin authentication
- Video management
- Cloudinary upload
- Embed video sanitization
- DB_BLOB fallback upload for local/test
- Website/domain/domain-group management
- Share link token generation and validation
- Public watch API
- Access logs and admin audit logs

### 2. Admin Web

The Admin Web is a static React dashboard deployed separately.

Admin Web handles:

- login/logout/session refresh
- dashboard share-link creation
- video CRUD/preview
- website/domain management
- settings
- future share-link history/revoke UI
- future access/audit log UI

### 3. Public Static Websites

Public sites are Vanilla JS static SPAs deployed to Hostinger/static hosting.

Target production behavior:

- public sites only render UI
- public sites only show shared videos after token exchange
- no admin login in public site
- no create video in public site
- no create share link in public site
- no hardcoded API origin
- use Cloudflare Worker/reverse proxy with `/_api` and `/_media`

## Main Production Concern

The biggest risk is not “someone copying HTML.” The biggest risks are:

- DB overload from automated traffic
- brute-force admin login
- stolen admin token
- exposed API origin bypassing proxy/WAF
- leaked secrets
- broken object/function authorization
- public watch abuse
- unbounded file upload/storage
- broken backup/restore
- domain/share-token mismatch bugs

## Production Principle

Assume public clients are hostile.

Everything important must be enforced server-side:

- auth
- role permissions
- video ownership
- website/domain status
- domain mismatch blocking
- share token validity
- max views
- expiry
- revoke status
- upload size/type
- rate limits
