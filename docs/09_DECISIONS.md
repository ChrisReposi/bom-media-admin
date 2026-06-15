# 09_DECISIONS.md — Architecture Decisions

## ADR-001 — Admin Web is the only admin interface

### Decision

All admin management actions must happen in Admin Web.

### Reason

Public websites are cloned/deployed across many domains. Keeping admin logic inside public sites increases attack surface and makes each public site a possible admin API client.

### Consequence

Remove or avoid:

- public mini admin route
- public admin login
- public create video
- public create share link
- public admin token sessionStorage

## ADR-002 — Public sites use same-origin proxy routes

### Decision

Public sites call `/_api` and `/_media`, not hardcoded API origins.

### Reason

This reduces API origin exposure and allows Cloudflare Worker/WAF/rate limits.

### Consequence

Every production public site needs Worker/reverse-proxy config.

## ADR-003 — DB_BLOB is not public playback

### Decision

DB_BLOB videos are admin-preview/local fallback only.

### Reason

Serving large video bytes from MySQL can overload DB, slow backups and create cost/performance risk.

### Consequence

Use Cloudinary/object storage/CDN for production media.

## ADR-004 — Raw share token is one-time visible

### Decision

Raw token/public URL is shown only immediately after creation.

### Reason

Backend stores only token hash. Raw token recovery is impossible and should remain impossible.

### Consequence

Admin Web must not persist raw token to Redux/localStorage.

## ADR-005 — Hostinger MySQL is acceptable for MVP with backup discipline

### Decision

Hostinger MySQL may be used for MVP metadata/state.

### Reason

Current scale is likely small enough and project benefits from simpler deployment.

### Consequence

Must add:

- backups
- restore drill
- rate limits
- connection limits
- no large video storage in DB
- monitoring

## ADR-006 — Cloudflare Access protects Admin Web

### Decision

Admin Web should be protected by Cloudflare Access or an equivalent identity gate.

### Reason

Admin Web is high-value. Backend auth is necessary but an edge identity layer reduces brute force and scanning exposure.

### Consequence

Admin Web deployment must include Access/WAF documentation.

## ADR-007 — Security is enforced in backend, not frontend

### Decision

Frontend checks are UX only.

### Reason

Attackers can bypass frontend code.

### Consequence

Backend must enforce auth, roles, domains, token validity, upload limits, statuses and destructive action constraints.
