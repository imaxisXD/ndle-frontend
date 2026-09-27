// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";
import { describe, expect, it } from "vitest";
import { POSTS } from "./posts";

/* The registry in posts.ts describes each MDX post: its contents list must match
   the post's own h2s, with the ids rehype-slug gives them. */

function headings(slug: string) {
  const file = fileURLToPath(new URL(`../../content/blog/${slug}.mdx`, import.meta.url));
  const slugger = new GithubSlugger();
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const title = line.slice(3).trim();
      return { id: slugger.slug(title), title };
    });
}

describe("blog posts", () => {
  it("have unique slugs, newest first", () => {
    expect(new Set(POSTS.map((post) => post.slug)).size).toBe(POSTS.length);
    const dates = POSTS.map((post) => post.published);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it.each(POSTS)("$slug lists its sections as the MDX headings", (post) => {
    expect(post.sections).toEqual(headings(post.slug));
  });

  it.each(POSTS)("$slug has a search-length description and real dates", (post) => {
    expect(post.description.length).toBeLessThanOrEqual(155);
    for (const date of [post.published, post.updated].filter(Boolean)) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date as string))).toBe(false);
    }
  });
});
