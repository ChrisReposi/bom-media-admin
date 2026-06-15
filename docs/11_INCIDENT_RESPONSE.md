# 11_INCIDENT_RESPONSE.md — Incident Response

## Incident Types

### 1. Admin Account Compromise

Immediate actions:

1. Disable compromised admin account.
2. Revoke all refresh tokens for that admin.
3. Rotate JWT secrets if token compromise scope is unknown.
4. Review AdminAuditLog.
5. Review recent video/domain/share-link changes.
6. Rotate Cloudinary/API secrets if exposed.
7. Force password reset.
8. Add WAF/Access rule if attack vector is known.

### 2. DB Down or Corrupted

Immediate actions:

1. Put API in maintenance mode if possible.
2. Stop write-heavy jobs.
3. Check Hostinger DB status.
4. Export current DB if accessible.
5. Restore latest verified backup to staging/standby DB.
6. Verify schema and core tables.
7. Point API to restored DB only after verification.
8. Document data loss window (RPO).

### 3. Public Watch Abuse

Immediate actions:

1. Add temporary Cloudflare rate limit/challenge.
2. Block abusive IP/ASN/user-agent pattern if clear.
3. Check access logs for token/domain concentration.
4. Revoke abused share links if needed.
5. Lower max views or expiry for sensitive links.
6. Review backend rate limit thresholds.

### 4. Secret Leak

Immediate actions:

1. Identify leaked secret type.
2. Rotate secret.
3. Invalidate dependent tokens if needed.
4. Remove secret from repo/build logs.
5. Rewrite git history only if necessary and safe.
6. Review access logs.
7. Update `.env.example` without real values.

### 5. Cloudinary Abuse

Immediate actions:

1. Disable upload endpoints temporarily if needed.
2. Rotate Cloudinary API secret.
3. Check uploaded assets/folders.
4. Remove malicious/abusive assets.
5. Add stricter upload rate limits.
6. Enforce file type/size.

## Emergency Contacts / Notes

Fill these in before production:

```txt
Hostinger account owner:
Cloudflare account owner:
Cloudinary account owner:
Domain registrar:
Backup storage location:
Latest restore drill date:
API deploy location:
Admin Web deploy location:
```

## Post-Incident Review Template

```md
# Incident Review — YYYY-MM-DD

## Summary

## Timeline

## Impact

## Root Cause

## What worked

## What failed

## Fixes completed

## Follow-up tasks

## Owner
```

## Minimum Recovery Targets

For MVP:

```txt
RPO: <= 24 hours
RTO: <= 4 hours
```

For paid/high-traffic production:

```txt
RPO: <= 1 hour or point-in-time recovery
RTO: <= 30–60 minutes
```
