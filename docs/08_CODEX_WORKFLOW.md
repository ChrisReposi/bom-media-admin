# 08_CODEX_WORKFLOW.md — Codex Workflow

## Standard Prompt Template

Use this when starting a new Codex session:

```txt
Hãy đọc AGENTS.md, PLAN.md, session-log.md và docs/* trước.
Dự án này là Admin Web riêng, không phải backend và không phải public static site.
Chỉ sửa đúng scope mình yêu cầu.
Không thêm admin mini page vào public site.
Sau khi sửa, chạy typecheck/lint/build nếu phù hợp và cập nhật session-log.md.
```

## Before Editing

Codex should:

1. Read AGENTS.md.
2. Read PLAN.md.
3. Read session-log.md.
4. Read relevant docs.
5. Inspect current files.
6. Identify exact scope.
7. Avoid broad rewrites unless requested.

## During Editing

Codex should:

- keep changes small and reviewable
- preserve existing architecture
- prefer typed API contracts
- avoid adding dependencies without approval
- keep UI states complete
- keep security decisions server-side
- update docs if architecture changes

## After Editing

Codex should:

1. Run relevant checks.
2. Update session-log.md.
3. Summarize changed files.
4. Mention any checks not run.
5. Mention pending risks.

For release-affecting changes, Codex should also update or reference:

```txt
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
```

Update the smoke-test checklist whenever auth, routing, protected API contracts, deployment env, or release verification behavior changes.

## Session Log Template

```md
## YYYY-MM-DD — Short title

### Changed
- ...

### Verified
- ...

### Pending
- ...
```

## Good Codex Task Examples

```txt
Bổ sung Settings change password UI dựa vào docs/06_API_CONTRACTS.md.
Không đổi auth flow khác. Chạy typecheck/build và cập nhật session-log.md.
```

```txt
Thêm share-link list/revoke page. Đọc AGENTS.md và PLAN.md trước.
Không persist raw token. Thêm loading/error/empty states.
```

```txt
Kiểm tra Admin Web có còn nơi nào gọi public endpoint cho admin data không.
Nếu có, refactor sang admin API client.
```

## Bad Task Patterns to Avoid

Avoid prompts like:

```txt
Tối ưu toàn bộ project cho production.
```

Better:

```txt
Tối ưu production checklist P0: backend logout integration in Admin Web, CSP headers docs, and session-log update.
```

## Commit Message Style

Suggested:

```txt
feat(admin): add share link revoke page
fix(auth): call backend logout before clearing session
docs(security): add production DB risk checklist
refactor(videos): split create modal source confirmation
```
