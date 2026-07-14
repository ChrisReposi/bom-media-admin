#!/usr/bin/env node
// Admin Web static production-build smoke test.
// Node built-ins only; no dependencies. Verifies the shape of dist/ after
// `yarn build`. It never reads or prints bundle/asset CONTENTS or any secret —
// only file names, counts and structural facts.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..");
const distDir = join(repoRoot, "dist");

const checks = [];
const failures = [];
const ok = (name) => checks.push(`  ok   ${name}`);
const skip = (name) => checks.push(`  skip ${name}`);
const fail = (name, detail) =>
  failures.push(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);

// 1. dist/ exists
if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  console.error(
    "Admin Web build smoke FAILED: dist/ not found. Run `yarn build` first.",
  );
  process.exit(1);
}
ok("dist/ exists");

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full, base));
    } else {
      out.push(relative(base, full).split("\\").join("/"));
    }
  }
  return out;
}

const distFiles = listFiles(distDir);
const indexPath = join(distDir, "index.html");
const assetsDir = join(distDir, "assets");
const assetFiles = existsSync(assetsDir) ? readdirSync(assetsDir) : [];

// 2. index.html
if (existsSync(indexPath)) {
  ok("dist/index.html exists");
} else {
  fail("dist/index.html missing");
}

// 3-4. SPA rewrite / caching config copied from public/
existsSync(join(distDir, ".htaccess"))
  ? ok("dist/.htaccess exists")
  : fail("dist/.htaccess missing");
existsSync(join(assetsDir, ".htaccess"))
  ? ok("dist/assets/.htaccess exists")
  : fail("dist/assets/.htaccess missing");

// 5. at least one JS asset
const jsAssets = assetFiles.filter((f) => f.endsWith(".js"));
jsAssets.length > 0
  ? ok(`${jsAssets.length} JS asset(s) in dist/assets`)
  : fail("no JS asset in dist/assets");

// 6. CSS asset (only informative unless referenced by index.html)
const cssAssets = assetFiles.filter((f) => f.endsWith(".css"));
cssAssets.length > 0
  ? ok(`${cssAssets.length} CSS asset(s) in dist/assets`)
  : skip("no CSS asset emitted");

// 7 & 9. referenced assets resolve; no unresolved env placeholders
if (existsSync(indexPath)) {
  const indexHtml = readFileSync(indexPath, "utf8");

  const referenced = [
    ...new Set(
      [...indexHtml.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((m) => m[0]),
    ),
  ];
  const missing = referenced.filter(
    (ref) => !existsSync(join(distDir, ref.replace(/^\//, ""))),
  );
  missing.length === 0
    ? ok(`all ${referenced.length} referenced asset(s) resolve`)
    : fail("index.html references missing asset(s)", missing.join(", "));

  const placeholders = [
    ...new Set(
      [...indexHtml.matchAll(/%VITE_[A-Z0-9_]+%|%[A-Z0-9_]+%/g)].map(
        (m) => m[0],
      ),
    ),
  ];
  placeholders.length === 0
    ? ok("no unresolved %VITE_*% placeholders in index.html")
    : fail("unresolved placeholder(s) in index.html", placeholders.join(", "));
}

// 8. no public source maps (policy: no source maps in production output)
const mapFiles = distFiles.filter((f) => f.endsWith(".map"));
mapFiles.length === 0
  ? ok("no public source maps")
  : fail("public source map(s) present", mapFiles.join(", "));

// 10. no unexpected sensitive files leaked into the build output
const forbiddenExt = [".pem", ".key", ".p12", ".pfx", ".sql", ".dump"];
const sensitive = distFiles.filter((f) => {
  const base = f.split("/").pop() ?? "";
  if (base.startsWith(".env")) return true;
  if (base === "id_rsa" || base === "credentials" || base === "secrets.json")
    return true;
  return forbiddenExt.some((ext) => base.endsWith(ext));
});
sensitive.length === 0
  ? ok("no unexpected sensitive files in dist")
  : fail("unexpected sensitive file(s) in dist", sensitive.join(", "));

// Report (names/counts only; never file contents)
console.log("Admin Web static build smoke:");
for (const line of checks) console.log(line);

if (failures.length > 0) {
  console.log("");
  for (const line of failures) console.log(line);
  console.error(`\nBuild smoke FAILED with ${failures.length} issue(s).`);
  process.exit(1);
}

console.log(`\nBuild smoke PASSED (${checks.length} checks).`);
process.exit(0);
