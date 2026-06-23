# 05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md — Deployment Guide

## Production Topology

Recommended MVP topology:

```txt
admin.example.com
  -> Cloudflare DNS proxied
  -> Cloudflare Access/WAF
  -> Hostinger static Admin Web

public-site.com
  -> Cloudflare DNS proxied
  -> Hostinger static public site
  -> Worker routes:
      /_api/*   -> Backend API
      /_media/* -> backend/media/CDN proxy

api.example.com
  -> Cloudflare DNS proxied
  -> Backend API origin
  -> MySQL Hostinger
  -> Cloudinary
```

## Admin Web Protection

Recommended:

- Put Admin Web on a non-obvious subdomain, but do not rely on obscurity.
- Protect it with Cloudflare Access.
- Add WAF/rate limiting on admin API paths.
- Use strict security headers.
- Disable indexing.
- Keep `/docs` Swagger inaccessible publicly.

Cloudflare Access is useful because it adds an identity gate before the Admin Web loads.

## Admin Web Security Headers

Suggested headers:

```txt
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

CSP must be adjusted to actual domains:

```txt
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data: blob:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  media-src 'self' https: blob:;
  frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://player.cloudinary.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
```

If using Cloudflare Access/BFF proxy, `connect-src` can be narrowed to `'self'`.

## Public Site Proxy

Public sites should call:

```txt
/_api/public/watch/exchange
/_media/public/watch/...
```

Cloudflare Worker should:

- validate allowed host
- forward only allowed paths
- strip sensitive headers
- add security headers
- avoid caching private token exchange responses
- optionally cache static/public-safe metadata responses
- normalize errors
- keep API origin out of public source

## Caching Rules

Admin Web static caching:

- `index.html` and SPA HTML fallbacks: `Cache-Control: no-cache, no-store, must-revalidate`.
- hashed files under `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.
- deploy the generated `dist/.htaccess` and `dist/assets/.htaccess` files to Hostinger with the rest of `dist/`; hidden files must not be skipped by the upload tool.
- if Cloudflare cache rules override origin headers, create explicit rules with the same behavior and place the HTML bypass/no-cache rule before the immutable asset rule.

Do not cache as public static content:

- admin API responses
- login/refresh/logout
- authenticated thumbnail/media Blob responses
- public watch token exchange
- private media responses unless URL is signed and cache design is explicit

Admin API responses should remain `private, no-store` or otherwise uncached at
the backend/proxy layer. The Admin Web `.htaccess` files apply only to static
hosting and must not be used to make authenticated API/media responses
cacheable.

## WAF and Rate Limit Rules

Recommended Cloudflare rules:

### Admin

- Protect `admin.example.com/*` with Cloudflare Access.
- Rate limit `/api/v1/admin/auth/login`.
- Rate limit `/api/v1/admin/auth/refresh`.
- Challenge suspicious countries/ASNs if relevant.
- Block obvious scanners.
- Block requests with invalid methods.
- Block direct `/docs` unless allowed.

### Public

- Rate limit `/_api/public/watch/exchange`.
- Rate limit invalid token attempts.
- Challenge high-frequency unknown user agents.
- Allow static assets normally.
- Consider bot protection for public watch abuse.

## Origin Protection

Best effort on shared hosting:

- Use Cloudflare proxied DNS.
- Do not publish origin API URL in public source.
- Restrict CORS to known admin/public origins.
- Backend should validate host/domain and CORS.
- If possible, firewall API origin to Cloudflare IP ranges.
- Keep secrets only on backend/worker environment variables.

## Hostinger Deployment Notes

Admin Web:

```bash
yarn build
# upload dist/ to Hostinger static hosting
```

The production build keeps source maps disabled and emits hashed route/page
chunks. Confirm that the Hostinger uploader includes both `.htaccess` files.

Public sites:

```bash
# upload static site folder
# ensure Worker routes exist for /_api and /_media
```

Backend:

- Use production env only on server.
- Run Prisma migrations carefully.
- Backup before migrations.
- Verify `/api/v1/health`.
- Verify DB connection.
- Verify LOCAL_FILE/private server storage upload and playback.
- Verify legacy Cloudinary records still display/preview if existing data requires it.

## Deployment Checklist

- [ ] Build Admin Web.
- [ ] Upload static assets.
- [ ] Upload `dist/.htaccess` and `dist/assets/.htaccess`.
- [ ] Verify `index.html` is not long-cached.
- [ ] Verify `/assets/*` uses one-year immutable browser caching.
- [ ] Verify admin API and authenticated media responses are not publicly cached.
- [ ] Configure Cloudflare DNS.
- [ ] Enable Cloudflare Access for admin domain.
- [ ] Configure WAF/rate limits.
- [ ] Configure security headers.
- [ ] Verify API CORS allowlist.
- [ ] Verify public site calls `/_api`.
- [ ] Verify public site removes token from URL.
- [ ] Verify share link on correct domain.
- [ ] Verify domain mismatch is rejected.
- [ ] Verify expired/revoked/over-view links fail.
- [ ] Verify LOCAL_FILE storage root is private and outside public web root.
- [ ] Verify chunked upload, preview, thumbnail replacement and purge for a test LOCAL_FILE video.
- [ ] Verify backup exists.
- [ ] Verify logs redact token.
