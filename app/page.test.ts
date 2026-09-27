// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import Page, { metadata } from "./page";

vi.mock("@/app/home-2/_components/home-page", () => ({
  HomePage: () => createElement("h1", null, "Landing page"),
  HOME_METADATA: { title: "Home" },
}));

test("the root URL is the landing page, for everyone", () => {
  expect(renderToStaticMarkup(createElement(Page))).toContain("Landing page");
  expect(metadata).toEqual({ title: "Home" });
});
