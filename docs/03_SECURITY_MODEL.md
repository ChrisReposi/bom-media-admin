# 03_SECURITY_MODEL.md — Security Model

## Threat Model

Assume attackers may:

- scan public domains
- discover API origin
- brute-force admin login
- replay stolen tokens
- attempt share-token enumeration
- abuse public watch endpoint
- upload oversized files
- upload malicious files
- try SSRF through remote video URL probing
- inject unsafe iframe/embed URL
- exploit domain mismatch bugs
- trigger DB connection exhaustion
- scrape/copy public video URLs
- abuse Cloudinary/API costs
- attempt broken object-level authorization
- attempt broken function-level authorization

## Security Baseline

The project should align with these principles:

- verify every object access server-side
- never trust client-side route guards
- rate limit sensitive flows
- validate all input
- sanitize embed URLs
- bound all expensive operations
- use least-privilege DB user
- log security events with token redaction
- keep backups and test restore
- rotate secrets before production

## Admin Security

### Required before production

- Cloudflare Access or equivalent in front of Admin Web.
- Backend JWT access token expiry kept short.
- Refresh token rotation active.
- Backend logout/revoke active.
- Login rate limit.
- Password change rate limit.
- Account disable/status guard.
- Admin audit logs for critical actions.
- Strong password policy.
- No public registration unless secret-gated and rate-limited.

### Stronger future option

Move refresh token into HttpOnly, Secure, SameSite cookie via backend/proxy/BFF flow.

## Public Watch Security

Required:

- verify `host`/domain
- verify share token hash
- reject missing/invalid token
- reject domain mismatch
- reject revoked link
- reject expired link
- reject over max views
- return only READY allowed videos
- increment views/access logs safely
- redact raw token from logs
- rate limit by IP hash + token hash + domain

## API Security Checklist

- [ ] Global ValidationPipe with whitelist/forbid/transform.
- [ ] DTOs reject unknown fields.
- [ ] No unbounded list endpoints.
- [ ] Pagination max limit enforced server-side.
- [ ] All admin routes protected by guard.
- [ ] Role guards for OWNER/ADMIN/STAFF if roles differ.
- [ ] Public routes expose only public fields.
- [ ] No raw DB blob bytes in JSON.
- [ ] No raw refresh/share token logs.
- [ ] No raw iframe storage.
- [ ] Safe embed host allowlist.
- [ ] Manual URL metadata probe has timeout and size cap.
- [ ] SSRF protections for probe URLs.
- [ ] Upload size/type validations.
- [ ] SVG thumbnail blocked.
- [ ] Cloudinary secrets server-side only.
- [ ] Swagger `/docs` protected in production.

## SSRF Risk in Metadata Probe

Manual direct URL duration probing can become an SSRF vector.

Mitigations:

- allow only http/https
- block private IP ranges
- block localhost/link-local
- resolve DNS and validate final IP
- follow redirects carefully with max redirect count
- timeout aggressively
- cap downloaded bytes
- disable probe in production if not necessary
- log probe failures without exposing URL secrets

## Embed Risk

Never store or render raw iframe HTML.

Safe flow:

```txt
input iframe or embed URL
  -> extract src
  -> parse URL
  -> validate protocol
  -> validate host allowlist
  -> normalize provider fields
  -> store sanitized embedUrl and provider metadata
  -> render iframe from sanitized URL only
```

## Token Security

### Share Tokens

- Generate using cryptographically secure random bytes.
- Store only hash.
- Use pepper in env.
- Return raw token only once.
- Do not persist raw token in Admin Web.
- Do not log raw token.
- Remove token from public URL after exchange.

### Refresh Tokens

- Use opaque random token.
- Store only hash.
- Rotate on refresh.
- Revoke on logout/password change.
- Track device/session metadata if useful.
- Backend session-bound access tokens should fail after logout/password change/session revoke.
- Admin Web must call backend logout before clearing local auth when a refresh token is present.
- Admin Web must still clear local auth if logout revoke cannot be confirmed.
- Refresh-token replay detection is backend-owned; Admin Web treats auth failure as a forced re-login.

## Cloudflare Security Layers

Recommended:

- WAF managed rules
- rate limiting rules
- bot fight/bot detection if available
- Cloudflare Access for admin domain
- DNS proxy on public/admin domains
- origin restricted to Cloudflare where possible
- security headers
- cache rules for static assets only
- no caching of private token exchange responses

## Frontend Anti-Copy Reality

Frontend can reduce casual copying, but cannot prevent determined copying.

Best-effort controls:

- `controlsList="nodownload"`
- disable PiP/remote playback when supported
- disable context menu/drag on video
- watermark
- same-origin media proxy
- signed/short-lived media URLs in future

For real anti-piracy, use DRM/HLS signed URLs/watermarking/CDN controls, not plain MP4 URLs.
