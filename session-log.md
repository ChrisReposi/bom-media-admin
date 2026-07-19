# session-log.md — Codex Handoff Log

This file records important project context and changes for future Codex sessions.

## 2026-07-19 — Gate 3B: incomplete canonical evidence UX

### Changed

- Added the minimal stable-code mapping for API `CANONICAL_EVIDENCE_INCOMPLETE` with an actionable Vietnamese checksum-remediation message. No checksum display/storage, canonical type/card change, generic review-bundle change, raw-token behavior change or Dashboard workflow change.
- Extended the canonical contract test to pin the exact recovery copy and reject ownership/copyright claims.

### Verified

- Focused canonical contract: 12/12 pass. Mutation proof: temporarily removing the new mapping made the intended suite fail 2/12; after restoring the uncommitted mutation, 12/12 passed. Full Admin suite: 59/59 pass across 14 suites. `typecheck`, `lint`, `format:check`, focused test formatting, `build`, `smoke:build` (10/10), Yarn dependency `check`, and `git diff --check` pass.
- No browser or Production access; no push, merge or deploy.

### Pending

- Gate 3C and Gate 4 are outside this change.

## 2026-07-19 — Gate 2: canonical raw-token display removed

### Changed

- Removed `rawToken` from `CanonicalShareLinkResponse` and removed the canonical card's one-time-secret section. Alias, byte-for-byte backend `publicUrl`, CREATED/REUSED copy, evidence snapshot summary and DMCA disclaimer are unchanged.
- Generic `CreateShareLinkResponse` and `CreatedShareLinkCard` retain the legacy review-bundle raw-token behavior. No canonical token state, storage, logging or persistence path was added.
- Added source-contract tests pinning canonical type/card absence, alias/URL display, generic compatibility, disclaimer preservation, and no canonical local/session storage or console logging.

### Verified

- Targeted canonical contract: 11/11 pass. Full Admin suite: 58/58 pass.
- Mutation proof: temporarily adding `rawToken?: string` back to the canonical type caused the intended contract test to fail 1/11; after removing the uncommitted mutation, 11/11 passed.
- `typecheck`, `lint`, `format:check`, `build`, `smoke:build` (10/10), `yarn check` (Yarn 1 dependency consistency), `yarn run check` (project script), and `git diff --check` pass. Production and a real browser were not accessed.

### Pending

- Gate 3 and Gate 4 were not started. Deployed/browser verification remains not run.

## 2026-07-18 — Canonical video share link workflow (feature branch)

### Changed

- Single-selection mode now calls the idempotent canonical endpoint: button `Lấy URL canonical`; toasts distinguish `Đã tạo URL canonical.` (CREATED) from `Đã sử dụng lại URL canonical hiện có.` (REUSED); label/maxViews/expiresAt inputs are disabled with an explanation. Multiple-selection keeps the generic bundle flow with button `Tạo review bundle` and the notice that bundle links are not per-video canonical URLs.
- New `CanonicalShareLinkCard`: Canonical badge, CREATED/REUSED chip, website/video/alias/createdAt, masked snapshot summary, copy button — and the canonical publicUrl rendered **verbatim** (never re-normalized; it is the recorded provenance value). Raw token shown once only on CREATED; nothing canonical is persisted client-side. No ownership/approval claims.
- `websiteApi.createCanonicalShareLink/getCanonicalShareLink`, `CanonicalShareLinkResponse` type, and pure `canonicalShareLinkPolicy.ts` (outcome copy, stable-code → Vietnamese error map incl. DOMAIN_HAS_ACTIVE_CANONICAL_LINKS / VIDEO_HAS_CANONICAL_SHARE_LINK, snapshot summary).
- `shareLinkUrlUtils` made Node-importable (optional-chained `import.meta.env`) to enable table-driven URL tests; behavior unchanged.

### Verified

- typecheck, lint, **tests 54/54** (7 new: outcome copy, full stable-code map, snapshot summary masking, URL normalization table incl. idempotence on the canonical form and deep-link video ids), format, build, smoke 10/10.
- Backend pairing proven separately on local MySQL (see API session-log): 20 concurrent create-or-get → 1 CREATED + 19 REUSED with one alias/URL.

### Pending

- Real-browser pass of the new Dashboard flow — NOT_RUN here; wire-level and unit evidence only.

## 2026-07-18 — Release packaging and CI

### Changed

- Created branch `release/2026-07-18-production-hardening` and committed the audited working tree per the persisted manifests (`~/Desktop/bom-media/release-manifests/2026-07-18/`): W1 (21 files, auth/RBAC/session/forced-password + real test script), W2 (41, scoped dashboard, selection modes, video workflows, a11y, filterKey client hardening), W3 (7, owner account management UI). Each commit staged via `git add --pathspec-from-file` and verified name-for-name against its manifest.
- Added `.github/workflows/ci.yml`: install → typecheck → lint → test → format:check → build → smoke:build → `git diff --check`; concurrency cancel, pinned action majors, Node 22, Yarn only.

### Verified

- Post-commit suite: typecheck, lint, **tests 47/47**, format:check, build, smoke:build (10 checks), `yarn run check`, `git diff --check` — clean tree after every commit.

### Pending

- Push/merge/deploy left to the operator. Deployment order and browser acceptance live in the API repo's `docs/operations/production-release-runbook.md` (API deploys first; Admin dist must be uploaded atomically + Cloudflare purge).

## 2026-07-18 — CreateVideo filterKey persistence incident

### Incident

- `Key lọc video` entered in CreateVideoModal was lost after LOCAL_FILE upload; EditVideoModal could set it afterwards.

### Proven Root Cause

- The pre-fix working tree (API side) contained a partial-update bug; it is fixed by the API change referenced below, and the description here is of the pre-fix behavior.
- **Server-side, not the form or client payload.** `uploadLocalVideo` fires a metadata-only `updateVideo` PATCH (durationSeconds/thumbnailUrl from auto-analysis) right after completion; the API cleared `filterKey` whenever that PATCH omitted the field (validated-DTO own-property bug — see API session-log 2026-07-18). Wire-proven locally: completion stored `sml`, the PATCH nulled it.
- Admin layers audited and cleared: `register("filterKey", { onBlur })` keeps RHF handlers; `prepareForSourceChange`/`clearAppliedSourceMetadata` never touch filterKey; `reset(defaultValues)` only on close/success; init request carries normalized `filterKey`; `cleanUpdatePayload` omits `filterKey` unless the caller provides it (both working tree and HEAD) — client did not send `filterKey: null`.

### Changed

- `src/features/videos/videoUpdatePayload.ts` (new): `cleanUpdatePayload`/`cleanVideoFilterKey` moved verbatim out of `videoApi.ts` into a pure module (no axios / `import.meta.env`) so the PATCH contract is unit-testable; `videoApi.ts` now imports them. No behavior change.
- `test/video-update-payload.test.ts` (+4): metadata-only patch has no `filterKey` property; explicit `SML`→`sml`; explicit `""`/`null` → `filterKey: null`; `cleanVideoFilterKey` edge cases.

### Verified

- typecheck, lint, **tests 47/47**, format:check, build, smoke:build, `yarn run check`, `git diff --check` — all pass.
- Built chunks carry the wiring: `CreateVideoModal-*.js` and `videoFormatters-*.js` contain `filterKey` and `upload-local/init`.
- Full local chain (against fixed API): init(`SML`) → metadata `"sml"` → chunk → complete `"sml"` → metadata-only PATCH keeps `"sml"` → detail/list/`?filterKey=sml` all return it; concurrent completes yield one video; recovery re-complete keeps the key.

### Deployment Required

- API must deploy first (fix is server-side). Then upload Admin `dist` atomically + purge Cloudflare and verify chunk hashes.

### Pending

- Real-browser DevTools pass on production (init payload + PATCH behavior) — NOT_RUN here; local wire-level evidence only.

## 2026-07-17 — Dashboard selection modes and production video-search alignment

### Incident

- Production Dashboard search hit global `GET /admin/videos?...search=abc...` and got 500; VideosPage search got the same 500. Create Video reportedly lost `filterKey`. Requested: single/multiple selection modes for the share-link picker.

### Proven Root Cause (Admin side)

- **PROVEN:** committed Admin HEAD (`9980f8b`) Dashboard still calls global `getVideos()`; the website-scoped implementation (`getWebsiteVideos`, `websiteVideoQuery.ts`, cache/version guards) exists only in the uncommitted working tree. Production therefore runs the global-endpoint Dashboard — the observed production URL is expected behavior for that build, not artifact corruption. The 500 itself is an API/DB-side issue (see API session-log matrix: schema-drift P2022 mechanism proven locally; production evidence NOT_VERIFIED).
- **filterKey:** HEAD Admin already registers, normalizes and sends `filterKey` for manual/embed/LOCAL_FILE (verified in HEAD and working tree; `register("filterKey", { onBlur })` merges — does not override — RHF handlers; reset only fires on close/successful submit, not on mode switch). Production loss is consistent with stale/mixed cached JS chunks (field renders, old `videoApi` chunk omits the key; whitelisted API accepts the create). Classification: DEPLOYMENT_OR_VERSION_DRIFT, NOT_VERIFIED against production.

### Changed

- `src/features/dashboard/dashboardSelectionPolicy.ts` (new): `VideoSelectionMode`, `applyVideoSelection`, `reconcileSelectionForMode` — pure, order-preserving; single mode holds ≤1 id, re-picking deselects, collapsing keeps the most recent pick.
- `src/pages/DashboardPage.tsx`: `videoSelectionMode` state (default `multiple`), toggle routed through the policy, mode switch trims locally without any request, assignment-error reconciliation composes the mode reconcile so single mode stays ≤1.
- `src/features/dashboard/components/ShareLinkComposer.tsx`: segmented control (`role="group"`, native buttons with `aria-pressed`: “Chọn 1 video” / “Chọn nhiều video”) plus single-mode helper text. Share-link payload remains `videoIds: string[]`.
- Tests: `test/dashboard-selection-policy.test.ts` (9), `test/website-video-query-contract.test.ts` (3).

### Verified

- typecheck, lint, **tests 43/43**, format:check, build, smoke:build, `yarn run check`, `git diff --check` — all pass.
- Built `dist` proof: the Dashboard share-link flow calls `/admin/websites/${id}/videos` (websiteApi chunk); global `/admin/videos` remains only in the videoApi chunk used by VideosPage and the assignment dialog (which searches the global catalog by design).
- Scoped invariants confirmed in source: limit 24, debounce 400ms, min 2/max 80, `status=READY`, `assignmentStatus=ACTIVE`, `eligibleForShareLink=true`, AbortController + dataset-version + website guards, cache key excludes selection mode, website change clears selection. Backend scoped endpoint E2E: 6/6 → HTTP 200 with correct totals (see API log).

### Deployment Required

- Deploy the API (with migrations) **before** this Admin build; then upload `dist` atomically, purge Cloudflare, and verify new chunk hashes — mixed old/new chunks are the leading suspect for the production filterKey loss.

### Pending

- Browser acceptance matrix (roles, rapid website switching, selection retention under search) and production smoke — NOT_RUN this session; local automated checks only.

## 2026-07-17 — Dialog descriptions and form-field identity audit

### Root Cause

- `installHook.js` was never the source; it is only where React DevTools logs the warning. It was not modified.
- **Dialog warning:** `BaseDialog` in `src/features/adminAccounts/components/AdminAccountManagement.tsx` rendered `Dialog.Content` with a `Dialog.Title` but no `Dialog.Description` and no `aria-describedby`. Every OWNER account dialog (create, role, status, revoke, reset, logical delete, temporary password) goes through that wrapper, so each one warned. The other two Radix call sites were already correct: `ConfirmActionDialog` had a real `Dialog.Description`, and the `MainLayout` mobile drawer already carried an intentional `aria-describedby={undefined}`.
- **Form-field warning:** controlled fields never passed `id`/`name`. `aria-label` satisfies the accessible name but not the browser's id/name requirement, so labelled-looking fields still warned. Two shared wrappers (`LabeledInput`, `PasswordField`) hid the problem behind a wrapping `<label>`, which associates but supplies no identity.
- The `Input`/`Textarea`/`input-group` primitives in `src/components/ui/` forward props correctly and were left unchanged; identity belongs to the call site.

### Fixed

- `BaseDialog` now takes a **required** `description: ReactNode` rendered through `Dialog.Description`, so Radix wires `aria-describedby` itself. TypeScript enforces it at every call site. Added `actionDescription()` stating the real consequence per action (role change, disable, revoke sessions, reset, logical delete). No dialog uses a placeholder or empty description.
- `ConfirmActionDialog`: dropped the hardcoded `confirm-action-title` / `confirm-action-description` ids and the manual `aria-labelledby`/`aria-describedby`, letting Radix generate collision-free ids. Four pages mount two instances each, so the fixed ids were a latent duplicate-id hazard. Nothing referenced them.
- Visible descriptions added (no `sr-only` needed): all account dialogs via `BaseDialog`.
- Intentional `aria-describedby={undefined}`: only the `MainLayout` mobile navigation drawer (pre-existing, unchanged) — a title-only nav drawer with no consequence to describe. It was **not** applied anywhere else and never added to a shared wrapper.
- Added `id`/`name` and explicit `htmlFor` (converting wrapping labels to explicit associations) across 16 files: videos search/filter-key; websites search/domain/domain-group; domains search/usage-status/status/group; the two purge checkboxes; admin-account search/role/status/include-deleted and every account dialog field; domain, domain-group, assign-domain and claim-domain modals; website domain panel; edit-video thumbnail and replacement file inputs; share-link composer and created-share-link fields; assign-video dialog; and the player seek/volume range inputs.
- `LabeledInput` and `PasswordField` now require `id`/`name` from the call site. `PasswordField` previously derived its DOM id from Vietnamese label text via `.replace(/\W/g, "-")`, which collapses diacritics (`"Mật khẩu hiện tại"` → `M-t-kh-u-hi-n-t-i`); the three live labels happened not to collide, so this was fragility, not a live bug.
- `ReadyVideoPicker` renders one checkbox per video, so it uses `ready-video-${video.id}` rather than a static id. Only non-sensitive record ids appear in the DOM — no token, password or email.
- Wired existing hint/error text to fields via `aria-describedby` where a stable target exists (videos search hint, videos filter-key error, domain-form host hint, claim-domain host hint).

### Verified

- Baseline before any edit was already green (typecheck, lint, 25/25 tests, format, build, smoke), so nothing here fixed or masked a pre-existing failure.
- `yarn test` is a real suite (`node:test` via tsx), not a placeholder: 25 → **30 passing**, 7 suites.
- Added `test/dialog-and-form-field-accessibility.test.ts` (5 source-contract checks: dialog description-or-opt-out, no empty description, form-control identity, per-file unique static ids, resolvable `aria-describedby`). Each check was **mutation-tested** — removing `Dialog.Description`, stripping the videos-search `id`/`name`, and forcing a duplicate id each made the intended test fail; the tree was restored and re-verified.
- Static audit across all of `src/`: 84 static ids, zero duplicates; no list-rendered card component holds a static id; the only remaining controls without `id`/`name` are the three prop-forwarding `components/ui/` primitives, which is correct.
- Final: typecheck, lint, 30/30 tests, format:check, build, smoke:build, `git diff --check` all pass. No new dependency; `yarn.lock` untouched; no `package.json` change.
- No warning suppression was introduced: no `console.warn` override, no Radix monkey-patch, no eslint-disable, no message filtering.
- Dev server (`yarn dev:local`) boots and Vite transforms the changed modules (HTTP 200), confirming no import/compile break.

### Pending

- **Browser console verification: NOT_RUN.** No browser automation is available in this environment and Playwright/Cypress were out of scope, so the runtime warnings were not observed as gone. The fix is verified by source contract, types and the build only. A human must run `yarn dev:local`, open DevTools (Preserve log + Warnings + Errors) and walk `/login`, `/change-password-required`, `/`, `/videos`, `/videos/:videoId`, `/websites`, `/domains`, `/settings` and an unknown route, opening and closing every dialog per role (OWNER/ADMIN/STAFF), then confirm each of these returns `[]`:
  - fields missing identity: `[...document.querySelectorAll("input, select, textarea")].filter((element) => !element.id && !element.getAttribute("name"))`
  - duplicate ids: `[...document.querySelectorAll("[id]")].map((element) => element.id).filter((id, index, ids) => ids.indexOf(id) !== index)`
  - dangling `aria-describedby`: `[...document.querySelectorAll("[aria-describedby]")].flatMap((element) => (element.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).filter((id) => !document.getElementById(id)))`
  - broken labels: `[...document.querySelectorAll("label[for]")].filter((label) => !document.getElementById(label.htmlFor))`
- Also confirm by hand that focus trap, Escape, backdrop close, focus restore, submit lock and the OWNER-only purge/account gating still behave as before.
- No standalone `scripts/audit/` script was added: the same checks live in `test/` where `yarn test` already runs them, which avoids a new `package.json` script and a second copy of the same regex logic.

## 2026-07-16 — OWNER account UI, forced-password flow and cross-tab auth coordination

### Goal And Implementation

- Replaced Settings' shared-secret password form with reusable `change-own-password` UX for every role and a safe own-session list/revoke panel. Confirmed password change or current-session revoke clears persisted auth and requires login again; logout 5xx/network failure still preserves local state and offers a warned local-only clear.
- Added seven centralized `adminAccount.*` permissions, all OWNER-only. Only OWNER mounts/fetches the account feature; ADMIN/STAFF/unknown roles never request the list. The feature provides bounded list/search/filter/pagination and create, role, status, revoke, reset and logical-delete dialogs with current-OWNER password step-up.
- Temporary passwords appear only in a dedicated one-time dialog, are never toasted or put in Redux Persist, and are cleared from component state on close. Delete requires exact username plus acknowledgement. Mutations use submission latches, no optimistic state and authoritative refetch; stable codes map to Vietnamese without parsing server messages.
- Added `/change-password-required` outside the business layout. The route boundary redirects forced accounts away from navigation/business pages; the page exposes only own-password change and safe logout behavior.
- Added same-origin cross-tab coordination: BroadcastChannel with storage fallback, shared identity update/logout propagation, hard reload on identity replacement, Web Locks with bounded localStorage lease fallback, and a short SHA-256-bound refresh handoff so the lock loser cannot replay the old refresh token before Redux receives the broadcast. The lease never contains a credential.

### Commands And Verification

- `yarn install --frozen-lockfile`, typecheck, lint, build, format check, static build smoke and `git diff --check`: passed.
- `yarn test`: 25/25 passed in 5 suites. New coverage verifies every account permission is OWNER-only/default-deny, forced-route redirects, stable-code mapping, same/different identity behavior, refresh lease serialization and hashed old-token handoff.
- Static build smoke passed all 10 checks; the forced-password and Settings/account chunks were produced. `yarn audit --groups dependencies --level moderate` was UNVERIFIED because the Yarn registry endpoint returned HTTP 410. No npm/pnpm lockfile exists.

### Known Limitations And Manual Actions

- Browser acceptance with real OWNER/ADMIN/STAFF, two tabs and independent profiles is still required in staging. Web Locks and BroadcastChannel fallback behavior was unit-tested but not exercised across real browsers/devices here.
- Production must keep account management disabled until the API migration/read-only data audit and staging account lifecycle pass. Hostinger/Cloudflare, backup/restore, legacy share-link decisions and deployed public artifact checks remain separate gates.

### Next Recommended Prompt

- “Run staging browser acceptance with one OWNER, ADMIN and STAFF across two profiles and multiple tabs; verify forced password, one-time password handling, stale role 403, logout 5xx retry and refresh/logout/identity propagation before enabling Production.”

## 2026-07-16 — Website-scoped share-link composer and explicit assignment UX

### Goal And Root Cause

- Fix the share-link incident where Dashboard loaded global READY videos, allowed a cross-website selection, then received backend assignment rejection. The backend invariant remains the security boundary.

### Changed

- Dashboard now waits for a selected website and reads paginated eligible assignments from `GET /admin/websites/:websiteId/videos` with ACTIVE assignment, READY status and `eligibleForShareLink=true`. Global `/admin/videos` remains unchanged for video management and is used only inside the explicit assignment dialog.
- Video cache keys include admin scope, website, page, limit, search, filter, status, sort and assignment/eligibility scope. Exact website invalidation runs after assignment, and video mutations clear eligibility caches because affected websites are not known client-side.
- Website switch increments the dataset version, aborts the old request, clears loading/search state, page, videos, selections and created link. Responses must match both request version and current website before applying.
- Added an ADMIN/OWNER-only explicit assignment dialog; it requires user selection/confirmation and calls the additive single-assignment endpoint. STAFF still sees read-only content and cannot render or send the action.
- Stable `VIDEO_NOT_ACTIVE_FOR_WEBSITE` errors refresh the scoped list, remove server-reported invalid IDs and show Vietnamese recovery text. No automatic create retry occurs. Submission gates prevent same-tick duplicate assignment/share-link requests.
- Empty states distinguish no website, no assignment, assigned-but-not-eligible, search miss and assignment change. Video create/status/source/binary changes invalidate cached eligibility.

### Commands And Verification

- `yarn install --frozen-lockfile`, `yarn typecheck`, `yarn lint`, `yarn test`, `yarn build`, `yarn format:check`, `yarn smoke:build` and `git diff --check`: passed.
- `yarn test`: 19/19 tests passed in 4 suites. New coverage verifies website-separated cache keys, exact invalidation, stale-response rejection, stable error mapping/reconciliation, query-param allowlisting, empty states and duplicate-submit guards. Existing RBAC/logout/upload-409 coverage remains green.
- Static build smoke passed all 10 checks. `yarn audit --groups dependencies --level moderate` could not complete because the Yarn registry audit endpoint returned HTTP 410; no dependency was changed in this workstream.

### Known Limitations And Manual Actions

- Production data was not accessed. Two unrelated local legacy links remain owner-review cases, and Production must be audited read-only before deployment.
- Staging browser acceptance is required for real STAFF/ADMIN/OWNER users, rapid website switching, explicit assignment confirmation, server-side assignment race recovery and deployed public playback.

### Next Recommended Prompt

- “Deploy the additive API to staging, then run browser acceptance for website A/B switching, explicit assignment, structured assignment-race recovery and role-specific controls before deploying the Admin Web.”

## 2026-07-14 — Backend RBAC, upload-complete and logout compatibility

### Goal

- Align the Admin Web with backend STAFF/ADMIN/OWNER permissions, reconcile concurrent LOCAL_FILE completion, and stop treating an unconfirmed server logout as success.

### Changed

- Added centralized, default-deny `AdminPermission` policy and permission hook/gates. STAFF retains read/self-service only; ADMIN can use normal website/domain/video/share/upload writes but cannot permanently purge; OWNER can purge.
- All current mutation entry points on dashboard, websites, domains, video list and video detail are permission gated. Role changes close stale mutation/purge dialogs, guarded handlers cannot send writes, and STAFF receives a compact read-only notice. Password self-service remains available to all authenticated roles.
- HTTP 403 is now a permission error and does not trigger re-auth/logout. HTTP 401 retains the session-invalid policy. Login/refresh responses remain the source of the cached admin role, with backend 403 as the final authority for a server-side role change.
- Logout now sends both the existing refresh-token body and the access-token Bearer credential. Confirmed success or 401 clears local auth and redirects; network/5xx preserves local state, offers retry, and exposes an explicit warned “clear this device only” path.
- LOCAL_FILE completion now reconciles HTTP 409 through the upload-status endpoint. ACTIVE gets one policy retry, COMPLETING uses bounded polling, COMPLETED obtains the idempotent result, FAILED requires cancel/re-init, and cancelled/expired flows stop. AbortController cancels polling on modal close/unmount and a submission latch prevents double-complete.
- Replaced the placeholder test script with deterministic Node/TSX tests for the role matrix/default deny, guarded render, 403/401/logout failure policy, 409 reconciliation, bounded polling, FAILED handling and duplicate-submit prevention.

### Files Changed

- Auth/permissions: `src/features/auth/adminPermissions.ts`, `useAdminPermission.ts`, `logoutPolicy.ts`, `authApi.ts`, `authSlice.ts`, `src/lib/api/apiError.ts`, `src/layouts/MainLayout.tsx` and common permission/read-only components.
- Role-aware surfaces: dashboard, websites/domains and their cards/panels, video list/detail/info/empty states.
- Upload recovery: `src/features/videos/localUploadCompletion.ts`, `videoApi.ts`, `videoTypes.ts`, and `CreateVideoModal.tsx`.
- Tests/tooling: `test/*.test.ts(x)`, `package.json`, `yarn.lock`, and this log. No npm/pnpm lockfile was created.

### Commands And Verification

- Baseline: typecheck, lint, build, format and static build smoke passed; the old `yarn test` script was a placeholder and ran no assertions.
- `yarn install --frozen-lockfile`: passed after the intentional Yarn lock update.
- `yarn typecheck`, `yarn lint`, `yarn build`, `yarn format:check` and `git diff --check`: passed.
- `yarn test`: 12/12 tests passed in 3 suites, including polling cancellation on modal ownership loss.
- `yarn smoke:build`: 10/10 static artifact checks passed.
- The related public source uses backend-returned playback/thumbnail URLs, preserves query strings including `grant`, calls only the dedicated record-view endpoint, does not use `localStorage`, and does not log credentials. Its archived build copy matches the active `assets/app.js`; the deployed CDN artifact was not tested.

### Known Limitations And Manual Actions

- Browser/API integration and server-side stale-role changes require staging smoke with real STAFF, ADMIN and OWNER accounts. Production remains blocked on owner data decisions, Production read-only data audit, deployed public artifact verification and the separate Hostinger/Cloudflare/large-file/backup gates.
- No public-site or database data was changed in this task.

### Next Recommended Prompt

- “Run staging browser/API acceptance with STAFF, ADMIN and OWNER accounts, including forced server-side role change, upload completion conflict, logout revocation failure and deployed public media grant playback; record evidence without exposing credentials.”

## 2026-07-14 — Video list return state and automatic local-file analysis

### Fixed

- Root cause của việc quay lại `/videos` luôn về trang 1 là `page`,
  `statusFilter`, `appliedSearch` và `appliedFilterKey` chỉ nằm trong local state
  của `VideosPage`; route detail làm list unmount nên các giá trị này bị khởi tạo
  lại. Chuyển applied list state sang query `page`, `status`, `search`,
  `filterKey`, với parse/sanitize và canonicalization bằng React Router
  `replace` cho query lỗi và backend page clamp.
- Khi mở detail, list truyền duy nhất internal return path hiện tại trong
  navigation state. Video Detail chỉ chấp nhận pathname chính xác `/videos`
  (có thể kèm query, không hash/external origin/sub-route) và fallback xác định
  về `/videos`; cả header back và error-state back dùng cùng path. Purge success
  vẫn điều hướng `/videos` như contract cũ.
- LOCAL_FILE không còn phụ thuộc nút “Xác nhận file”. File vừa chọn được truyền
  trực tiếp vào pipeline phân tích để đọc duration và chụp thumbnail; source key
  được tạo từ chính file trong change event nên không phụ thuộc React Hook Form /
  React state của tick trước.

### Changed

- URL là source of truth cho applied video-list state; draft search/filter input
  đồng bộ lại khi route query đổi qua direct load hoặc browser Back/Forward.
  Status/search/filter actions reset page, pagination chỉ đổi page và mọi action
  giữ các query còn lại. Page size 20, `sortOrder: "desc"`, API params, silent
  refetch, AbortController, request-version/stale-response guards và error/loading
  behavior được giữ nguyên.
- Thêm source-analysis version + active source-key guard. File/mode/source thay
  đổi, modal close/reset và run mới đều invalidate run cũ; stale success/error
  không thay metadata/status/confirmed key và không phát toast.
- Object URL preview cũ được revoke khi source đổi; temporary video object URL
  luôn revoke trong `finally`; generated URL của stale run được revoke ngay;
  close/unmount cleanup toàn bộ URL. Thumbnail persist vẫn là `File`, không phải
  `blob:`/`data:` URL.
- Manual URL và Embed vẫn xác nhận thủ công qua cùng metadata-apply pipeline.
  LOCAL_FILE chỉ hiện retry khi analysis failed, cho phép submit ở confirmed hoặc
  partial với source key khớp, và chỉ gọi chunk upload tuần tự trong submit flow.
  Copy modal được cập nhật để nói rõ chọn file chỉ phân tích, chưa upload.

### Verified

- Baseline trước sửa: `yarn typecheck`, `yarn lint`, `yarn format:check`,
  `yarn build`, `yarn smoke:build` (10/10) pass; `git diff --check` sạch.
- Sau sửa: scoped Prettier, `yarn typecheck`, `yarn lint`,
  `yarn format:check`, `yarn build`, `yarn smoke:build` (10/10),
  `git diff --check` pass.
- `yarn test` chạy thành công ở baseline và sau sửa nhưng chỉ là placeholder
  `TODO_TEST`; repository chưa có automated test suite thật.
- Grep xác nhận không còn `Xác nhận file`, `getConfirmButtonLabel` hoặc
  `handleConfirmSource`; không thêm local/session storage hay console logging;
  create/upload API calls vẫn chỉ nằm trong submit flow.

### Pending

- Manual browser smoke checklist cho URL restore/Back/Forward/query lỗi và
  LOCAL_FILE auto-analysis/race A→B/retry/submit/upload **NOT_RUN**: repository
  không có browser automation, backend/test account và fixture video phù hợp
  không được cung cấp trong session này. Cần chạy các case 1–36 trong yêu cầu
  trước production; không coi static/build smoke là browser PASS.

## 2026-07-13 — UX-8 verification and smoke hardening

Final controlled phase: repository hardening, dependency cleanup, static build smoke
test, and manual browser smoke checklist. No business logic and no page/component UI
changed.

### Changed

- Added repo-local `.prettierignore` (node_modules, dist, coverage, .vite, minified
  files) and pointed the `format` / `format:check` scripts at `.prettierignore` instead
  of the missing external `../../.prettierignore`. Format globs are otherwise unchanged;
  no mass-format.
- Framer Motion audit: the only remaining consumer was `MotionConfig` in `src/main.tsx`
  (UX-6 had already removed every `motion.*` / `AnimatePresence`). With no motion
  components left, `MotionConfig` was inert (reduced motion for the app's CSS animations
  is handled by Tailwind `motion-reduce:` variants). Removed the `MotionConfig`
  import/wrapper from `main.tsx` (kept `StrictMode`, `AppProviders`, root render and
  bootstrap order) and ran `yarn remove framer-motion`. Only `src/main.tsx`,
  `package.json` and `yarn.lock` changed for this step; a repo grep confirms no
  `framer-motion` / `MotionConfig` / `motion.` references remain in `src`/`package.json`.
- Added `scripts/smoke/admin-web-build-smoke.mjs` (Node built-ins only) and the
  `smoke:build` script; extended `check` to run it. The smoke script verifies dist/
  shape (index.html, `.htaccess` at root and `assets/`, ≥1 JS asset, CSS asset,
  referenced `/assets/*` resolve, no `%VITE_*%` placeholders, no public source maps, no
  leaked sensitive files). It prints only names/counts — never file contents, tokens or
  secrets.
- Added `docs/14_ADMIN_WEB_UX_SMOKE_TEST.md` — a manual browser checklist with an
  environment table, sections A–K (app shell, login, dashboard, videos, video detail,
  websites/domains, settings, security, static cross-reference, failures) and a strict
  result vocabulary (`PASS`/`FAIL`/`BLOCKED`/`NOT_RUN`/`NOT_APPLICABLE`; no "assumed
  pass").
- Updated `docs/12` (added `yarn smoke:build`; clarified it is static-only and does not
  replace the browser checklist; linked `docs/14` as a release gate), `docs/07` (added
  `yarn smoke:build passed` and `UX browser smoke test recorded` gates plus the command),
  and `README.md` (listed doc 14, described it, documented `yarn smoke:build`).

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check` (now using local `.prettierignore`),
  `yarn build`, `yarn smoke:build` (10/10 checks), and `yarn check` all pass;
  `git diff --check` clean; scoped Prettier on all touched files passes; no lockfiles.
- Bundle after removing framer-motion: eager index chunk 397.50 → 396.28 kB raw (gzip
  126.80 → 126.19). The delta is small because a bare `MotionConfig` already tree-shook
  to almost nothing — the large win (LoginPage 131 → 5 kB) was realized in UX-6. This
  step is primarily dependency hygiene (an unused package removed from the tree).
- HTTP / deep-route smoke via `yarn preview:local` + `curl` (then the preview process was
  stopped): `/`, `/login`, `/videos`, `/websites`, `/domains`, `/settings`,
  `/videos/example-id`, and an unknown route all return `200 text/html` (Vite preview SPA
  fallback serving the app shell with `<div id="root">`); the referenced JS/CSS assets
  return correct content types (`text/javascript`, `text/css`). Note: Vite preview also
  returns `200` for a non-existent `/assets/*.js` (its SPA fallback), so preview cannot
  validate the asset-vs-route distinction — the production Hostinger `.htaccess` handles
  that via its extension rewrite condition. This is an HTTP smoke only; it does **not**
  prove the React auth-guard/404 UI rendered.
- Browser/test tooling audit: no Playwright/Cypress/Vitest/Jest config in-repo and no
  test runner installed. No test framework was added. Automated browser tests were not
  run and are not claimed to pass.

### Pending

- The manual browser checklist (`docs/14`) has **not** been run — no browser tooling; it
  is a handoff for a human tester against a deployed/local backend.
- Backend/API flows remain unverified here: logout revoke, password change, refresh
  rotation, LOCAL_FILE upload/preview/purge, share-link creation/revoke, rate limits.
- No real automated unit/integration/E2E test suite exists; `yarn test` is still a
  placeholder `echo` and must not be described as a test suite.
- External production operations remain outstanding: Cloudflare Access/WAF, Swagger
  protection, secret rotation, backup/restore drill, monitoring.
- Share-link history/revoke UI (API already exists) remains a separate frontend backlog
  item; not built in this phase.

## 2026-07-13 — UX-7 evidence readiness gap analysis

Documentation-only phase. No source code, routes, or UI changed.

### Changed

- Added `docs/13_ADMIN_EVIDENCE_READINESS_GAP_ANALYSIS.md`: a gap analysis of how far
  the Admin Web can support an evidence-readiness workflow. It inventories only the
  fields confirmed in the committed types/API (`videoTypes`, `websiteTypes`,
  `domainTypes`, `authTypes`, `dashboardTypes`, and the `*Api.ts` clients), classifies
  data by provenance, and separates displayed / available-not-displayed /
  documented-no-admin-API / backend-required / not-supported. It follows the required
  16-section structure, a readiness matrix (no scores), proposed future phases E0–E8,
  and explicit non-goals. Every proposed model/field/module is marked `PROPOSED`.
- Key confirmed findings recorded in the doc:
  - Share-link **list + revoke** already exist in the API (`getShareLinks`,
    `revokeShareLink`) and types (`ShareLink`, `ShareLinksListResponse`) but have no UI
    → `AVAILABLE_NOT_DISPLAYED` (frontend-only work possible later).
  - `SafeAdmin.createdAt` / `lastLoginAt` exist but are not shown in Settings.
  - `AdminAuditLog` / `AccessLog` are documented in `01_ARCHITECTURE` and `10_BACKLOG`
    but have **no admin API client** → `DOCUMENTED_NO_ADMIN_API`.
  - Rights holder, authority, canonical original URL, publication provenance, work
    registry, case workspace, evidence export → `BACKEND_REQUIRED` / `NOT_SUPPORTED`
    (must not be frontend-mocked).
  - Honesty rules captured: checksum = integrity only (not ownership); `createdAt` ≠
    work-creation/ownership date; `publishedAt` is admin-entered/unverified.
- Updated `README.md` to list doc 13 with a one-line description.

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass (unchanged
  from the UX-6 checkpoint); `git diff --check` clean; scoped Prettier on the three
  touched files (`docs/13...md`, `README.md`, `session-log.md`) passes.
- `git status --short src` is empty — no source file changed.
- The prohibited phrases ("verified owner", "proof of ownership", "legal confidence
  score", "guaranteed approval") appear in the doc only inside the non-goals /
  prohibition context.

### Pending

- This is a gap analysis only; no backend, API, or UI capability has been implemented.
- Browser/live-API verification of UX-0 → UX-6 is still pending (no browser tooling).
- No real automated test suite exists; `yarn test` is still a placeholder `echo`.
- `../../.prettierignore` (referenced by format scripts) is still missing/external;
  deferred to UX-8.
- UX-8 (tests, smoke checklist, documentation, and the framer-motion removal
  assessment) not started.

## 2026-07-13 — UX-6 login and settings

Controlled UI/UX upgrade, phase UX-6 (Login + Settings). Presentation, Vietnamese
copy, accessibility and a large login-chunk bundle reduction. No authentication
architecture, schema, form logic, API contract or session behaviour changed. No new
dependency.

Pre-checkpoint review of UX-5 `WebsiteQuickSelect`: the selectable item was a
`<div role="button">` with hand-rolled Space/Enter handling and a nested `<a>`. Per
review, converted the selection control to a native `<button>` (native keyboard
activation, single toggle) and moved the domain link out to a sibling `<p>` so there is
no nested interactive element. Committed as the UX-5 checkpoint.

### Changed

- Added `src/components/common/PasswordVisibilityButton.tsx`: shared, presentation-only
  show/hide toggle (accessible name, `type="button"`, focus ring, token colours). Used in
  Login (1 field) and Settings (4 fields) — 5 call sites. Holds no auth/form logic.
- `LoginPage.tsx`: rebuilt without framer-motion. All form logic is unchanged —
  `loginSchema` (trim/3-32/regex, 1-128), `loginResolver`, `useForm` mode/reValidateMode/
  defaults, `submitLockRef`, `status === "loading"` guard, `loginAdminThunk`, fulfilled
  match, root/server error, `location.state.from.pathname` redirect with `replace: true`,
  the authenticated-redirect effect, `themeMode`, `toggleTheme()`. Visual: calm single
  card on the shared body background (removed the multi-radial gradients, `backdrop-blur-xl`
  and oversized shadow), all `--admin-*` tokens instead of hardcoded slate/blue; one `<h1>`;
  real `<label htmlFor>`; error `<p>` with stable ids + `aria-describedby`; root error with
  `role="alert"` + `aria-live="assertive"`; submit with `aria-busy` and a spinner that
  respects `motion-reduce`. Kept the theme toggle (token-styled, accessible name). Enter
  submit and disabled-when-`!isValid` behaviour unchanged.
- `SettingsPage.tsx`: `changePasswordSchema`, `superRefine` (confirm match + new ≠ old),
  `mode: "onBlur"`, defaults, `changeAdminPassword({ oldPassword, newPassword, secretCode })`
  (still no `confirmNewPassword` sent), the 401-verification-failure branch,
  `normalizeApiError`, auth-error → `clearCredentials` + `persistor.flush()` + `/login`,
  success → toast + reset + `clearCredentials` + `persistor.flush()` + `/login` are all
  unchanged. Presentation: `<h1>` + description; each of the four password fields now uses
  an explicit `<label htmlFor>` + `id` + `aria-invalid` + `aria-describedby` and the shared
  `PasswordVisibilityButton`; `FieldError` gained a stable `id` and an `alert` variant, and
  the form-level (root) error now renders with `role="alert"`; added a min-8-characters hint
  under the new-password field (matches the existing schema; no fake strength meter, no
  extra character-class requirements). Autocomplete values unchanged
  (current-password / new-password / new-password / off).

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass;
  `git diff --check` clean; scoped Prettier on all UX-6 files passes.
- Security grep returns nothing for `console.log` / `console.debug` / `localStorage` /
  `sessionStorage` in LoginPage, SettingsPage and PasswordVisibilityButton — no logging or
  persistence of credentials; `confirmNewPassword` is not sent to the backend.
- Confirmed invariants by grep: `loginSchema`/`changePasswordSchema` unchanged,
  `submitLockRef` present, `loginAdminThunk` unchanged, `state.from` redirect unchanged,
  change-password payload has no `confirmNewPassword`, session clear
  (`clearCredentials`+`persistor.flush`+`/login`) intact.
- Bundle: LoginPage lazy chunk dropped from 131.10 → 5.42 kB raw (gzip 43.05 → 2.29 kB) by
  removing framer-motion from the login screen — a large win for the first page users load.
  SettingsPage flat (8.85 → 8.88 kB). Eager main chunk slightly smaller (398.09 → 397.50 kB).
  `main.tsx` still wraps the app in framer-motion's lightweight `MotionConfig` (out of UX-6
  scope); it is now inert for Login (no motion components consume it) but harmless.
- NOT browser-verified: no browser tooling is configured. The Login checks (validation,
  submit/double-submit/Enter, error, redirect-to-origin, theme toggle, show/hide, mobile/
  dark, reduced motion) and Settings checks (validation, mismatch, new=old, wrong current/
  secret, generic error, auth-expired, success-clears-session, four show/hide toggles,
  mobile/dark) were reasoned about statically but not exercised.

### Pending

- Browser + live-API verification of Login and the Settings password-change flow (including
  the success path that clears the session and returns to `/login`, and that the old session
  cannot be reused) is still pending — no browser tooling and no test account exercised here.
- No real automated test suite exists; `yarn test` is still a placeholder `echo`.
- `../../.prettierignore` (referenced by format scripts) is still missing/external; deferred
  to UX-8.
- UX-7 (Evidence-readiness gap analysis document) not started.

## 2026-07-13 — UX-5 dashboard share workflow

Controlled UI/UX upgrade, phase UX-5 (Dashboard + Share Link Composer). Presentation,
Vietnamese copy, accessibility, two genuine bug fixes. No cache/data-fetching
architecture, API params, share-link payload, clipboard behaviour or token handling
changed. No new dependency; no new component file.

### Fixed (real bugs)

- `DashboardPage.tsx` `loadWebsites()`: the success branch returned `false`, so
  `handleRefresh()` always showed "Không thể tải lại đầy đủ dữ liệu Dashboard." even when
  the websites load succeeded. Changed the success branch to `return true` (one line;
  cache/fetcher/API params/selected-website reconciliation/error handling/`finally`
  untouched).
- `ReadyVideoPicker.tsx` `getEmptyStateText()`: the filter-key empty message was stored as
  double-encoded UTF-8 mojibake (`KhÃ´ng cÃ³ video...`), rendering garbled text. Replaced
  with the correct Vietnamese `Không có video nào khớp với key "…"` (targeted single-string
  replacement; no other bytes touched).

### Changed

- `DashboardPage.tsx`: header `<h1>` "Tổng quan" + description; refresh button unchanged
  (still `handleRefresh`, disabled while refreshing, keeps content on screen).
- `ShareLinkComposer.tsx`: added "Bước 1/2/3" eyebrows above the website/video/settings
  sections; Vietnamese form labels (Nhãn / Giới hạn lượt xem / Thời hạn) and placeholder;
  section title "Thiết lập share link"; added a neutral note ("Thời hạn và giới hạn lượt
  xem giúp kiểm soát quyền truy cập. Đây không phải cơ chế DRM và không đảm bảo link không
  thể bị sao chép."); combined submit-disabled hint for missing website/video; made the
  settings+result row stack on mobile (`flex-col lg:flex-row`, removed `min-w-[50%]`).
  Field names, validation, payload builders (`parsePositiveInteger`/`dateTimeLocalToIso`),
  default values and `onSubmit` shape are unchanged.
- `WebsiteQuickSelect.tsx`: selection is no longer colour-only — added a filled/empty check
  marker and `aria-pressed`; added a focus ring and `preventDefault` on Space/Enter; the
  no-active-domain state now clearly says "Chưa có domain active — chưa thể tạo URL public".
- `ReadyVideoPicker.tsx`: source-filter labels Vietnamized (Tất cả / Video link / Video
  server / Video nhúng / Video DB); the invalid `role="tablist"`-with-`aria-pressed`-buttons
  container changed to a valid `role="group"` toggle group; search-error box got
  `role="alert"` and higher-contrast text (`--admin-text-strong` on `--admin-danger-soft`).
  Thumbnail lifecycle / IntersectionObserver / concurrency / object-URL lease untouched.
- `CreatedShareLinkCard.tsx`: copy button "Sao chép URL" + disabled when no public URL;
  readonly URL input got an `aria-label`; card stacks full-width on mobile. The
  raw-token-only-shown-once note and the "not persisted in Admin Web" note are kept; nothing
  is persisted or logged.

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass;
  `git diff --check` clean; scoped Prettier on all UX-5 files passes.
- Security grep returns nothing for `localStorage` / `sessionStorage` / `console.log` /
  `console.debug` across the five dashboard files — no new persistence or logging of the
  share URL/token. `createdShareLink` still lives only in component state.
- Confirmed `loadWebsites()` success branch now returns `true`, and dashboard invariants are
  present/unchanged (PAGE_SIZE 24, debounce 400, min 2, max 80, `dedupeRequests: false`,
  `videoDatasetVersionRef`, `isShareableVideo`).
- Bundle: DashboardPage lazy chunk 26.36 → 28.12 kB raw (gzip 7.89 → 8.31); eager main chunk
  flat (398.09 kB).
- NOT browser-verified: no browser tooling is configured. The 20 dashboard checks (initial
  load, refresh success toast now correct, load failures, search/filter/load-more, selected
  IDs preserved across filter changes, hidden-selected counted, submit gating, create +
  clipboard, no-active-domain, mobile/dark, LOCAL_FILE thumbnails, no token in console) were
  reasoned about statically but not exercised.

### Pending

- Browser verification of the full dashboard workflow (20 checks above), especially the
  corrected refresh success toast, selected-IDs-preserved-across-filter, and clipboard, is
  still pending (no browser tooling installed).
- No real automated test suite exists; `yarn test` is still a placeholder `echo`.
- `../../.prettierignore` (referenced by format scripts) is still missing/external; deferred
  to UX-8.
- Share-link history / revoke UI remains a separate backend + UI backlog item (not in UX-5).
- UX-6 (Login + Settings) not started.

## 2026-07-13 — UX-4 video detail

Controlled UI/UX upgrade, phase UX-4 (`/videos/:videoId`). Presentation, Vietnamese
copy, metadata grouping and accessibility only. No backend contract, data-fetching,
purge payload, player/object-URL logic, or edit flow changed. No new dependency; no
new component file (VideoInfoPanel reorganized inline). Only existing `VideoAsset`
fields are shown — no invented/evidence fields.

### Changed

- `src/pages/VideoDetailPage.tsx`:
  - Header: back button → "Danh sách video"; single `<h1>` "Chi tiết video" with the
    video ID as muted sub-text; the video title stays `<h2>` in the main column.
  - Status badge now always shown (including READY) so status is explicit, not just a
    text mention; PROCESSING colour moved from hardcoded amber to `--admin-warning`.
  - DISABLED label aligned to "Đã vô hiệu hóa" (was "Đã tắt").
  - Danger Zone: Vietnamese copy ("Khu vực nguy hiểm", "Xóa vĩnh viễn", "Purge vĩnh
    viễn"), explains disable ≠ purge, not-undoable-without-backup, and backend may
    reject if assigned/shared. Added `id`/`aria-describedby` linking the exact-ID input
    to its "Phải khớp" hint. All purge logic is byte-identical: exact
    `purgeConfirmation.trim() === video.id`, `purgeUnderstood` checkbox, `confirmVideoId`
    payload, `deleteRemoteAsset` only when `provider === "CLOUDINARY" && providerAssetId`,
    `canPurge` gate, reset-on-close, success → `/videos`, `formatPurgeSuccessMessage`,
    no storage path shown.
- `src/features/videos/components/VideoInfoPanel.tsx`: reorganized the flat metadata
  list into semantic `<dl>` groups — **Tổng quan** (ID + copy, status, filter key,
  provider, source type, MIME, size, duration, views), **Thời gian** (published/created/
  updated, absolute `vi-VN` datetime), **Nguồn phát** (playback/embed/DB/local display +
  copy, original filename, provider asset ID + copy, thumbnail URL, LOCAL_FILE
  storage-hidden note), **Tính toàn vẹn (SHA-256)** and **Ghi chú**. Added a reusable
  in-file `CopyButton`/`MetaRow`/`ChecksumRow`/`Section`. Vietnamized the previously
  English source/preview strings.
- SHA-256 integrity: shows `localFileAsset.checksumSha256` / `localThumbnailAsset.
checksumSha256` only when present (guarded by `hasIntegrity`; no fake placeholder),
  in monospace, break-all, with copy buttons and the neutral disclaimer "Mã này hỗ trợ
  kiểm tra file có thay đổi hay không. Nó không tự chứng minh quyền sở hữu bản quyền."
  No ownership/legal labels; checksum is never computed client-side or sent anywhere;
  backend value only trimmed for display.
- `src/features/videos/components/VideoPlayerPanel.tsx`: only three user-visible English
  strings Vietnamized (embed-controls note + the two "stored but preview unavailable"
  messages). Playback/source/object-URL/keyboard logic untouched.
- `src/features/videos/components/VideoDetailErrorState.tsx`: added `role="alert"`.
- `VideoDetailSkeleton.tsx` was already token-based with no fake data, so left unchanged.

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass;
  `git diff --check` clean; scoped Prettier on all UX-4 files passes.
- Security greps return nothing for "Verified Owner / Legal proof / Bằng chứng sở hữu /
  Copyright verified / evidence score / legal confidence" and for storage-path leakage
  (storageKey / absolute paths) in the detail page and panels.
- Purge invariants confirmed present/unchanged via grep (exact-ID guard, `confirmVideoId`,
  `deleteRemoteAsset` conditional, CLOUDINARY + providerAssetId condition, `canPurge`).
- Bundle: VideoDetailPage lazy chunk 31.16 → 34.09 kB raw (gzip 8.84 → 9.56); eager main
  chunk flat (398.09 kB).
- NOT browser-verified: no browser tooling is configured. The 18 detail-page checks
  (READY/DISABLED/LOCAL_FILE/manual/embed/no-thumbnail, long metadata, checksum copy,
  edit modal, purge wrong-ID / no-checkbox / cancel-reset / backend-reject, Cloudinary
  checkbox condition, mobile/dark, error/retry, back) were reasoned about statically but
  not exercised.

### Pending

- Browser verification of the full detail-page set (18 checks above), including purge
  gating, checksum copy and the Cloudinary-only remote-delete checkbox, is still pending
  (no browser tooling installed).
- No real automated test suite exists; `yarn test` is still a placeholder `echo`.
- `../../.prettierignore` (referenced by format scripts) is still missing/external;
  deferred to UX-8.
- Evidence-readiness: fields the backend does not yet expose (rights holder, rights
  scope, canonical original URL, actor/audit, owner verification, legal status) were NOT
  mocked; they are deferred to the UX-7 gap analysis.
- UX-5 (Dashboard composer) not started.

## 2026-07-13 — UX-3 videos list

Controlled UI/UX upgrade, phase UX-3 (`/videos` list). Presentation, Vietnamese
copy and accessibility only. No backend contract, data-fetching architecture,
request/search/filter/pagination logic, or thumbnail loading changed. No new
dependency; no `useVideosList` extraction; no new file created (inline was clearer
than a heavily-coupled extraction).

### Changed

- `src/pages/VideosPage.tsx`:
  - Migrated the hand-rolled status modal (custom overlay + `statusModalRef` +
    `statusCancelButtonRef` + `handleStatusModalKeyDown` Tab-loop + focus timeout)
    to the shared `ConfirmActionDialog`. Removed all that focus-trap code and the
    now-unused `Ban`/`AlertTriangle`/`Loader2` icons and `KeyboardEvent` type. The
    business state (`statusActionVideo`, `statusActionTarget`, `statusUpdatingVideoId`)
    and handlers (`handleRequestStatusToggle`, `handleConfirmStatusChange`) are
    unchanged; disable uses `updateVideoStatus(id,"DISABLED")`, restore uses
    `"READY"`, and the single silent refetch after success is preserved.
  - Header: `<h1>` "Quản lý video" + description; "Thêm video" / "Tải lại".
  - Status tabs kept `role="tablist"`/`role="tab"`/`aria-selected`; active state no
    longer color-only (adds `font-semibold` + visible ring on focus).
  - Wrapped tabs + search + filter-key + active-filter chips into one bordered filter
    surface. Added a clear-search button and removable filter chips ("Tìm kiếm: …",
    "Key: …") wired to the existing `handleClearSearch`/`handleClearFilterKey` (no new
    logic). Search still manual-submit, min 2, max 80, normalized; filter key still
    manual-apply, datalist suggestions, reserved `all` blocked.
  - Search/filter error moved to a `role="alert"` panel using `--admin-warning` /
    `--admin-warning-soft` + `--admin-text-strong` (replaced hardcoded amber classes);
    filter-key validation error uses `--admin-danger` (canonical token syntax).
  - Empty states now differentiate: (a) no match for search, (b) no match for key,
    (c) no match for search+key, (d) no video in a non-READY status (neutral, no
    "add video" CTA), (e) truly empty READY list → `VideosEmptyState`. None claim data
    was deleted.
  - Pagination wrapped in `<nav aria-label>`; hidden when `totalPages === 0` to avoid a
    misleading "Trang 1/1"; page clamp, prev/next conditions and disabled-on-load
    behavior unchanged.
- `src/features/videos/components/VideoCard.tsx`: styled the previously-unstyled status
  toggle as a clear bordered icon button (accessible name kept, hover intent colour
  differs for disable vs restore, focus ring). PROCESSING badge moved from hardcoded
  amber to `--admin-warning`/`--admin-warning-soft`. DISABLED label aligned to "Đã vô
  hiệu hóa". Thumbnail IntersectionObserver / object-URL lease / lazy loading / open +
  status callbacks are untouched.
- `src/features/videos/components/VideosEmptyState.tsx`: CTA "Thêm Video" → "Thêm video".
- `VideosErrorState.tsx` and `VideoCardSkeleton.tsx` were already token-based and in
  Vietnamese, so they were left unchanged.

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass;
  `git diff --check` clean; scoped Prettier check on all UX-3 files passes.
- Invariant constants confirmed present and unchanged: `DEFAULT_VIDEO_STATUS_FILTER =
READY`, min 2, max 80, `useState(20)`, `sortOrder: "desc"`; `fetchVideos` (abort +
  request-version + silent refetch + page clamp) is byte-identical.
- `grep` confirms no `statusModalRef`/`statusCancelButtonRef`/`handleStatusModalKeyDown`
  and no custom status-modal overlay remain.
- Bundle: VideosPage lazy chunk 21.06 → 21.87 kB raw (gzip 6.86 → 6.69); eager main
  chunk flat (398.07 → 398.09 kB) — ConfirmActionDialog/Radix Dialog already bundled.
- NOT browser-verified: no browser tooling is configured. The 20 interaction checks
  (tabs, search/filter, pagination, silent refresh, open detail, disable/restore
  confirm + error-keeps-dialog + double-click, lazy create modal, LOCAL_FILE thumbnail,
  mobile/dark) were reasoned about statically but not exercised.

### Pending

- Browser verification of the full videos-list interaction set (20 checks above),
  including disable/restore dialog, focus restore, double-click safety and LOCAL_FILE
  thumbnail loading, is still pending (no browser tooling installed).
- No real automated test suite exists; `yarn test` is still a placeholder `echo`.
- `../../.prettierignore` (referenced by format scripts) is still missing/external;
  deferred to UX-8.
- DISABLED label is now "Đã vô hiệu hóa" on the videos list/card, but VideoDetailPage /
  VideoInfoPanel still say "Đã tắt" (out of UX-3 scope) — align in UX-4.
- UX-4 (Video Detail) not started.

## 2026-07-13 — UX-2 website and domain confirmations

Controlled UI/UX upgrade, phase UX-2 (Websites/Domains destructive confirmations,
Vietnamese copy, token cleanup). All API endpoints, payloads, data loading and
refetch behavior are unchanged; no pagination added; no data-fetching refactor.

### Changed

- Added `src/components/common/ConfirmActionDialog.tsx`: one shared, accessible
  confirmation dialog on the existing `radix-ui` Dialog (focus trap, Escape, focus
  restore, scroll lock). Presentation only — no website/domain logic. Features:
  linked title/description, `default|warning|destructive` variants (icon is not the
  only signal — title + confirm-button colour + copy also convey it), submitting
  disabled state + spinner, a `confirmLockRef` so `onConfirm` cannot fire twice, and
  it refuses to close on Escape/backdrop/Close while `isSubmitting`. Uses
  `--admin-overlay` for the backdrop and `--admin-motion-fast`; respects reduced motion.
  Responsive (`w-[calc(100vw-2rem)] max-w-md`, `max-h`+scroll, actions stack on mobile).
- `WebsitesPage.tsx`: replaced both `window.confirm()` calls (disable website,
  unassign domain) with `ConfirmActionDialog` driven by a `PendingWebsiteAction`
  discriminated union. `disableWebsite(id)` and `unassignDomain(domainId)` calls,
  their toasts, `fetchWebsites()`/`fetchAvailableDomains()` refetches and the selected
  website reconciliation are preserved. Vietnamese copy for all user-visible strings
  (toasts, toolbar, filters, list header). Dialog copy states disable ≠ permanent
  delete and that disabled = not public-resolvable; unassign copy says the domain
  record is not deleted and the backend decides.
- `DomainsPage.tsx`: replaced all three `window.confirm()` calls (disable domain,
  unassign domain, disable group) with `ConfirmActionDialog` driven by a
  `PendingDomainAction` union. `disableDomain`, `unassignDomain`, `disableDomainGroup`
  calls, toasts and `fetchDomainData()` refetch preserved. Removed page-level hardcoded
  hex classes (`#EFF4FB`, `#15253e`, `#18191A`, `#f1f1f1`, `#3A3B3C`, `#5A5B5C`) from
  the input/select helpers, replaced with `--admin-*` tokens (native `<select>` stays
  readable in light/dark; option colours already used tokens). The Domains/Groups
  toggle changed from an invalid `role="tablist"`-with-buttons to a valid
  `role="group"` + `aria-pressed` toggle-button group (behaviour unchanged). Vietnamese
  copy throughout; the disable-group copy uses the required non-inferring wording.

### Verified

- `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build` all pass;
  `git diff --check` clean; scoped Prettier check on the edited files passes.
- `grep window.confirm` returns nothing in either page; no 6-digit hex remains in
  either page.
- API/payload/refetch preserved: confirmed by diff that the only behavioural change is
  the confirm gate moving from `window.confirm` into a controlled dialog; the API call
  arguments, toasts and refetch calls per action are identical to before.
- Bundle: the eager main chunk is essentially flat (index 397.98 → 398.07 kB raw,
  126.95 → 127.03 kB gzip) because ConfirmActionDialog reuses the already-bundled Radix
  Dialog. The lazy Websites/Domains chunks grew modestly (~+1.3–1.8 kB raw each).
- NOT browser-verified: no browser tooling is configured. The 10 interaction checks
  (disable/cancel/error-keeps-dialog/unassign/disable-group/Escape+focus-restore/
  double-click/mobile dialog) were reasoned about statically but not exercised.

### Pending

- Browser verification of all five confirmation flows, Escape + focus restore,
  double-click safety, API-error-keeps-dialog, and the mobile dialog is still pending
  (no browser tooling installed; not installing without approval).
- Pagination NOT implemented: Websites/Domains/Groups still fetch `page: 1, limit: 100`;
  this is not production-ready pagination and API params are unchanged.
- `../../.prettierignore` (referenced by format scripts) is still missing/external;
  deferred to UX-8.
- UX-3 (Videos list) not started.

## 2026-07-13 — UX-1 app shell and route states

Controlled UI/UX upgrade, phase UX-1 (app shell, route/auth states, 404). Presentation,
copy (Vietnamese with diacritics) and accessibility only. No auth/redirect/routing/API/
Redux/cache/upload logic changed. Route URLs unchanged. No dependency added — the mobile
drawer reuses the existing `radix-ui` `Dialog` primitive (already a dependency).

### Changed

- Added `src/components/common/AppStatePanel.tsx`: presentation-only status/error panel
  (role=status/alert, aria-live, spinner with `motion-reduce`, semantic h1, admin tokens).
  Reused by route-checking (Protected/PublicOnly), session bootstrap checking, bootstrap
  recovery error, and route lazy-loading — i.e. 5 call sites, so it is a real shared
  primitive, not a speculative one.
- `MainLayout.tsx`: rebuilt shell.
  - Vietnamese nav labels (Tổng quan / Video / Website / Tên miền / Cài đặt); same routes.
  - Desktop sidebar active state no longer color-only: it adds a left marker bar, bold
    text and the section icon; NavLink still supplies `aria-current="page"`.
  - Real mobile navigation drawer via `radix-ui` Dialog: accessible trigger name, backdrop,
    Close button, Escape-to-close, close-on-select, body scroll lock, focus trap + focus
    restore (all provided by Radix), width `min(18rem,85vw)` so it never overflows 320px.
  - Brand demoted from `<h1>` to non-heading text so page `<h1>`s remain the primary heading.
  - Header shows a contextual section label derived from the route (non-heading) + admin pill.
  - `handleLogout` thunk/flow kept byte-for-byte identical; the same handler is shared by the
    desktop and drawer logout buttons, guarded by the existing `isLoggingOut` state (no double
    submit, no second logout implementation).
- `ProtectedRoute.tsx` / `PublicOnlyRoute.tsx`: replaced the non-diacritic checking text with
  `AppStatePanel`. Login condition, `Navigate` redirect, `replace`, and `state={{ from }}` are
  unchanged.
- `AuthSessionBootstrap.tsx`: replaced the recovery-error and restoring-session UI with
  `AppStatePanel`; error panel now shows fixed safe copy ("Không thể kết nối tới máy chủ." /
  "Kiểm tra kết nối mạng và thử lại.") instead of the raw normalized backend message. All
  logic (`startedRef`, dispatch order, retry, auth-error/network-error handling, API calls,
  children conditions) unchanged; the two action handlers are identical, only relocated.
- `RouteLoadingFallback.tsx`: replaced the fake-data skeleton with a neutral, accessible
  `AppStatePanel` loader (no simulated data).
- `NotFoundPage.tsx`: rewritten with `--admin-*` tokens + dark mode, Vietnamese copy, semantic
  h1, and two actions — "Quay lại" (`navigate(-1)`) and "Về Dashboard" (`/`). No auto-redirect;
  wildcard routing untouched. Does not claim an access-permission reason.
- `src/styles/globals.css`: added theme-independent motion-duration tokens
  `--admin-motion-fast|normal|slow` (120/180/220ms), consumed by the drawer transition (JIT).

### Verified

- Static checks (before and after): `yarn typecheck`, `yarn lint`, `yarn format:check`,
  `yarn build` all pass; `git diff --check` clean; scoped Prettier check on changed files passes.
- Confirmed via diff that guard login conditions, `state.from`, redirects, the logout thunk,
  and the bootstrap flow are unchanged.
- Bundle note: the eager main chunk grew ~+12 kB gzip (115→127) because Radix Dialog now ships
  in the shell for the accessible drawer. Flagged for review; no code-splitting added yet.
- NOT browser-verified: no Playwright/browser automation is configured in this repo, so
  responsive breakpoints (320–1440px), drawer open/close/Escape/focus behavior, and light/dark
  rendering were reasoned about but not exercised in a real browser.

### Pending

- Browser verification of the drawer, route/auth states and 404 across 320/375/768/1024/1280/
  1440px is still pending (no browser tooling installed; not installing without approval).
- `../../.prettierignore` (referenced by format scripts) is still missing/external; deferred to
  UX-8 per instructions (not created in UX-1).
- Bundle: decide whether the shell drawer should be code-split to recover the ~12 kB gzip.
- Theme toggle is still only on the login screen; the shell has no in-app theme control (out of
  UX-1's listed scope — flagged for a later decision).
- UX-2 (Websites/Domains destructive dialogs) not started; no `window.confirm()` replaced yet.

## 2026-07-13 — UX-0 semantic token baseline

Controlled UI/UX upgrade, phase UX-0 (baseline + semantic tokens only). No page,
auth, API, cache, upload, routing, or deployment code was touched. All existing
`--admin-*` and `--admin-dashboard-*` tokens were preserved (no rename/removal).

### Changed

- `src/styles/globals.css`: fixed a real CSS typo in the dark theme —
  `--admin-dashboard-modal-surface` used the invalid function `lrgba(...)`; changed
  to `rgba(...)` to match the valid light-mode counterpart. (Token currently has no
  component consumer, but the value was invalid.)
- `src/styles/globals.css`: added missing semantic color tokens (light + dark),
  since no equivalent existed and pages currently hardcode `amber-*` / `bg-black/…`:
  - `--admin-warning` / `--admin-warning-soft`
  - `--admin-info` / `--admin-info-soft`
  - `--admin-overlay` (dialog/backdrop scrim, replaces future hardcoded `bg-black/55`)
- These additions are additive only; nothing consumes them yet, so there is no
  visual change in this phase.

### Verified

- Baseline (before edits): `yarn typecheck`, `yarn lint`, `yarn format:check`,
  `yarn build` all passed; working tree clean; no `package-lock.json`/`pnpm-lock.yaml`.
- Note: `../../.prettierignore` (referenced by the `format`/`format:check` scripts)
  is missing, but Prettier tolerates the missing ignore-path and the check still passes.
- Note: `yarn test` is a placeholder `echo` (no real automated test suite exists);
  running it only confirms the script exits, not that behavior is tested.
- After edits: `yarn typecheck`, `yarn lint`, `yarn format:check`, `yarn build`,
  `git diff --check` all passed; only `src/styles/globals.css` and `session-log.md`
  changed; no new dependency or lockfile.

### Pending

- Motion-duration tokens intentionally deferred to UX-1 (just-in-time, when a
  component first consumes them) rather than defined speculatively.
- Reusable primitives (dialog, page header, status badge, pagination, etc.) are NOT
  created yet; they will be added just-in-time in the phase that first uses them.
- Controlled reduction of `--admin-dashboard-*` gradient/glassmorphism deferred to
  later UX phases as pages are migrated.
- No page components migrated; no `window.confirm()` replaced; no Vietnamese-copy
  fixes applied yet — those belong to UX-1+.
  > > > > > > > d9521a9 (feat(admin): establish UX shell and route states)

## 2026-07-04 — Admin Web video filterKey UI

### Changed

- Added optional `filterKey` to video types, admin video list params, create payloads, LOCAL_FILE upload init payloads, and update payloads.
- Added frontend `filterKey` normalization/validation matching the backend contract: lowercase letters, numbers, underscores, max 64 chars, and reserved `all` rejected.
- Added `filterKey` fields to Create/Edit Video modals with blur normalization and Vietnamese validation copy.
- Added `/videos` filter-by-key UI while preserving manual search, status tabs, pagination, abort/request-version guards, and inline search errors.
- Added Dashboard share-link picker filter-by-key support while preserving selected video IDs, search debounce/min-length, load more, cache keys, manual refresh, and lazy thumbnails.
- Added key badges/metadata display on video cards, Dashboard ready-video cards, and video detail info panel.
- Updated Admin Web docs/checklists with `filterKey` behavior and deploy ordering.

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` initially flagged three touched TSX files; focused Prettier was run on those files and `yarn format:check` then passed.
- `yarn build` passed.
- `yarn test` ran the current placeholder script (`TODO_TEST: Admin web tests will be added later`) successfully.
- `git diff --check` passed.
- `git ls-files --others --exclude-standard | findstr /i "package-lock pnpm-lock"` found no npm/pnpm lockfiles.

### Pending

- Deploy backend API with the `VideoAsset.filterKey` migration before deploying this Admin Web build.
- Manual browser smoke tests against the updated backend: create/edit key, `/videos` key filter, Dashboard key filter, share-link creation with selected videos preserved across filters.

## 2026-07-03 — Dashboard initial video load after refresh

### Root cause

- `src/main.tsx` uses `React.StrictMode`, so local dev can mount, unmount, and remount Dashboard.
- The first Dashboard video request could be aborted during StrictMode cleanup.
- `dashboardCache.ts` deduped in-flight video page requests through a module-level `videoPageRequests` map, so the second mount could receive the aborted promise instead of starting a fresh request.
- `DashboardPage.tsx` marked `hasLoadedVideos=true` in `finally` even for canceled initial requests, causing the video picker to leave skeleton state with an empty video list until manual refresh bypassed cache.

### Changed

- Added `dedupeRequests?: boolean` to `loadDashboardVideoPage()` while preserving successful in-memory page caching and stale-time behavior.
- Made Dashboard first-page video requests opt out of in-flight request dedupe because they are tied to an AbortController lifecycle.
- Updated Dashboard canceled-request handling so a canceled first video load does not mark videos as successfully loaded.
- Incremented the video request version on Dashboard unmount before aborting, preventing stale StrictMode cleanup work from updating obsolete state.
- Kept manual `Tải lại`, website loading, search, load more, lazy thumbnails, and share-link creation behavior unchanged.

Files changed in this pass:

```txt
src/features/dashboard/dashboardCache.ts
src/pages/DashboardPage.tsx
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.

### Pending

- Browser Network verification on `http://localhost:5173/`: refresh Dashboard repeatedly and confirm the first READY video page loads automatically without clicking `Tải lại`.
- Verify quick Dashboard → `/videos` → Dashboard navigation uses fresh cache or loads automatically.
- Verify Dashboard search, clear search, Load more, and manual refresh still work.

## 2026-06-29 — Cross-project admin video search pipeline audit

### Changed

- Audited the Admin Web Dashboard search path against the backend search-hardening work in `bom-media-api`.
- Preserved the existing Dashboard implementation:
  - 24-item READY video pages
  - 400 ms debounce
  - normalized search text
  - two-character minimum before calling `/admin/videos`
  - abortable first-page video requests
  - inline picker hint/error UI
  - successful-response dashboard cache
  - lazy, cached, concurrency-limited LOCAL_FILE thumbnails
- No additional Admin Web code changes were needed in this pass beyond the existing uncommitted Dashboard search-safety files.

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- No `package-lock.json` or `pnpm-lock.yaml` was found in the Admin Web or API repo roots.

### Pending

- Deploy the API search fix first, running `yarn prisma migrate deploy` on production only if the backend migration has not been applied.
- Deploy the rebuilt Admin Web after the API deploy.
- Manually verify Dashboard search:
  - one-character input such as `i` sends no API request
  - valid input such as `i fell` sends one debounced request
  - special characters do not crash the page
  - clearing search reloads READY videos
  - Load more works for normal and searched lists
  - selected videos persist and share-link creation still succeeds

## 2026-06-29 — Dashboard video search safety hardening

### Root cause

- Dashboard video pagination, load more, cache, and thumbnail request throttling were already in place.
- The remaining frontend risk was the search-as-you-type path: one-character searches such as `search=i` could still be sent to `/admin/videos`, and stale first-page search requests were only ignored by version guards instead of being actively canceled.
- Backend search failures are being fixed separately, but the Admin Web should avoid expensive low-signal search requests and keep search failures local to the video picker.

### Changed

- Added Dashboard video search constants:
  - debounce: 400 ms
  - minimum search length: 2 characters
  - maximum normalized search length: 80 characters
- Added Dashboard search normalization: trim, collapse repeated whitespace, and cap to 80 characters before using the value for debounced search, API params, and cache keys.
- Short non-empty searches now skip `/admin/videos` entirely and show the inline hint: `Nhập ít nhất 2 ký tự để tìm video.`
- Added optional `AbortSignal` support to `getVideos()` and pass it to Axios.
- Dashboard now aborts stale first-page video requests, keeps the request-version guard, and suppresses errors for canceled requests.
- Search failures after initial load now show as an inline picker error with a `Thử lại` action instead of replacing the Dashboard with a global red error or toast-spamming during typing.
- Load more now refuses to run while search debounce is pending, the first page is refreshing, the query is below minimum length, or the current picker search is in an error state.
- Existing selected video IDs remain untouched when search changes, including when selected videos are hidden by the current search.
- Dashboard video cache keys now normalize search whitespace; successful responses remain cached, while canceled/failed/short-search states are not cached.

Files changed:

```txt
src/pages/DashboardPage.tsx
src/features/dashboard/dashboardCache.ts
src/features/dashboard/dashboardTypes.ts
src/features/dashboard/components/ShareLinkComposer.tsx
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/videos/videoApi.ts
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed.
- `git diff --check` passed with Windows LF-to-CRLF working-copy notices only.
- No `package-lock.json` or `pnpm-lock.yaml` was created.

### Manual test notes

- Browser/API-panel manual verification was not run in this session.
- Recommended manual checks:
  - Open Dashboard and confirm the initial `/admin/videos` request uses `limit=24`.
  - Type `i` and confirm no `/admin/videos?...search=i` request is sent.
  - Confirm the picker shows `Nhập ít nhất 2 ký tự để tìm video.` without a global Dashboard error.
  - Type `i fell` and confirm only one debounced request is sent after typing pauses.
  - Type quickly through `i`, `i `, `i f`, `i fe`, `i fel`, `i fell` and confirm stale requests are canceled or ignored.
  - Clear search and confirm normal READY videos reload.
  - Confirm Load more works for normal and valid search results.
  - Confirm selected videos remain selected across search changes and share-link creation still uses the selected IDs.
  - Confirm no secrets, tokens, or Authorization headers appear in console logs.

### Pending

- Run the manual browser checks above against a local or production-like backend after the backend search fix is deployed.

## 2026-06-29 — Hostinger SPA fallback for Admin Web deep routes

### Root cause

- Admin Web uses React Router history routing through `createBrowserRouter`.
- Local Vite dev/preview servers fall back to `index.html`, but Hostinger Apache/LiteSpeed was only serving real files/folders.
- Direct opens or browser refreshes on extensionless client routes such as `/videos`, `/websites`, and `/videos/:videoId` therefore returned Hostinger's document-level 404 before React loaded.
- This was a static hosting rewrite issue, not a React route, API, or auth bug.

### Changed

- Updated `public/.htaccess` with `Options -MultiViews` and an Apache rewrite fallback to serve `index.html` for extensionless Admin Web routes.
- Kept existing file/directory handling before the fallback so real assets continue to be served normally.
- Excluded `/api` from the fallback in case the admin domain ever proxies API requests.
- Preserved no-cache headers for `index.html`; immutable `/assets/*` caching remains in `public/assets/.htaccess`.
- Updated Hostinger/Cloudflare deployment notes and production smoke-test docs to require uploading hidden `.htaccess` files and verifying deep-route refresh behavior.

Files changed:

```txt
public/.htaccess
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- `yarn.cmd format:check` passed.
- Focused Markdown Prettier check passed for the deployment/checklist/smoke-test docs and this log entry.
- `git diff --check` passed with Windows LF-to-CRLF working-copy notices only.
- `dist/.htaccess` and `dist/assets/.htaccess` were copied into the production artifact.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Manual production test notes

- Live pre-deploy curl checks on `bom-media-admin.site` confirmed the current production state still needs the rebuilt artifact uploaded:
  - `/` returns `200 OK` and serves Admin Web `index.html`.
  - `/videos`, `/websites`, and `/videos/fdd79f89-e372-456d-a30e-c907b0d0d75e` return Hostinger `404 Not Found`.
  - A real current hashed JS asset returns `200 OK` with `Cache-Control: public, max-age=31536000, immutable`.
  - A missing `.js` asset returns `404 Not Found`.
- After deployment, verify Hostinger uploads hidden files and that `.htaccess` exists at the active document root, usually `public_html/.htaccess` for `bom-media-admin.site`.
- Run again after deployment:

  ```bash
  curl -I https://bom-media-admin.site/
  curl -I https://bom-media-admin.site/videos
  curl -I https://bom-media-admin.site/websites
  curl -I https://bom-media-admin.site/videos/fdd79f89-e372-456d-a30e-c907b0d0d75e
  curl -I https://bom-media-admin.site/assets/<real-built-js-file>.js
  ```

- Expected result after the rebuilt `dist` is uploaded: extensionless SPA routes return `200 OK` and serve Admin Web HTML; real hashed assets return their asset content type and immutable cache header; missing extension-based assets should not be rewritten to `index.html`.
- The unrelated `td.doubleclick.net/... 404` console request is not part of this SPA fallback fix.

### Pending

- Deploy the rebuilt `dist` contents, including hidden `.htaccess`, to Hostinger.
- Verify direct browser open and refresh for `/videos`, `/websites`, and `/videos/:videoId`.
- Confirm logged-out protected deep routes load the app shell and redirect to `/login` instead of showing Hostinger 404.

## 2026-06-23 — Admin-wide route and bundle performance hardening

### Audit

- Preserved the completed Dashboard 24-item pagination, debounced search, response cache, and four-request local-thumbnail queue.
- Preserved the completed parallel 401 refresh queue and cancellation handling.
- Confirmed all major pages were still imported eagerly by the router.
- Confirmed Create Video and Edit Video modal modules were bundled with their parent page before the modal was opened.
- Confirmed Vite production minification was enabled by default and public source maps were disabled by default, but the policy was not explicit in config.
- Confirmed normal thumbnail images already reserve `aspect-video` space and use `loading="lazy"` plus `decoding="async"`.
- Confirmed the self-hosted Google Sans CSS already uses `font-display: swap`; no external font preconnect/preload is needed.
- Found the main Videos list still fetched every mounted LOCAL_FILE thumbnail immediately even though Dashboard thumbnails were already visibility-gated.

### Changed

- Converted Login, Dashboard, Videos, Video Detail, Websites, Domains, and Settings pages to `React.lazy` route chunks without changing route URLs or auth guards.
- Added a lightweight shared route loading skeleton within `Suspense`.
- Lazy-loaded the existing Create Video and Edit Video modal modules only when opened, with a small modal loading fallback.
- Reused the existing local-thumbnail object URL cache, failure TTL, request deduplication, and four-request queue in the main Videos list.
- Added `IntersectionObserver` with a 250 px root margin to LOCAL_FILE video cards so list thumbnails fetch only near the viewport.
- Made Vite production `minify: true` and `sourcemap: false` explicit.
- Added Hostinger Apache cache headers:
  - `index.html`: no-cache/no-store
  - generated `/assets/*`: one-year immutable
- Documented matching Cloudflare behavior and clarified that admin API/authenticated media responses must remain private/no-store.
- Updated the production checklist, smoke test, and plan to reflect route splitting and cache verification.

Files changed for this performance pass:

```txt
src/app/router.tsx
src/components/common/RouteLoadingFallback.tsx
src/components/common/LazyModalFallback.tsx
src/pages/VideosPage.tsx
src/pages/VideoDetailPage.tsx
src/features/videos/components/VideoCard.tsx
vite.config.ts
public/.htaccess
public/assets/.htaccess
PLAN.md
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Bundle result

- The previous unsplit main JavaScript artifact was approximately 865 kB.
- The new initial JavaScript artifact is approximately 366 kB (about 115 kB gzip).
- Vite emitted separate chunks for all major pages.
- Create Video and Edit Video are separate on-demand chunks.
- The previous Vite `>500 kB` chunk warning no longer appears.

### Intentionally not changed

- Did not add a bundle-analyzer dependency because the production build output already proved the required boundaries.
- Did not add `manualChunks`; route/modal splitting removed the warning without fragile vendor partitioning.
- Did not add font preload/preconnect or replace the existing font package because fonts are self-hosted, unicode-ranged, and already use `font-display: swap`.
- Did not change API contracts, routes, auth behavior, public URL normalization, or share-link payloads.
- Did not rewrite Websites/Domains list UX; deeper pagination there should be driven by production volume measurements and a separate scoped change.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build emitted separate page chunks plus `CreateVideoModal` and `EditVideoModal` chunks.
- `dist/.htaccess` and `dist/assets/.htaccess` were copied into the production artifact.
- Focused Prettier checks passed after formatting touched files.
- `git diff --check` passed with Windows LF-to-CRLF notices only.
- No `package-lock.json` or `pnpm-lock.yaml` files were created.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 14 pre-existing unrelated files; all files changed by this performance pass pass Prettier.

### Pending

- Run the production build locally and manually verify Login, Dashboard, Videos, Video Detail, Websites, Domains, Settings, create/upload modal, edit modal, share-link creation, and public URL normalization.
- Verify Hostinger uploads hidden `.htaccess` files and returns the documented cache headers.
- If Cloudflare overrides origin headers, add matching ordered cache rules in the Cloudflare dashboard.
- Confirm Videos list LOCAL_FILE thumbnails load progressively and 429 failures remain placeholders.

## 2026-06-23 — Parallel 401 refresh queue hardening

### Root cause

- The protected Axios client already shared an in-flight refresh promise, but a slower request could return 401 just after that promise completed and start a second refresh with the newly rotated refresh token.
- Requests did not carry a non-secret auth-session version, so the interceptor could not distinguish a late 401 from a current-token 401.
- Axios `CanceledError` responses were normalized as network failures, which could produce an incorrect error toast for an intentionally aborted upload.
- Missing/failed refresh handling did not have an explicit single-shot session-clear guard.

### Changed

- Added a typed `_authSessionVersion` field alongside `_retry` on protected Axios request configs.
- Every protected request now replaces any stale Authorization value with the current Redux session access token.
- Kept one module-level `refreshPromise`; all parallel first-attempt 401 responses wait for that same refresh.
- Added token-generation tracking so a late 401 from the previous access token retries once with the already-current token instead of starting another refresh.
- Kept retries bounded to one attempt and excluded login, refresh, and logout endpoints from refresh interception.
- Added a single-shot refresh-auth-failure latch so parallel 401/403 refresh failures clear the Redux session once and let the existing protected-route flow show the Vietnamese session-expired message on Login.
- Preserved the existing session on canceled, network, 429, and 5xx refresh failures so temporary API trouble does not force logout.
- Removed the interceptor hard reload; `ProtectedRoute` now performs the redirect after synchronous auth clearing.
- Prevented an in-flight refresh response from restoring a session after logout or another session replacement.
- Tagged protected requests with the safe admin ID and canceled stale responses if the active admin session changed before retry.
- Routed `/admin/auth/me` through the protected Axios client so it uses the same current-token and retry behavior.
- Added cancellation-aware API error normalization for Axios `CanceledError` and `AbortError`.
- Suppressed the local-upload error toast when the upload was intentionally canceled.
- Protected video/thumbnail Blob requests continue using `axiosClient`, so they participate in the same refresh queue and retain their existing placeholder/fallback handling.

Files changed for this auth pass:

```txt
src/lib/api/axiosClient.ts
src/lib/api/apiError.ts
src/features/auth/authApi.ts
src/features/auth/authSessionAccessor.ts
src/features/auth/components/AuthSessionBootstrap.tsx
src/features/videos/components/CreateVideoModal.tsx
src/store/index.ts
session-log.md
```

### Refresh queue design

- The first eligible 401 marks its request `_retry`, then creates `refreshPromise`.
- Concurrent 401 responses await the same promise; only one `/admin/auth/refresh` request is sent.
- Refresh success updates Redux with the rotated access/refresh tokens before waiting requests retry.
- Requests tagged with an older auth-session version reuse the already-current access token without refreshing again.
- Requests from a different/cleared admin session are canceled instead of being replayed under the replacement session.
- A retried request cannot enter the refresh flow again.
- Refresh 401/403 clears auth once; all waiters receive the same refresh rejection.
- Canceled, network, 429, and 5xx refresh failures reject consistently but preserve the current session for a later retry.
- Canceled requests reject as cancellation and do not clear auth or display the upload error toast.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build still reports the existing Vite large-chunk warning.
- Changed-file Prettier check passed:
  `yarn.cmd prettier --ignore-path ../../.prettierignore --check src/lib/api/axiosClient.ts src/lib/api/apiError.ts src/features/auth/authApi.ts src/features/auth/authSessionAccessor.ts src/features/auth/components/AuthSessionBootstrap.tsx src/features/videos/components/CreateVideoModal.tsx src/store/index.ts`
- `git diff --check` passed; Git only reported Windows LF-to-CRLF working-copy notices.
- No `package-lock.json` or `pnpm-lock.yaml` files were found.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 17 pre-existing unrelated files; all files changed by this auth pass Prettier-check successfully.

### Manual test notes

- A live expiry/refresh browser test was not run because this session did not have a controllable deployed/local backend session with forced access-token expiry.
- Static verification confirms one shared refresh promise, one retry marker, stale-token generation detection, current-token replacement, single-shot session clearing, and cancellation bypass.
- Source scan found no token, refresh token, Authorization header, password, or secret console logging.

### Pending

- Force an expired access token with valid refresh token and confirm Dashboard metadata plus thumbnail 401 responses produce exactly one refresh request and successful retries.
- Revoke/expire the refresh token and confirm auth clears once, Login shows `Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.`, and no retry loop occurs.
- Abort a LOCAL_FILE upload and confirm no error toast and no logout.
- Inspect production console and Network tooling to confirm no application log exposes tokens or Authorization values.

## 2026-06-23 — Dashboard video pagination and lazy thumbnail loading

### Root cause

- Dashboard requested up to 100 READY video records on every mount and remount.
- Every mounted LOCAL_FILE card with a local thumbnail immediately fetched the protected `/admin/videos/:id/thumbnail` Blob in `useEffect`, so `loading="lazy"` on the later `<img>` did not prevent authenticated request bursts.
- Navigating away and back recreated the dashboard requests because the screen had no short-lived server-response cache.

### Changed

- Added 24-item READY video pages with `createdAt desc` ordering, a Vietnamese “Tải thêm video” action, and append-without-clearing behavior.
- Moved Dashboard video search to the server with a 300 ms debounce and page-1 reset while preserving selected video IDs across loaded pages and searches.
- Added a per-admin, in-memory 60-second cache for active websites and READY video page responses keyed by search, page, limit, status, sort field, and sort order.
- Manual Dashboard refresh bypasses both caches, keeps existing content visible, and shows a subtle refresh state.
- Refactored Dashboard video cards into memoized cards and uses a memoized selected-ID `Set`.
- LOCAL_FILE thumbnails now wait for an `IntersectionObserver` with a 250 px root margin before entering a four-request concurrency queue.
- Added thumbnail request deduplication, a 150-entry object-URL cache, active-consumer leases to prevent revoking visible images, checksum/updated-at version keys, and a 60-second failure cache.
- Kept non-LOCAL_FILE thumbnails on normal safe HTTP(S) `<img loading="lazy" decoding="async">` rendering.
- Kept share-link payloads and creation behavior unchanged; Dashboard still fetches metadata and thumbnails only.

Files changed:

```txt
src/pages/DashboardPage.tsx
src/features/dashboard/components/ShareLinkComposer.tsx
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/dashboard/dashboardCache.ts
src/features/dashboard/dashboardThumbnailCache.ts
src/features/videos/videoApi.ts
session-log.md
```

### Performance strategy

- Bound initial video metadata work to 24 records instead of 100.
- Fetch additional metadata only on explicit load-more actions.
- Reuse fresh page and website responses for 60 seconds, including React Strict Mode in-flight request deduplication.
- Start protected local-thumbnail requests only near the picker viewport and cap active requests at four.
- Reuse successful object URLs for the admin session and suppress repeated failures for 60 seconds.

### Verified

- `yarn.cmd typecheck` passed.
- `yarn.cmd lint` passed.
- `yarn.cmd build` passed.
- Build still reports the existing Vite large-chunk warning.
- Changed-file Prettier check passed:
  `yarn.cmd prettier --ignore-path ../../.prettierignore --check src/pages/DashboardPage.tsx src/features/dashboard/components/ShareLinkComposer.tsx src/features/dashboard/components/ReadyVideoPicker.tsx src/features/dashboard/dashboardCache.ts src/features/dashboard/dashboardThumbnailCache.ts src/features/videos/videoApi.ts`
- `git diff --check` passed; Git only reported the existing Windows LF-to-CRLF working-copy notices.
- No `package-lock.json` or `pnpm-lock.yaml` files were found.
- Repository-wide `yarn.cmd format:check` was run but remains failing on 22 pre-existing unrelated files; all files changed by this task pass Prettier.

### Manual test notes

- A production-like browser test was not run because this session did not have a live authenticated backend/browser dataset with at least 40 READY videos.
- Static verification confirms Dashboard requests use `limit: 24`, READY status, paged server search, cache bypass on manual refresh, Intersection Observer gating, and four-request thumbnail concurrency.

### Pending

- Run the requested 40+ READY video browser test against a live authenticated backend.
- Confirm Network shows only page 1 initially, progressive `/admin/videos/:id/thumbnail` requests while scrolling, no 429 burst, successful cross-page selection/share-link creation, 60-second navigation cache reuse, and manual-refresh cache bypass.

## 2026-06-18 — Admin Web static-safe share URL normalization

### Summary

- Added an Admin Web share-link URL normalizer so backend `/s/<short-code>#/videos` URLs are displayed/copied as static hash-router URLs like `BASE_URL/#/s/<short-code>/videos`.
- Applied normalization in the websites API adapter for newly created share links and share-link lists, keeping Dashboard and share-link card UI unchanged.
- Added optional `VITE_PUBLIC_SHARE_BASE_URL` support for local nested public-site testing.

### Changed

- `.env.example`
- `docs/.env.production.example`
- `docs/06_API_CONTRACTS.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `src/features/websites/shareLinkUrlUtils.ts`
- `src/features/websites/websiteApi.ts`
- `src/vite-env.d.ts`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write src/features/websites/websiteApi.ts src/features/websites/shareLinkUrlUtils.ts src/vite-env.d.ts docs/06_API_CONTRACTS.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- Build still reports the existing Vite large chunk warning.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification: set `VITE_PUBLIC_SHARE_BASE_URL` to the local Danny public-site nested base, create a Dashboard share link, confirm the copied URL uses `/#/s/<short-code>/videos`, and open it in the public site.
- Verify production keeps `VITE_PUBLIC_SHARE_BASE_URL` unset unless a public site is intentionally deployed below a non-root path.

## 2026-06-15 — Remove unused Cloudinary and Legacy DB create modes

### Summary

- Removed Cloudinary Upload from the Create Video modal.
- Removed Legacy DB Upload from the Create Video modal.
- Kept Server/LOCAL_FILE, Manual URL, and Embed Code as the only create modes.
- Updated create-video validation so only `local-upload`, `manual`, and `embed` are accepted.
- Removed unused Admin Web Cloudinary upload and DB upload create helpers while keeping legacy DB_BLOB replacement/preview support.

### Changed

- `.env.example`
- `AGENTS.md`
- `src/features/videos/components/CreateVideoModal.tsx`
- `src/features/videos/videoApi.ts`
- `src/features/videos/videoSchemas.ts`
- `src/features/videos/videoTypes.ts`
- `src/vite-env.d.ts`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md`
- `docs/06_API_CONTRACTS.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write AGENTS.md .env.example src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoApi.ts src/features/videos/videoSchemas.ts src/features/videos/videoTypes.ts src/vite-env.d.ts docs/02_ADMIN_WEB_RULES.md docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md session-log.md`
  - This first formatting command failed only because Prettier cannot infer a parser for `.env.example`; all non-env files were checked.
- `yarn prettier --ignore-path ../../.prettierignore --write AGENTS.md src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoApi.ts src/features/videos/videoSchemas.ts src/features/videos/videoTypes.ts src/vite-env.d.ts docs/02_ADMIN_WEB_RULES.md docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md session-log.md`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `grep -R "Legacy DB\\|Upload DB\\|Tải lên Cloudinary\\|Cloudinary" src/features/videos/components/CreateVideoModal.tsx src/features/videos/videoSchemas.ts || true`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- Removed UI string grep returned no matches for Create Video modal/schema.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification that Create Video shows only Server, Manual URL, and Embed Code.
- Manual creation tests for Server/LOCAL_FILE upload, Manual URL, and Embed Code against a live backend.
- Verify existing legacy DB_BLOB/CLOUDINARY records still render in list/detail when present.

## 2026-06-15 — Admin Web video status toggle modal

### Summary

- Replaced the video-card `window.confirm()` disable flow with a page-owned READY/DISABLED status confirmation modal.
- READY videos now show a Ban action that PATCHes status to `DISABLED`; DISABLED videos show a restore action that PATCHes status to `READY`.
- The modal explains that Disable is soft status change only and does not delete metadata, thumbnails, video files, or NVMe storage.
- DRAFT/PROCESSING/FAILED cards do not show an incorrect READY/DISABLED toggle.

### Changed

- `src/features/videos/components/VideoCard.tsx`
- `src/features/videos/videoApi.ts`
- `src/pages/VideosPage.tsx`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md`
- `session-log.md`

### Verified

- `yarn prettier --ignore-path ../../.prettierignore --write src/pages/VideosPage.tsx src/features/videos/components/VideoCard.tsx src/features/videos/videoApi.ts`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn build`
- `yarn test`
- `find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print`
- Typecheck, lint, format check, and build passed.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser verification of READY -> DISABLED and DISABLED -> READY card actions against a live backend.
- Confirm no storage files are deleted by the status PATCH flow; storage reclaim remains the Video Detail purge flow.

## 2026-06-15 — Admin Web purge permanently storage reclaim UI

### Summary

- Replaced the Video Detail `window.prompt()` purge flow with an explicit danger-zone confirmation section.
- Purge now requires exact video ID plus an explicit risk acknowledgment checkbox before calling the backend.
- Added optional Cloudinary remote-delete confirmation only for Cloudinary videos with a provider asset id.
- Typed the expanded purge response defensively so Admin Web can show LOCAL_FILE video/thumbnail delete results, reclaimed bytes, and orphan-cleanup warnings when the backend provides them.
- Clarified that video card disable is soft-disable only and does not reclaim storage.
- Updated API contract and production smoke-test docs for disable-vs-purge behavior and storage reclaim feedback.

### Changed

```txt
src/features/videos/videoApi.ts
src/features/videos/videoTypes.ts
src/features/videos/components/VideoCard.tsx
src/pages/VideoDetailPage.tsx
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
session-log.md
```

### Verified

```bash
yarn typecheck
yarn lint
yarn format:check
yarn build
yarn test
git diff --check -- src/features/videos/videoApi.ts src/features/videos/videoTypes.ts src/features/videos/components/VideoCard.tsx src/pages/VideoDetailPage.tsx docs/06_API_CONTRACTS.md docs/07_PRODUCTION_CHECKLIST.md docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
find . -maxdepth 3 \( -name package-lock.json -o -name pnpm-lock.yaml \) -print
```

- Typecheck passed.
- Lint passed.
- Format check passed.
- Build passed. Vite still reports the existing large-chunk warning.
- `yarn test` ran the current placeholder script: `TODO_TEST: Admin web tests will be added later`.
- No npm/pnpm lockfiles were found.

### Pending

- Manual browser/API purge test against a backend that returns the expanded purge response.
- Verify backend blocker errors for videos still assigned to websites/share links.
- Confirm physical LOCAL_FILE file deletion on the server storage root after purge.

## 2026-06-14 — Admin Web LOCAL_FILE upload integration

### Changed

- Resumed the partial LOCAL_FILE implementation instead of replacing it.
- Added LOCAL_FILE video/source types, upload-session/progress types, local asset metadata fields and Vite chunk-size env typing.
- Added Admin Web API helpers for chunked LOCAL_FILE upload init/chunk/complete/cancel, authenticated local video/thumbnail Blob preview, local thumbnail replacement and guarded purge.
- Made Server Storage the preferred Add Video mode while preserving manual URL, embed, Cloudinary upload and legacy DB upload.
- Added sequential chunk upload progress, cancel/abort handling and safe upload messaging.
- Kept captured/selected LOCAL_FILE thumbnails on backend local storage; external thumbnail URLs are patched as metadata only when explicitly provided.
- Updated video cards, dashboard ready-video picker and source filters so READY LOCAL_FILE videos are shown as shareable server videos.
- Added LOCAL_FILE admin preview support through protected API Blob fetches and added authenticated local thumbnail display for cards/picker/player/edit preview.
- Added LOCAL_FILE thumbnail replacement in the edit modal.
- Added guarded permanent purge action on video detail using exact video id confirmation.
- Updated env examples and Admin Web docs to reflect LOCAL_FILE/private server storage as the preferred production large-video path and DB_BLOB as small fallback only.

Files changed in this continuation:

```txt
.env.example
AGENTS.md
PLAN.md
docs/.env.production.example
docs/01_ARCHITECTURE.md
docs/02_ADMIN_WEB_RULES.md
docs/04_DATABASE_RISK_REGISTER.md
docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
src/features/dashboard/components/ReadyVideoPicker.tsx
src/features/videos/components/CreateVideoModal.tsx
src/features/videos/components/EditVideoModal.tsx
src/features/videos/components/VideoCard.tsx
src/features/videos/components/VideoInfoPanel.tsx
src/features/videos/components/VideoPlayerPanel.tsx
src/features/videos/components/VideosEmptyState.tsx
src/features/videos/videoApi.ts
src/features/videos/videoSchemas.ts
src/features/videos/videoSourceUtils.ts
src/features/videos/videoTypes.ts
src/pages/VideoDetailPage.tsx
src/vite-env.d.ts
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed after formatting touched TSX files.
- `yarn build` passed. Vite still reports the existing large bundle warning.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Manual browser/API testing against the live backend is still required:
  LOCAL_FILE init/chunks/complete, cancel cleanup, local thumbnail upload, admin preview, share-link picker inclusion, public playback from backend/public site, and guarded purge rejection/success cases.
- Admin preview currently fetches protected LOCAL_FILE media as a Blob because native `<video src>` cannot attach the admin Bearer token. This is acceptable for verification but should be revisited if admins preview very large files often.
- Existing unrelated auth/settings documentation and source changes were already present in the worktree and were preserved.

## 2026-06-14 — Settings password-change verification

### Changed

- Verified the live Settings route already exists at `/settings` and is protected by `ProtectedRoute`.
- Confirmed the live typed password-change contract is `oldPassword`, `newPassword`, and `secretCode`.
- Updated `SettingsPage` copy/validation to Vietnamese auth UX.
- Preserved React Hook Form + Zod validation and current styling.
- Added safe form-level API errors.
- Added explicit handling for backend `401` verification failure on `/admin/auth/change-password` so wrong current password/secret shows a safe password-change error instead of a misleading session-expired message.
- On successful password change, local auth is cleared, Redux Persist is flushed, in-memory token accessors clear through store synchronization, and the admin is redirected to `/login`.
- Updated docs/checklists to mark Settings password-change UI as implemented while keeping browser/API verification pending.

Files changed:

```txt
src/pages/SettingsPage.tsx
docs/02_ADMIN_WEB_RULES.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
PLAN.md
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed. Vite still reports a large chunk warning; this is existing bundle optimization work, not caused by Settings.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Browser/API manual testing still needed:
  login, open `/settings`, validation errors, wrong password/secret, successful password change, redirect to `/login`, old session denied, login with new password, 429 behavior.

## 2026-06-14 — Production smoke-test checklist

### Changed

- Added `docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md` with a concrete release smoke-test workflow.
- Covered pre-deploy checks, build artifact checks, production Vite env policy, deployment smoke tests, auth/logout/refresh tests, protected routes, feature screens, API docs exposure, Cloudflare checks, public mini-admin absence, incident/rollback notes, and evidence template.
- Added safe placeholder smoke script docs under `scripts/smoke/`.
- Updated README, production checklist, Codex workflow, backlog, and PLAN references to point release work at the smoke-test checklist.

Files changed:

```txt
README.md
PLAN.md
docs/07_PRODUCTION_CHECKLIST.md
docs/08_CODEX_WORKFLOW.md
docs/10_BACKLOG.md
docs/12_ADMIN_WEB_PRODUCTION_SMOKE_TEST.md
scripts/smoke/README.md
scripts/smoke/api-smoke.example.sh
session-log.md
```

### Verified

- Documentation/template-only change.
- `yarn format:check` passed.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.
- Typecheck/lint/build were not rerun because no source TypeScript changed in this pass.

### Pending

- Manual smoke tests still need to be run after deployment.
- Cloudflare Access/WAF/rate-limit settings are documented but not configured by this repo change.
- Secret rotation, backups, off-site backup copies, and restore tests remain external operator actions.

## 2026-06-14 — Admin Web backend logout integration

### Changed

- Wired `MainLayout` logout buttons to a centralized `logoutAdminThunk`.
- Logout now calls `POST /admin/auth/logout` with the current refresh token when one exists.
- Logout always clears local Redux auth state and flushes Redux Persist after the attempt.
- Logout clears in-memory token/session accessors through existing store synchronization.
- Added logout loading/disabled state to prevent duplicate revoke requests.
- Added safe logout success/warning toasts.
- Added normalized `429` API error handling for auth throttling UX.
- Kept refresh-on-401 retry behavior to one retry and clear only on true auth failures.
- Updated Admin Web security/API/checklist docs for backend logout integration.

Files changed:

```txt
src/features/auth/authApi.ts
src/features/auth/authSlice.ts
src/features/auth/components/AuthSessionBootstrap.tsx
src/lib/api/apiError.ts
src/lib/api/axiosClient.ts
src/layouts/MainLayout.tsx
docs/02_ADMIN_WEB_RULES.md
docs/03_SECURITY_MODEL.md
docs/06_API_CONTRACTS.md
docs/07_PRODUCTION_CHECKLIST.md
PLAN.md
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` passed.
- `yarn build` passed. Vite still reports a large chunk warning; this is pre-existing build optimization work, not caused by logout integration.
- `git diff --check` passed.
- Forbidden lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.
- Backend live logout testing was not performed in browser during this pass.

### Pending

- Run browser smoke test against deployed/local backend:
  login, refresh-on-reload, logout revoke request, protected-route redirect, revoked-session 401, login 429.
- HttpOnly refresh cookie migration remains a future hardening task.

## 2026-06-14 — Admin Web Codex documentation pack created

### Context

The project has been separated into:

- Backend API: NestJS + Prisma + MySQL/MariaDB.
- Admin Web: React + Vite + TypeScript static dashboard.
- Public Website: Vanilla JS static sites for display-only share-token video access.

The user wants the Admin Web to become the only management interface. Public websites must no longer contain admin mini page logic, admin API calls, video creation or share-link creation.

### Important architecture decisions

- Admin Web is the only admin surface.
- Public websites call `/_api` and `/_media` through Cloudflare Worker/reverse proxy.
- Backend API remains the source of truth for permissions, domain verification, token validation and logs.
- Raw share tokens must not be persisted.
- DB_BLOB public playback remains disabled.
- Hostinger MySQL is acceptable for MVP, but production must include backups, restore drills, rate limits and monitoring.

### Documents added

- `AGENTS.md`
- `PLAN.md`
- `docs/00_PROJECT_BRIEF.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_ADMIN_WEB_RULES.md`
- `docs/03_SECURITY_MODEL.md`
- `docs/04_DATABASE_RISK_REGISTER.md`
- `docs/05_DEPLOYMENT_HOSTINGER_CLOUDFLARE.md`
- `docs/06_API_CONTRACTS.md`
- `docs/07_PRODUCTION_CHECKLIST.md`
- `docs/08_CODEX_WORKFLOW.md`
- `docs/09_DECISIONS.md`
- `docs/10_BACKLOG.md`
- `docs/11_INCIDENT_RESPONSE.md`

### Pending

- Implement/verify backend logout refresh-token revoke.
- Add production-grade rate limits.
- Add Cloudflare Access/WAF rules for Admin Web/API.
- Rotate exposed development secrets before production.
- Add backup and restore drill for Hostinger MySQL.
- Remove all admin logic from public static site variants.
- Add share-link history/list/revoke UI in Admin Web.
- Verify Settings password-change UI.
- Add E2E smoke tests.

## 2026-07-03 — Videos search guard and compact publishedAt input

### Changed

- Hardened `/videos` manual search so one-character input is handled locally with the hint `Nhập ít nhất 2 ký tự để tìm video.` and does not call `/admin/videos`.
- Normalized VideosPage search input by trimming, collapsing spaces and capping to 80 characters before applying it.
- Added AbortController cancellation and a request-version guard for VideosPage list requests so stale search/status/page requests cannot overwrite newer results.
- Added an inline VideosPage search retry message while preserving existing video results on search failures.
- Extended create-video publishedAt utilities to normalize and parse compact local date/time input such as `17031999`, `170319991041`, `17031999,1041`, and `17031999, 1041`.
- Updated CreateVideoModal to format publishedAt on blur/submit, keep the same ISO API payload behavior, and show helper/error text for quick compact input.

Files changed in this pass:

```txt
src/pages/VideosPage.tsx
src/features/videos/videoDateUtils.ts
src/features/videos/videoSchemas.ts
src/features/videos/components/CreateVideoModal.tsx
session-log.md
```

### Verified

- `yarn typecheck` passed.
- `yarn lint` passed.
- `yarn format:check` initially reported formatting drift in `VideosPage.tsx` and `videoDateUtils.ts`; targeted Prettier was run on the touched files.
- `yarn format:check` passed after formatting.
- `yarn build` passed.
- Lockfile scan found no `package-lock.json` or `pnpm-lock.yaml`.

### Pending

- Manual browser check on `/videos`: one-character search sends no request, `msa` sends one valid request, clearing search restores the normal list, and pagination keeps the active search.
- Manual browser check in CreateVideoModal: `17031999`, `17031999,1041`, and `17031999, 1041` format correctly; invalid date/time values show validation errors; created payload still sends ISO `publishedAt`.
- Deploy the backend API search fix before relying on production Admin Web search behavior.
