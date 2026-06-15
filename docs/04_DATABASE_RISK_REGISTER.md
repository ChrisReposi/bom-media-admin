# 04_DATABASE_RISK_REGISTER.md — DB Risk Register

## DB Context

Production target uses Hostinger MySQL/MariaDB.

DB stores:

- admin accounts
- hashed refresh tokens
- video metadata
- manual playback URLs
- embed URLs/provider fields
- optional DB_BLOB fallback videos
- websites
- domains
- domain groups
- video assignments
- share links and hashed tokens
- access logs
- audit logs

## Key Principle

Do not treat MySQL as video object storage for production.

Use MySQL for metadata and state. Use LOCAL_FILE/private server storage or
external object/CDN storage for media files.

## Risk Register

| Risk | Impact | Current Exposure | Mitigation |
|---|---:|---|---|
| Admin brute-force login | Account takeover, DB mutation | High if no rate limit | Add auth rate limit, Cloudflare WAF, lockout/backoff, strong passwords, Access gate |
| Public watch flood | DB connection exhaustion, downtime | High if token endpoint public | Rate limit by IP/domain/token, cache safe negative responses briefly, queue/log writes carefully |
| DB connection exhaustion | API down | Medium/high on shared hosting | Set Prisma connection limit, pool settings, API concurrency caps, rate limits |
| Unbounded pagination | Slow queries, memory pressure | Medium | Enforce max `limit`, indexed filters, cursor pagination later |
| AccessLog growth | DB storage/performance degradation | High over time | Partition/archive/purge old logs, aggregate analytics, cap retention |
| DB_BLOB videos | DB bloat, backups slow, packet errors | High if enabled prod | Disable `VIDEO_DB_STORAGE_ENABLED` in prod, move media to LOCAL_FILE/private storage or external object storage |
| Large uploads | Storage/cost/DoS | Medium | Upload size caps, MIME validation, streaming upload, quotas |
| Missing backups | Data loss | Critical | Daily backups, offsite copy, restore drills |
| Untested restore | False sense of safety | Critical | Monthly restore test into staging DB |
| SQL injection | Data breach/corruption | Low if Prisma used correctly | Avoid raw SQL; parameterize any `$queryRaw`; never use `$queryRawUnsafe` with user input |
| Broken object authorization | Cross-tenant/domain data leak | High business impact | Check website/domain ownership/status in every endpoint |
| Domain takeover/misclaim | Wrong site gains access | High | Normalize domain, uniqueness, active status checks, claim-current guard |
| Token hash leakage | Private video access | Medium | Use pepper, rotate tokens, restrict DB access |
| Plaintext secrets in DB/logs | Full compromise | Critical | Never store secrets, redact logs, rotate exposed values |
| Hostinger DB public exposure | Direct attack surface | Unknown | Restrict remote access if possible; use strong DB password; API-only DB access |
| No least privilege | Full DB damage if app compromised | High | Use separate DB users for app/migration/backup where possible |
| Destructive admin action | Accidental data loss | Medium | Soft delete, purge guard, confirmation, audit logs |
| Migrations on prod | Broken schema | Medium | Backup before migrate, migration review, maintenance window |
| Slow queries | Timeout/outage | Medium | Add indexes, analyze query plans, monitor |
| Public media URL leakage | Copying/rehosting | Medium | CDN controls, short-lived signed URLs in future |
| Cloudinary abuse | Cost spike | Medium | Upload admin-only, rate limit, quota, folder isolation |

## Hostinger MySQL Hardening

Recommended:

- Use a strong unique DB password.
- Do not reuse DB password across environments.
- Restrict remote DB access to the API server if Hostinger allows it.
- Do not expose phpMyAdmin or DB tools publicly without strong protection.
- Use one DB for production and another for staging.
- Keep local development DB separate.
- Keep `SHADOW_DATABASE_URL` out of production runtime.
- Backup before every migration.
- Export backup after major admin/content changes.
- Store encrypted backup outside Hostinger.

## Prisma/Connection Risk

Prisma uses a connection pool. On small/shared MySQL, too many API instances or too high pool limit can exhaust connections.

Recommendations:

- Set database URL `connection_limit` conservatively.
- Keep API instances limited on Hostinger/VPS.
- Add HTTP rate limits before DB.
- Avoid N+1 queries in list endpoints.
- Use `select` to return only needed fields.
- Keep indexes aligned with filters:
  - domain
  - tokenHash
  - status
  - createdAt
  - websiteId
  - videoId

## Backup Strategy

### MVP Backup

- Daily automated DB export.
- Manual backup before migrations.
- Offsite encrypted copy.
- Keep at least:
  - 7 daily backups
  - 4 weekly backups
  - 3 monthly backups

### Restore Drill

At least monthly:

1. Create staging restore DB.
2. Import latest backup.
3. Run Prisma validation or API smoke tests.
4. Verify admin login with test account.
5. Verify website/domain/share-link tables.
6. Document restore duration.

## DB 2 / Failover Guidance

A second DB is useful only if you can keep it synchronized and know how to fail over.

For this project stage:

- Prioritize backups + restore drill first.
- Add read replica/failover only when traffic/revenue justifies it.
- If Hostinger does not offer managed replication, manual DB2 can become stale and dangerous.
- Define RPO/RTO before implementing DB2.

Suggested MVP:

```txt
Primary Hostinger MySQL
Daily backup
Offsite backup copy
Manual restore to standby DB when incident happens
```

Suggested growth stage:

```txt
Managed MySQL provider
Automated backups
Point-in-time recovery
Read replica
Monitoring
Failover procedure
```

## What YouTube/Netflix-Style Systems Do Differently

Large video platforms do not store all video bytes in a single relational DB.

They typically use:

- object/blob storage for video files
- CDN edge caching for delivery
- transcoding pipelines
- adaptive streaming (HLS/DASH)
- metadata databases
- distributed caches
- search/indexing systems
- event logs/analytics pipelines
- multiple replicas and regions
- strict internal access control
- abuse detection/rate limiting

For this project, the practical version is:

- LOCAL_FILE/private server storage or object storage for video
- MySQL for metadata
- Cloudflare/CDN for public static and proxy/WAF
- strict token/domain checks
- good backups and rate limits
