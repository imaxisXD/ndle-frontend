// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";
import { ALTERNATIVES } from "./pages";

/* Each comparison page's contents list must match its MDX h2s, with the ids
   rehype-slug gives them, and its search copy must fit in a result. */

function headings(slug: string) {
  const file = fileURLToPath(new URL(`../../content/alternatives/${slug}.mdx`, import.meta.url));
  const slugger = new GithubSlugger();
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const title = line.slice(3).trim();
      return { id: slugger.slug(title), title };
    });
}

describe("comparison pages", () => {
  it("have unique slugs", () => {
    expect(new Set(ALTERNATIVES.map((page) => page.slug)).size).toBe(ALTERNATIVES.length);
  });

  it.each(ALTERNATIVES)("$slug lists its sections as the MDX headings", (page) => {
    expect(page.sections).toEqual(headings(page.slug));
  });

  it.each(ALTERNATIVES)("$slug has search-length copy, questions and a check date", (page) => {
    expect(page.description.length).toBeLessThanOrEqual(155);
    expect(`${page.title} | ndle`.length).toBeLessThanOrEqual(60);
    expect(page.faq.length).toBeGreaterThan(0);
    expect(page.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
