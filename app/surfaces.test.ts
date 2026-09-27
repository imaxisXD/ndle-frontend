// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

// The product UI layers surfaces with the tokens in app/globals.css: Card for
// raised panels, Inset / bg-surface-inset for sections set into them, the
// shadow-raised / floating / modal elevations, and bg-surface-hover for hover
// fills. This test keeps hand-picked grays and shadows from creeping back.

const ROOTS = ["components", "routes", "app/static-app-shell"];

const EXCLUDED_FILES = new Set([
  // Marketing pages use the pulp-poster palette, not the product surfaces.
  "components/PublicHome.tsx",
  "components/comic.tsx",
  // Not rendered anywhere.
  "components/GuestShortenerCard.tsx",
]);

const RULES = [
  {
    pattern: /hover:bg-muted(?![-\w])(?:\/\d+)?/g,
    use: "hover:bg-surface-hover",
  },
  {
    pattern: /hover:bg-(?:gray|zinc|neutral|slate|stone)-(?:50|100|200)\b/g,
    use: "hover:bg-surface-hover",
  },
  { pattern: /(?<![-\w])bg-muted\/\d+/g, use: "Inset or bg-surface-inset" },
  {
    pattern: /(?<![-\w])bg-(?:gray|zinc|neutral|slate|stone)-50\b/g,
    use: "Inset or bg-surface-inset",
  },
  {
    pattern: /(?<![-\w])shadow-(?:md|lg|xl|2xl)\b/g,
    use: "shadow-raised, shadow-floating, or shadow-modal",
  },
  { pattern: /(?<![-\w])bg-home\b/g, use: "bg-surface-page" },
];

// Deliberate exceptions: file -> classes allowed there.
const ALLOWED: Record<string, string[]> = {
  // The switch thumb is part of a control, not a surface.
  "components/ui/switch.tsx": ["shadow-lg"],
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")
      ? [path]
      : [];
  });
}

// Blank out comments (keeping line numbers) so commented-out markup and notes
// about old classes don't count.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "))
    .replace(/^\s*\/\/.*$/gm, "");
}

test("product UI uses surface tokens instead of hand-picked grays and shadows", () => {
  const violations: string[] = [];

  for (const file of ROOTS.flatMap(sourceFiles)) {
    if (EXCLUDED_FILES.has(file)) continue;
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");

    lines.forEach((line, index) => {
      for (const { pattern, use } of RULES) {
        for (const [match] of line.matchAll(pattern)) {
          if (ALLOWED[file]?.includes(match)) continue;
          violations.push(`${file}:${index + 1} ${match} -> use ${use}`);
        }
      }
    });
  }

  expect(violations).toEqual([]);
});
