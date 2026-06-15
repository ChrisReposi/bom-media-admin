# 10_BACKLOG.md — Backlog

## Security / Production P0

- [ ] Backend logout revoke refresh token.
- [x] Admin Web logout calls backend logout before clearing state.
- [ ] Browser-verify Admin Web logout against deployed/local backend.
- [ ] Run Admin Web production smoke test before launch.
- [ ] Auth rate limiting.
- [ ] Public watch rate limiting.
- [ ] Cloudflare Access for Admin Web.
- [ ] Cloudflare WAF/rate rules.
- [ ] Protect/disable Swagger in production.
- [ ] Rotate secrets.
- [ ] Backup and restore drill.
- [ ] Confirm `VIDEO_DB_STORAGE_ENABLED=false` in production.
- [ ] Browser-verify LOCAL_FILE upload/preview/purge against deployed/local backend.

## Admin Web P1

- [x] Settings change password UI.
- [ ] Browser-verify Settings password-change flow against deployed/local backend.
- [ ] Share link list page.
- [ ] Share link revoke action.
- [ ] Access logs page.
- [ ] Audit logs page.
- [ ] Domain group management UI.
- [ ] Role-aware navigation/actions.
- [ ] Confirmation dialogs for all destructive actions.
- [ ] Session timeout/idle logout.

## Videos P1

- [ ] Stronger create video source confirmation UX.
- [ ] Better status management.
- [x] LOCAL_FILE chunked upload progress UX.
- [ ] Browser-verify upload cancel cleanup against backend.
- [ ] Thumbnail upload/capture verification.
- [ ] DB_BLOB feature flag warning in UI.
- [x] Purge safety confirmation on video detail.

## Websites/Domains P1

- [ ] Domain conflict UX improvement.
- [ ] Claim-current-domain warning/confirmation.
- [ ] Domain group selector.
- [ ] Website video assignment UI improvements.
- [ ] Sort assigned videos UI.

## Public Site P1

- [ ] Remove admin mini pages from all static site templates.
- [ ] Remove admin API calls.
- [ ] Ensure `/_api` and `/_media` only.
- [ ] Token cleanup after exchange.
- [ ] No token appended to internal links.
- [ ] Security headers and robots.txt applied.

## Performance P2

- [ ] Vite chunk splitting.
- [ ] Lazy load heavy pages.
- [ ] Avoid loading 100 videos/websites on dashboard if data grows.
- [ ] Server-side search/pagination everywhere.
- [ ] Cache public-safe assets.
- [ ] Archive access logs.

## Testing P2

- [ ] Unit tests for API client error helpers.
- [ ] Component tests for login/share composer.
- [ ] E2E login flow.
- [ ] E2E create share link.
- [ ] E2E public watch valid/invalid token.
- [ ] Backend authorization tests.
- [ ] Restore drill test documentation.
