import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative: string) =>
  readFileSync(path.join(ROOT, relative), "utf8");

const dashboard = read("src/pages/DashboardPage.tsx");
const dialog = read(
  "src/features/dashboard/components/AssignWebsiteVideoDialog.tsx",
);
const composer = read(
  "src/features/dashboard/components/ShareLinkComposer.tsx",
);
const picker = read("src/features/dashboard/components/ReadyVideoPicker.tsx");
const websiteSelector = read(
  "src/features/dashboard/components/WebsiteQuickSelect.tsx",
);
const websiteApi = read("src/features/websites/websiteApi.ts");
const selectionPolicy = read(
  "src/features/dashboard/dashboardSelectionPolicy.ts",
);

describe("dashboard bulk assignment source contract", () => {
  it("uses one explicit single-click management entry without website double-click", () => {
    assert.match(composer, />\s*Quản lý video\s*</);
    assert.match(composer, /onClick=\{onOpenAssignment\}/);
    assert.doesNotMatch(websiteSelector, /onDoubleClick|dblclick/i);
    assert.match(
      websiteSelector,
      /onClick=\{\(\) => onChange\(website\.id\)\}/,
    );
    assert.doesNotMatch(picker, /onOpenAssignment|Gán video cho website/);
  });

  it("loads authoritative options and never derives assignments from Dashboard videos", () => {
    assert.match(
      websiteApi,
      /\/admin\/websites\/\$\{websiteId\}\/video-assignment-options/,
    );
    assert.match(
      dialog,
      /replaceAssignmentState\(response\.meta\.activeAssignedVideoIds\);/,
    );
    assert.doesNotMatch(
      dashboard,
      /assignedVideoIds=\{videos\.map\(\(video\) => video\.id\)\}/,
    );
    assert.match(dialog, /baselineAssignedIds/);
    assert.match(dialog, /draftAssignedIds/);
  });

  it("uses accessible Radix Dialog primitives and multi-select checkboxes", () => {
    assert.match(dialog, /<Dialog\.Content/);
    assert.match(dialog, /<Dialog\.Title/);
    assert.match(dialog, /<Dialog\.Description/);
    assert.match(dialog, /type="checkbox"/);
    assert.doesNotMatch(dialog, /type="radio"/);
    assert.doesNotMatch(
      dialog,
      /<div className="fixed inset-0 z-50 flex items-center justify-center/,
    );
    assert.match(dialog, /<ConfirmActionDialog/);
  });

  it("sends one PATCH with exact assign and unassign arrays", () => {
    assert.match(
      websiteApi,
      /axiosClient\.patch<UpdateWebsiteVideoAssignmentsResponse>/,
    );
    assert.match(
      websiteApi,
      /\/admin\/websites\/\$\{websiteId\}\/video-assignments/,
    );
    assert.match(dialog, /await onSave\(delta\)/);
    assert.match(
      dialog,
      /disabled=\{\s*!canManage \|\| !hasChanges \|\| isLoading \|\| isSubmitting\s*\}/,
    );
  });

  it("invalidates and reloads Dashboard data only after successful save", () => {
    const updateCall = dashboard.indexOf(
      "await updateWebsiteVideoAssignments(",
    );
    const invalidation = dashboard.indexOf(
      "invalidateDashboardWebsiteVideoCache(cacheScope, requestWebsiteId)",
    );
    const reload = dashboard.indexOf("await loadFirstVideoPage(", updateCall);
    assert.ok(updateCall >= 0);
    assert.ok(invalidation > updateCall);
    assert.ok(reload > invalidation);
    assert.match(dashboard, /payload\.unassignVideoIds/);
    assert.match(dashboard, /setCreatedShareLink\(null\)/);
    assert.match(dashboard, /setCanonicalResult\(null\)/);
  });

  it("keeps assignment management independent from share-link selection mode", () => {
    assert.match(
      selectionPolicy,
      /DEFAULT_VIDEO_SELECTION_MODE[^=]*= "single"/,
    );
    assert.match(selectionPolicy, /"single" \| "multiple"/);
    assert.doesNotMatch(dialog, /selectedVideoIds|videoSelectionMode/);
    assert.doesNotMatch(dashboard, /setVideoSelectionMode\([^)]*assignment/i);
    assert.match(dashboard, /useAdminPermission\("website\.write"\)/);
  });
});
