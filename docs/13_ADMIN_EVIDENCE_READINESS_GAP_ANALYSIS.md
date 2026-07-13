# Admin Evidence Readiness Gap Analysis

> Status: analysis only. This document does **not** authorize backend schema
> changes, new endpoints, migrations, or new Admin Web UI. It records what the
> system can and cannot do today, and proposes future work at a conceptual level.
> Every proposed model, field, or module below is marked `PROPOSED` and must not
> be built on the frontend before a backend source of truth exists.

## 1. Purpose and scope

This document assesses how far the Admin Web can support an operational
copyright/evidence-readiness workflow, and where the real gaps are. It is
written for engineers and operators, not as legal advice.

Scope:

- Inventory the data the Admin Web actually receives and can display today, based
  on the TypeScript types and API clients in `src/features/**`.
- Classify that data by provenance (who/what produced it).
- Separate what is displayed, what is available but not displayed, what is
  documented but has no admin API, and what is not supported at all.
- Describe the limitations that prevent the Admin Web from being treated as a
  complete evidence system.
- Propose future backend/database/API capabilities and Admin Web modules, in
  dependency order, without implementing them.

Out of scope: implementing any of the proposed capabilities, writing production
Prisma schema/migrations, or building UI mock-ups of unbuilt features.

## 2. Important limitations

These statements are load-bearing and must not be softened in the UI or in future
documents:

- The Admin Web is an **operational management and traceability tool**. It is not,
  by itself, proof of copyright ownership.
- A managed public website can help provide **context and reference material**. A
  website being present does not, on its own, constitute sole or decisive proof of
  ownership.
- A SHA-256 checksum only supports **file-integrity** verification (has this exact
  file changed?). It does **not** prove who owns the work.
- A date a record was entered into the system does **not** prove the first
  publication date of a work.
- The database `createdAt` is a **record-creation timestamp**. It must never be
  presented as a creation date, authorship date, or ownership date of the work.
- Admin-entered values (title, description, `publishedAt`, URLs) require
  provenance and an audit trail before they can be relied on as evidence.
- Nothing in this system may backdate records, rewrite history, or fabricate data
  to make a case look stronger than reality.
- No feature is guaranteed to cause a copyright/removal request to be accepted.
- Fair-use assessment and legal conclusions are **not** automated by the UI.

## 3. Current system boundaries

- **Backend API (NestJS + Prisma + MySQL/MariaDB)** is the source of truth for
  auth, authorization, validation, token verification, ownership/assignment checks,
  and audit/access logging (per `docs/01_ARCHITECTURE.md`).
- **Admin Web (this repo)** is a static React dashboard. It can hide buttons and
  shape presentation, but it enforces no security decision; the backend does.
- **Public websites** are display-only and share-token-only. They must never reach
  admin evidence endpoints.
- The Admin Web can only display fields the backend returns. It must not compute
  checksums client-side, invent fields, or persist raw share tokens.

## 4. Current data inventory

All fields below are taken from the committed TypeScript types and API clients.
Only confirmed fields are listed.

### 4.1 Video identity (`VideoAsset`, `src/features/videos/videoTypes.ts`)

`id`, `title`, `slug`, `description`, `status`
(`DRAFT|PROCESSING|READY|FAILED|DISABLED`), `filterKey`, `provider`
(`MANUAL|BUNNY|MUX|CLOUDINARY`), `sourceType`
(`UPLOAD|DIRECT_URL|EMBED|DB_BLOB|LOCAL_FILE`), `metadataJson` (opaque).

### 4.2 Publication and timestamps

- `publishedAt` — publication timestamp. **Admin-entered / source-dependent**; it
  is not an independently verified first-publication date.
- `createdAt` — record creation time in the CMS database. **Not** a work-creation
  or ownership date.
- `updatedAt` — last record modification time in the CMS database.

The three timestamps answer different questions and must be labelled distinctly.

### 4.3 Media metadata

`durationSeconds`, `viewCount`, `playbackUrl`, `embedUrl` (+ `embedProvider`,
`embedCloudName`, `embedPublicId`, `embedAllow`), `playbackId`, `thumbnailUrl`,
`providerAssetId`, and for stored files: `binaryAsset.{mimeType,sizeBytes}`,
`localFileAsset.{mimeType,sizeBytes,originalFilename}`, `binaryPlaybackUrl`,
`localPlaybackUrl`.

### 4.4 Integrity metadata

- `localFileAsset.checksumSha256`
- `localThumbnailAsset.checksumSha256`

These are backend/storage-computed file hashes.

### 4.5 Purge safety metadata (`PurgeVideoResponse`)

`safety.{hadWebsiteAssignments, hadShareLinks, activeWebsiteAssignmentCount,
disabledShareLinkCount, detachedShareLinkVideoCount}` and `storage.*` reclaim flags.
Returned only in the purge response.

### 4.6 Website / domain assignment

- `Website`: `id`, `name`, `slug`, `defaultTitle`, `defaultDescription`,
  `domainGroup`, `status` (`ACTIVE|DISABLED`), `domains[]`, `createdAt`, `updatedAt`.
- `WebsiteDomain`: `id`, `websiteId`, `domain`, `isPrimary`, `status`, `createdAt`,
  `updatedAt`.
- `DomainPoolItem`: `id`, `websiteId`, `websiteName`, `websiteSlug`, `domainGroup`,
  `domain`, `isPrimary`, `status`, `usageStatus` (`AVAILABLE|IN_USE|DISABLED`),
  `createdAt`, `updatedAt`.
- `DomainGroup`: `id`, `key`, `name`, `description`, `status`, `createdAt`,
  `updatedAt`.

### 4.7 Share-link creation and history

- `CreateShareLinkResponse`: `message`, `shareLink`, `rawToken`, `publicUrl`.
- `ShareLink`: `id`, `websiteId`, `label`, `status`
  (`ACTIVE|REVOKED|EXPIRED|DISABLED`), `expiresAt`, `maxViews`, `currentViews`,
  `createdAt`, `updatedAt`, `lastViewedAt`, `publicUrl`, `videos[]`.
- API clients `getShareLinks(websiteId)` and `revokeShareLink(shareLinkId)` exist
  in `src/features/websites/websiteApi.ts`.

The `rawToken` / one-time `publicUrl` are shown only immediately after creation and
must never be persisted in the Admin Web (Redux, local/session storage, logs, URLs).
The share-link **list/history** response (`ShareLink`) carries no `rawToken` field and
must never be used to recover a raw token; a future revoke action operates on the safe
record identifier (`shareLinkId`), not on any raw token in the UI.

### 4.8 Admin/account metadata (`SafeAdmin`)

`id`, `username`, `role` (`OWNER|ADMIN|STAFF`), `status` (`ACTIVE|DISABLED`),
`createdAt`, `lastLoginAt`. This is account metadata; it is **not** authority or
ownership proof.

## 5. Data provenance classification

| Data                                        | Classification                     | Notes                                        |
| ------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| `id`, `createdAt`, `updatedAt`              | `SYSTEM_GENERATED`                 | DB/record lifecycle timestamps               |
| `checksumSha256` (video/thumbnail)          | `SYSTEM_GENERATED`                 | Storage-computed file hash                   |
| `viewCount`, `currentViews`, `lastViewedAt` | `SYSTEM_GENERATED`                 | Access counters, backend-owned               |
| `title`, `description`, `slug`, `filterKey` | `ADMIN_ENTERED`                    | Operator-supplied metadata                   |
| `publishedAt`                               | `ADMIN_ENTERED`                    | Source-dependent; not independently verified |
| `playbackUrl`, `embedUrl`                   | `ADMIN_ENTERED` / provider-derived | Sanitized/validated by backend               |
| Formatted dates, human-readable sizes       | `DERIVED_PRESENTATION`             | Computed in the UI for display only          |
| `status`, `usageStatus`, assignment state   | `BACKEND_VERIFIED` (operational)   | Backend enforces state transitions           |
| Owner / rights holder / rights scope        | `NOT_SUPPORTED`                    | No model/endpoint today                      |
| First-publication verification              | `NOT_SUPPORTED`                    | No verification process today                |

`BACKEND_VERIFIED` is used **only** for operational state the backend actually
enforces (e.g. a domain is `ACTIVE` and assigned). It is never applied to
ownership, rights, or publication-date claims, because the backend performs no such
verification.

## 6. Current frontend presentation

Improvements delivered across UX-0 → UX-6 (static-verified; **not** browser-verified):

- **UX-0** semantic tokens (added `warning`/`info`/`overlay`; fixed a dark-theme CSS
  typo).
- **UX-1** app shell, accessible route/auth/bootstrap states, mobile drawer, 404.
- **UX-2** Websites/Domains destructive confirmations via a shared accessible dialog;
  removed hardcoded hex.
- **UX-3** Videos list: filter surface, active-filter chips, differentiated empty
  states, status confirmation via the shared dialog.
- **UX-4** Video detail: grouped metadata, and **SHA-256 checksum display with a
  neutral integrity-only disclaimer and copy buttons** (shown only when present).
- **UX-5** Dashboard share workflow: stepped composer, fixed a refresh success/failure
  bug and a mojibake string; no raw-token persistence.
- **UX-6** Login/Settings: accessible forms, password show/hide, large login-chunk
  bundle reduction.

Browser and live-API verification of every phase remains pending (no browser tooling
is configured in this repo).

## 7. Available but not fully surfaced

Only fields confirmed to exist in types/API are listed.

| Field                                                                                 | Current source                             | Current consumer                         | Gap                                        | Suggested presentation                                                        | Security note                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `SafeAdmin.createdAt`, `lastLoginAt`                                                  | `MeAdminResponse` / auth state             | Settings shows only username/role/status | Account age / last login not shown         | Read-only rows in the account panel                                           | No token/session detail beyond these safe fields                  |
| `ShareLink` list + `revokeShareLink`                                                  | `getShareLinks`, `revokeShareLink` (exist) | No UI consumer                           | No share-link history or revoke screen     | A share-link list page with status/expiry/views and a confirmed revoke action | Never render or persist raw tokens; list exposes only safe fields |
| `ShareLink.currentViews`, `lastViewedAt`, `expiresAt`, `maxViews`                     | share-link list response                   | Only the just-created link is shown      | Historical link usage invisible            | Show within the proposed share-link list page                                 | Access data is sensitive; keep behind admin auth                  |
| `PurgeVideoResponse.safety.*`                                                         | purge response                             | Toast only                               | Assignment/share-link context is transient | Optionally summarize in the purge result panel                                | Do not expose storage paths                                       |
| `Website.defaultTitle`, `defaultDescription`                                          | `Website` type                             | Partially surfaced                       | Verify current website UI display          | Surface in website detail if useful                                           | Public-safe metadata only                                         |
| `VideoAsset.metadataJson`, `playbackId`, `embedProvider/embedCloudName/embedPublicId` | `VideoAsset`                               | Not shown / partially                    | Provider/source detail not fully visible   | Optional advanced-metadata section                                            | Do not expose secrets/tokens                                      |

## 8. Missing backend and API capabilities

### 8.1 Documented in architecture/backlog but no admin API

- **`AdminAuditLog`** — listed as a backend model in `docs/01_ARCHITECTURE.md` and
  as an "Audit logs page" in `docs/10_BACKLOG.md`, but there is **no admin API
  client** in `src/features/**`. `DOCUMENTED_NO_ADMIN_API`.
- **`AccessLog`** — same situation ("Access logs page" backlog item); `ShareLink`
  counters hint at access tracking, but there is no detailed access-log admin API.
  `DOCUMENTED_NO_ADMIN_API`.

### 8.2 No confirmed model or endpoint (`BACKEND_REQUIRED` / `NOT_SUPPORTED`)

For each item: the problem it solves, the data model and API it would need, the
authorization/audit/privacy requirements, and the rule that the frontend must not
mock it before the backend exists.

- **Original Work Registry** — canonical record of a protected work (see §13).
- **Rights Holder Profile** — the entity/person holding rights (see §14).
- **Authority / Representation Records** — proof that an actor may act for a rights
  holder (see §14).
- **Rights-controlled Scope** — which territories/uses/platforms a claim covers.
- **Canonical Original URL** — the authoritative source URL for the original work,
  distinct from a playback/embed URL.
- **Publication Provenance** — evidence of when/where a work was first published,
  distinct from `publishedAt` and `createdAt`.
- **Infringement Case Record** — a workspace tying a suspected infringement to a
  registered work and rights context.
- **Timestamp Comparison** — structured comparison of provenance dates (never an
  automatic legal conclusion).
- **Correspondence Log** — record of notices/communications, with retention rules.
- **Evidence Attachment Registry** — stored supporting documents with checksums and
  access control.
- **Evidence Bundle Export** — a versioned, auditable export (see §16).
- **Share-Link History / Revoke UI** — frontend-only for now, because the API
  already exists (§7); listed here for completeness of the roadmap.

None of the above may be implemented in the Admin Web before the backend provides a
verified source of truth. Any schema/endpoint sketches remain `PROPOSED`.

## 9. Proposed future modules

Conceptual only; each requires a backend source of truth first:

`Original Work Registry`, `Rights and Authority Profile`, `Infringement Case
Workspace`, `Timestamp Comparison`, `Correspondence Log`, `Evidence Attachment
Registry`, `Evidence Bundle Export`, `Audit Log Viewer`, `Access Log Viewer`,
`Share-Link History and Revoke`.

They must not appear in the sidebar as working features until they actually work.

## 10. Security and privacy risks

- **Least privilege / role-aware access** — evidence data is sensitive; access must
  be gated by role (`OWNER|ADMIN|STAFF`) server-side, not by hiding buttons.
- **Sensitive-document handling** — supporting documents must use signed/private
  access, encryption at rest, and redaction of personal data where possible.
- **No secrets in logs** — never log passwords, access/refresh tokens, raw share
  tokens, or `secretCode`.
- **No raw token persistence** — the current one-time raw-token rule must extend to
  any future evidence/export feature.
- **Public isolation** — public websites must never reach admin evidence endpoints.
- **Data retention** — access logs and correspondence need defined retention and
  archival (see `docs/10_BACKLOG.md` "Archive access logs").
- **Export/download logging** — every evidence export must itself be audited.
- **Infrastructure** — keep the Admin Web behind Cloudflare Access or an equivalent
  identity gate (per `docs/01_ARCHITECTURE.md` / `docs/03_SECURITY_MODEL.md`).
- **Legal misrepresentation** — the largest risk is presenting operational data as
  legal proof; all labels must stay neutral.

This document intentionally contains **no** real personal names, addresses, phone
numbers, company identities, or sample credentials.

## 11. Auditability and chain-of-custody requirements

Any future evidence capability should record (server-side):

- actor / admin `id` for every change;
- action type;
- a safe before/after snapshot or diff (never secrets);
- server-side timestamp;
- request metadata (e.g. an IP **hash**) where appropriate;
- checksums for any attachment;
- an append-only or otherwise tamper-evident strategy;
- a reason/comment for significant changes;
- a retention policy;
- export history;
- access control on the audit trail itself.

Blockchain is **not** asserted as necessary. Audit logs must never store passwords,
access/refresh tokens, raw share tokens, or secret codes.

## 12. Evidence bundle export requirements

`PROPOSED` future feature only (no UI/code in this phase). A bundle could include a
manifest, work metadata, media integrity hashes, canonical URLs, publication
provenance references, rights/authority references, comparison notes, relevant audit
events, an export timestamp, the exporter admin `id`, and per-file checksums.

Mandatory constraints:

- an export does **not** prove ownership and is **not** a legal conclusion;
- sensitive fields must be redacted;
- raw tokens and secrets must never be exported;
- the bundle needs a versioned schema;
- every export must be audited.

## 13. Readiness matrix

Status values: `AVAILABLE_AND_DISPLAYED`, `AVAILABLE_NOT_DISPLAYED`,
`DOCUMENTED_NO_ADMIN_API`, `BACKEND_REQUIRED`, `NOT_SUPPORTED`,
`MANUAL_VERIFICATION_REQUIRED`. No scores or percentages are used.

| Capability                                         | Current status                                   | Evidence / source                 | Current risk                | Required next step                  | Owner layer                    |
| -------------------------------------------------- | ------------------------------------------------ | --------------------------------- | --------------------------- | ----------------------------------- | ------------------------------ |
| Video identity + status                            | `AVAILABLE_AND_DISPLAYED`                        | `videoTypes.ts`, VideoInfoPanel   | Low                         | —                                   | Admin Web                      |
| SHA-256 file integrity                             | `AVAILABLE_AND_DISPLAYED`                        | `checksumSha256`, UX-4            | Misread as ownership proof  | Keep integrity-only disclaimer      | Admin Web                      |
| Timestamps (`publishedAt`/`createdAt`/`updatedAt`) | `AVAILABLE_AND_DISPLAYED`                        | `videoTypes.ts`                   | Confusing provenance        | Keep distinct labels; never equate  | Admin Web / Legal-Human Review |
| Website/domain assignment                          | `AVAILABLE_AND_DISPLAYED`                        | website/domain types              | Low                         | —                                   | Admin Web                      |
| Share-link creation (one-time URL)                 | `AVAILABLE_AND_DISPLAYED`                        | `CreateShareLinkResponse`         | Token exposure if persisted | Keep no-persist rule                | Admin Web                      |
| Share-link history + revoke                        | `AVAILABLE_NOT_DISPLAYED`                        | `getShareLinks`/`revokeShareLink` | No revoke UI in production  | Build a list/revoke page (frontend) | Admin Web                      |
| Admin `createdAt` / `lastLoginAt`                  | `AVAILABLE_NOT_DISPLAYED`                        | `SafeAdmin`                       | None                        | Show read-only in Settings          | Admin Web                      |
| Audit log viewer                                   | `DOCUMENTED_NO_ADMIN_API`                        | `01_ARCHITECTURE`, `10_BACKLOG`   | No admin visibility         | Backend admin API first             | Backend / Database             |
| Access log viewer                                  | `DOCUMENTED_NO_ADMIN_API`                        | `01_ARCHITECTURE`, `10_BACKLOG`   | No admin visibility         | Backend admin API first             | Backend / Database             |
| Original Work Registry                             | `BACKEND_REQUIRED`                               | none                              | Fabrication risk if mocked  | Design contract + provenance        | Backend / Database             |
| Rights holder / authority                          | `BACKEND_REQUIRED`                               | none                              | Misrepresentation risk      | Design with verification/audit      | Backend / Legal-Human Review   |
| Canonical original URL / publication provenance    | `BACKEND_REQUIRED`                               | none                              | Date/ownership confusion    | Model + validation + provenance     | Backend / Operations           |
| Ownership verification                             | `NOT_SUPPORTED` / `MANUAL_VERIFICATION_REQUIRED` | none                              | Legal misrepresentation     | Human review process                | Legal-Human Review             |
| Evidence bundle export                             | `NOT_SUPPORTED`                                  | none                              | Overstated exports          | Versioned, audited design           | Backend / Operations           |
| Cloudflare Access / infra gate                     | `BACKEND_REQUIRED` (ops)                         | `01_ARCHITECTURE`/`10_BACKLOG`    | Exposed admin surface       | Configure per deployment docs       | Infrastructure                 |

## 14. Recommended implementation phases

Proposed future phases (this document does **not** modify `PLAN.md`). Frontend work
must never precede its backend source of truth.

- **E0 — Contract and provenance design.** Define models, provenance rules, and
  authorization/audit requirements. Depends on: nothing. Blocks: E1+.
- **E1 — Original Work Registry backend.** API + storage for §13 registry. Depends
  on E0.
- **E2 — Rights and authority records.** Rights holder, representation, scope,
  verification status. Depends on E0/E1.
- **E3 — Audit/access log admin APIs.** Expose the documented `AdminAuditLog` /
  `AccessLog` safely. Depends on E0.
- **E4 — Case and comparison workspace.** Infringement case records + timestamp
  comparison. Depends on E1/E2.
- **E5 — Evidence attachment storage.** Private, checksummed, access-controlled
  attachments. Depends on E0/E3.
- **E6 — Bundle export.** Versioned, audited export (§12). Depends on E1–E5.
- **E7 — Admin Web modules.** UI for the above, only after each API is real.
  Depends on the matching backend phase.
- **E8 — Security, retention and verification.** Retention policies, redaction,
  export logging, restore drills, human-review process. Cross-cuts E0–E7.

## 15. Definition of done

This gap analysis is "done" when it:

- accurately reflects the committed types/API (no invented fields);
- classifies every data group by provenance;
- clearly separates displayed / available-not-displayed / documented-no-API /
  backend-required / not-supported;
- states the honesty limitations in §2 without softening them;
- proposes future modules and phases as `PROPOSED`, with dependencies, and forbids
  frontend-before-backend;
- contains no fabricated, backdated, or personal data;
- is referenced from `README.md` and recorded in `session-log.md`.

It is explicitly **not** done meaning any capability is built — no backend, API, or
UI is created by this document.

## 16. Explicit non-goals

The system and this document must **not**:

- automatically conclude that infringement occurred;
- automatically conclude fair use;
- generate ownership proof;
- backdate or rewrite records;
- simulate legal authority or representation;
- automatically send copyright/removal notices;
- guarantee that any request will be accepted;
- display evidence data on public websites by default;
- replace legal or human review.

Terms such as "verified owner", "proof of ownership", "legal confidence score", or
"guaranteed approval" appear in this document **only** to prohibit them. No feature
may present operational data using those claims.
