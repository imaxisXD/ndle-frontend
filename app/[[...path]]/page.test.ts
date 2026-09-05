// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import Page from "./page";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/components/PublicHome", () => ({
  PublicHome: () => createElement("h1", null, "Landing page"),
}));
vi.mock("@/app/static-app-shell/page", () => ({
  default: () => createElement("h1", null, "Account access"),
}));

describe("initial page", () => {
  beforeEach(() => vi.clearAllMocks());

  test.each([false, true] as const)(
    "keeps the root URL on the landing page when signed in is %s",
    async (isAuthenticated) => {
      vi.mocked(auth, { partial: true }).mockResolvedValue({ isAuthenticated });

      const page = renderToStaticMarkup(
        await Page({ params: Promise.resolve({}) }),
      );
      expect(page).toContain("Landing page");
      expect(page).not.toContain("Account access");
    },
  );

  test.each(["dashboard", "urls"])(
    "opens /%s for a signed-in visitor",
    async (path) => {
      vi.mocked(auth, { partial: true }).mockResolvedValue({
        isAuthenticated: true,
      });

      const page = renderToStaticMarkup(
        await Page({ params: Promise.resolve({ path: [path] }) }),
      );
      expect(page).toContain("Account access");
      expect(page).not.toContain("Landing page");
    },
  );

  test.each(["dashboard", "urls"])(
    "sends signed-out visitors to sign-in from /%s",
    async (path) => {
      const redirectToSignIn = vi.fn(() => {
        throw new Error("Sign-in redirect");
      });
      vi.mocked(auth, { partial: true }).mockResolvedValue({
        isAuthenticated: false,
        redirectToSignIn,
      });

      await expect(
        Page({ params: Promise.resolve({ path: [path] }) }),
      ).rejects.toThrow("Sign-in redirect");
      expect(redirectToSignIn).toHaveBeenCalledOnce();
    },
  );
});
