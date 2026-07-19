# Admin Web UX Smoke Test (manual browser checklist)

This is a **manual** browser checklist. It is not automated and is not covered by
`yarn test` (currently a placeholder) or by `yarn smoke:build` (a static
build-output check only). A production release must have this checklist run and
recorded against a real deployed/local backend.

Do not put real credentials, tokens, or personal data in this document. Record
evidence by reference (screenshot filename / ticket link), not by pasting secrets.

## A. Test environment

| Field                         | Value                                |
| ----------------------------- | ------------------------------------ |
| Commit (`git rev-parse HEAD`) |                                      |
| Build timestamp               |                                      |
| API environment (URL/label)   |                                      |
| Admin Web URL                 |                                      |
| Browser / version             |                                      |
| Viewport(s) tested            | 320 / 375 / 768 / 1024 / 1280 / 1440 |
| Tester                        |                                      |
| Overall result                |                                      |
| Notes / screenshot references |                                      |

## Result classification

Use one of: `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `NOT_APPLICABLE`. Do **not** use
"assumed pass". Every `FAIL` / `BLOCKED` row must be expanded in section K.

## B. App shell

| #   | Check                                                                                     | Result | Evidence |
| --- | ----------------------------------------------------------------------------------------- | ------ | -------- |
| B1  | Desktop sidebar shows all sections; active item marked (marker + weight, not colour only) |        |          |
| B2  | Mobile drawer opens from the header trigger                                               |        |          |
| B3  | Drawer closes on Escape                                                                   |        |          |
| B4  | Drawer closes on nav-item select; focus returns to trigger                                |        |          |
| B5  | Logout button shows disabled/busy state while logging out                                 |        |          |
| B6  | Deep-route refresh (e.g. `/videos/:id`) reloads the correct screen                        |        |          |
| B7  | Unknown route shows the 404 page with back / dashboard actions                            |        |          |
| B8  | Light and dark mode both render correctly                                                 |        |          |
| B9  | No horizontal overflow at 320/375/768/1024/1280/1440 px                                   |        |          |

## C. Login

| #   | Check                                                               | Result | Evidence |
| --- | ------------------------------------------------------------------- | ------ | -------- |
| C1  | Field validation (username 3–32, password required)                 |        |          |
| C2  | Incorrect credentials show a safe error (no account-existence leak) |        |          |
| C3  | Successful login                                                    |        |          |
| C4  | Double-click submit does not double-request                         |        |          |
| C5  | Enter submits the form                                              |        |          |
| C6  | Redirect returns to the originally requested route                  |        |          |
| C7  | Theme toggle works and is keyboard-accessible                       |        |          |
| C8  | Show/hide password toggle works and is labelled                     |        |          |
| C9  | Mobile 320 px layout is usable                                      |        |          |

## D. Dashboard

| #   | Check                                                                             | Result | Evidence |
| --- | --------------------------------------------------------------------------------- | ------ | -------- |
| D1  | Initial website + video load                                                      |        |          |
| D2  | Manual refresh shows success toast when both load, error toast when a load fails  |        |          |
| D3  | One-character search sends **no** API request                                     |        |          |
| D4  | Valid search returns filtered videos                                              |        |          |
| D5  | Filter key works                                                                  |        |          |
| D6  | Load more appends without losing selection                                        |        |          |
| D7  | Selected video IDs persist across search/filter changes                           |        |          |
| D8  | Hidden-but-selected videos still counted in "Đã chọn"                             |        |          |
| D9  | Create button gated until a website + ≥1 video chosen                             |        |          |
| D10 | Successful share-link creation shows the public URL                               |        |          |
| D11 | Copy button copies the URL (success/failure toast)                                |        |          |
| D12 | Website with no active domain behaves safely (no fake URL)                        |        |          |
| D13 | No raw token/URL persisted (check storage + console)                              |        |          |
| D14 | Website selection remains one normal click; no double-click action                |        |          |
| D15 | One visible `Quản lý video` button opens the accessible dialog                    |        |          |
| D16 | ACTIVE assignments are checked from authoritative API metadata                    |        |          |
| D17 | Multiple candidates can be checked and assigned in one save                       |        |          |
| D18 | Assigned videos can be unchecked and unassigned in the same save                  |        |          |
| D19 | Assigned-but-ineligible video stays visible and can be unassigned                 |        |          |
| D20 | Search/filter/load-more preserve hidden draft choices                             |        |          |
| D21 | Closing with changes uses the discard confirmation; cancel sends no PATCH         |        |          |
| D22 | Failed save keeps the dialog/draft; success reloads website-scoped shareable data |        |          |
| D23 | Assignment draft never changes canonical/bundle single/multiple selection mode    |        |          |

## E. Videos list

| #   | Check                                                       | Result | Evidence |
| --- | ----------------------------------------------------------- | ------ | -------- |
| E1  | Status tabs switch and reset page to 1                      |        |          |
| E2  | Search (min 2) works; clear works                           |        |          |
| E3  | Reserved key `all` is rejected                              |        |          |
| E4  | Filter key works; clear works                               |        |          |
| E5  | Pagination prev/next and clamp                              |        |          |
| E6  | Silent refresh keeps current list on screen                 |        |          |
| E7  | Disable/restore confirmation dialog (focus, Escape, cancel) |        |          |
| E8  | API error keeps the dialog open for retry                   |        |          |
| E9  | Double-confirm issues only one request                      |        |          |
| E10 | LOCAL_FILE thumbnails load on scroll                        |        |          |
| E11 | Create video modal opens lazily                             |        |          |

## F. Video detail

| #   | Check                                                               | Result | Evidence |
| --- | ------------------------------------------------------------------- | ------ | -------- |
| F1  | Provider/source variants render (direct/manual/embed/LOCAL_FILE/DB) |        |          |
| F2  | Grouped metadata is readable                                        |        |          |
| F3  | SHA-256 checksum displays and copies (only when present)            |        |          |
| F4  | Checksum integrity-only disclaimer is shown                         |        |          |
| F5  | Edit modal opens lazily and saves                                   |        |          |
| F6  | Purge requires the exact video ID                                   |        |          |
| F7  | Purge acknowledgement checkbox required                             |        |          |
| F8  | Cancel/close resets the purge form                                  |        |          |
| F9  | Backend rejection is surfaced (assigned/shared video)               |        |          |
| F10 | Cloudinary remote-delete checkbox appears only when applicable      |        |          |
| F11 | No storage path is displayed anywhere                               |        |          |

## G. Websites / Domains

| #   | Check                                                  | Result | Evidence |
| --- | ------------------------------------------------------ | ------ | -------- |
| G1  | Create / edit website and domain                       |        |          |
| G2  | Disable (website/domain/group) via confirmation dialog |        |          |
| G3  | Unassign domain via confirmation dialog                |        |          |
| G4  | Cancel dismisses the dialog with no action             |        |          |
| G5  | Escape closes; focus returns to trigger                |        |          |
| G6  | API error keeps the dialog open                        |        |          |
| G7  | Mobile layout usable                                   |        |          |
| G8  | Native `<select>` readable in dark mode                |        |          |

## H. Settings

| #   | Check                                                    | Result | Evidence |
| --- | -------------------------------------------------------- | ------ | -------- |
| H1  | Field validation                                         |        |          |
| H2  | Password mismatch blocked                                |        |          |
| H3  | New password equal to old blocked                        |        |          |
| H4  | Wrong current password / secret shows safe error         |        |          |
| H5  | Auth-expired flow clears session and returns to `/login` |        |          |
| H6  | Successful change clears session and returns to `/login` |        |          |
| H7  | Old session cannot be reused after change                |        |          |
| H8  | Show/hide works for all four sensitive fields            |        |          |

## I. Security checks

| #   | Check                                                       | Result | Evidence |
| --- | ----------------------------------------------------------- | ------ | -------- |
| I1  | No secrets/tokens printed in the console                    |        |          |
| I2  | No raw share token persisted (storage/URL/logs)             |        |          |
| I3  | Protected routes redirect unauthenticated users to `/login` |        |          |
| I4  | Public site cannot call admin APIs                          |        |          |
| I5  | Swagger exposure matches production policy                  |        |          |
| I6  | Cloudflare Access / WAF status recorded                     |        |          |
| I7  | No public source maps served                                |        |          |
| I8  | No prohibited external API origin leakage                   |        |          |

## J. Static verification cross-reference (already automated)

These are covered by automation and need not be re-done manually, but record the
run:

| #   | Check                                   | Result | Evidence |
| --- | --------------------------------------- | ------ | -------- |
| J1  | `yarn typecheck`                        |        |          |
| J2  | `yarn lint`                             |        |          |
| J3  | `yarn format:check`                     |        |          |
| J4  | `yarn build`                            |        |          |
| J5  | `yarn smoke:build` (static dist checks) |        |          |

## K. Failures and blockers

For every `FAIL` / `BLOCKED` row above, complete one block:

```txt
Ref (e.g. E8):
Issue:
Steps:
Expected:
Actual:
Evidence:
Severity:
Owner:
Retest status:
```
