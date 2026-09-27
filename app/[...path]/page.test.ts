// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import Page from "./page";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/static-app-shell/page", () => ({
  default: () => createElement("h1", null, "Account access"),
}));

// Every path except "/" (app/page.tsx) lands here: /dashboard, /urls, /link/…
describe("app pages", () => {
  beforeEach(() => vi.clearAllMocks());

  test("open the app for a signed-in visitor", async () => {
    vi.mocked(auth, { partial: true }).mockResolvedValue({ isAuthenticated: true });

    expect(renderToStaticMarkup(await Page())).toContain("Account access");
  });

  test("send signed-out visitors to sign-in", async () => {
    const redirectToSignIn = vi.fn(() => {
      throw new Error("Sign-in redirect");
    });
    vi.mocked(auth, { partial: true }).mockResolvedValue({
      isAuthenticated: false,
      redirectToSignIn,
    });

    await expect(Page()).rejects.toThrow("Sign-in redirect");
    expect(redirectToSignIn).toHaveBeenCalledOnce();
  });
});
