import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Source-contract audit for the two runtime warnings this suite guards:
 *
 *   "Missing `Description` or `aria-describedby={undefined}` for {DialogContent}"
 *   "A form field element should have an id or name attribute"
 *
 * These are source-level checks on purpose. The repo's test setup renders with
 * `renderToStaticMarkup`, and Radix mounts dialog content through a portal that
 * does not exist during server rendering, so a render-based assertion could not
 * observe the real DialogContent. Browser verification stays the source of
 * truth for runtime behaviour; this file pins the source invariants so the
 * warnings cannot silently regress.
 */

const SRC_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src",
);

/**
 * The shadcn-style primitives in components/ui are prop-forwarding wrappers:
 * identity is owned by their call sites, so requiring id/name on the inner
 * element would push auto-generated ids into every consumer.
 */
const PRIMITIVE_FILES = new Set([
  path.join("components", "ui", "input.tsx"),
  path.join("components", "ui", "textarea.tsx"),
  path.join("components", "ui", "input-group.tsx"),
]);

function listTsxFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTsxFiles(absolute));
    } else if (entry.name.endsWith(".tsx")) {
      files.push(absolute);
    }
  }
  return files.sort();
}

/** Reads the opening tag starting at `start`, ignoring `>` inside JSX braces. */
function readOpeningTag(source: string, start: number): string {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    else if (character === ">" && depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

const sourceFiles = listTsxFiles(SRC_ROOT).map((absolute) => ({
  relative: path.relative(SRC_ROOT, absolute),
  source: readFileSync(absolute, "utf8"),
}));

describe("dialog accessible descriptions", () => {
  it("gives every Dialog.Content a description or an intentional opt-out", () => {
    const violations = sourceFiles
      .filter(({ source }) => source.includes("<Dialog.Content"))
      .filter(
        ({ source }) =>
          !source.includes("<Dialog.Description") &&
          !source.includes("aria-describedby={undefined}"),
      )
      .map(({ relative }) => relative);

    assert.deepEqual(
      violations,
      [],
      `Dialog.Content must render <Dialog.Description> or opt out at the call site with aria-describedby={undefined}: ${violations.join(", ")}`,
    );
  });

  it("never ships an empty or placeholder Dialog.Description", () => {
    const violations = sourceFiles
      .filter(({ source }) =>
        /<Dialog\.Description[^>]*\/>|<Dialog\.Description[^>]*>\s*(\{""\})?\s*<\/Dialog\.Description>/.test(
          source,
        ),
      )
      .map(({ relative }) => relative);

    assert.deepEqual(violations, [], "Dialog.Description must not be empty");
  });
});

describe("form field identity", () => {
  it("gives every form control an id, a name, or a React Hook Form spread", () => {
    const controlPattern = /<(input|select|textarea|Input|Textarea)(\s|>|\/)/g;
    const violations: string[] = [];

    for (const { relative, source } of sourceFiles) {
      if (PRIMITIVE_FILES.has(relative)) continue;

      let match: RegExpExecArray | null;
      while ((match = controlPattern.exec(source)) !== null) {
        const tag = readOpeningTag(source, match.index);
        const hasIdentity =
          /\bid=/.test(tag) ||
          /\bname=/.test(tag) ||
          /\{\.\.\.(register\(|\w*[Ff]ield)/.test(tag);

        if (!hasIdentity) {
          const line = source.slice(0, match.index).split("\n").length;
          violations.push(`${relative}:${line} <${match[1]}>`);
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Form controls need an id or name so the browser can identify them: ${violations.join(", ")}`,
    );
  });

  it("keeps static element ids unique within each file", () => {
    const violations: string[] = [];

    for (const { relative, source } of sourceFiles) {
      const seen = new Map<string, number>();
      for (const match of source.matchAll(/\sid="([^"]+)"/g)) {
        seen.set(match[1], (seen.get(match[1]) ?? 0) + 1);
      }
      for (const [id, count] of seen) {
        if (count > 1) violations.push(`${relative} id="${id}" x${count}`);
      }
    }

    assert.deepEqual(
      violations,
      [],
      `Duplicate static ids break label and aria references: ${violations.join(", ")}`,
    );
  });

  it("resolves every static aria-describedby to an id defined in the same file", () => {
    const violations: string[] = [];

    for (const { relative, source } of sourceFiles) {
      const definedIds = new Set(
        [...source.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
      );

      for (const match of source.matchAll(/aria-describedby="([^"]+)"/g)) {
        for (const referenced of match[1].split(/\s+/).filter(Boolean)) {
          if (!definedIds.has(referenced)) {
            violations.push(`${relative} -> "${referenced}"`);
          }
        }
      }
    }

    assert.deepEqual(
      violations,
      [],
      `aria-describedby must point at an element that exists: ${violations.join(", ")}`,
    );
  });
});
