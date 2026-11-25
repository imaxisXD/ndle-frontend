// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Page from "./page";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/app/_app-shell/page", () => ({
  default: () => createElement("h1", null, "Account access"),
}));

const appParams = (path: string[]) => ({
  params: Promise.resolve({ path }),
});

// Every path except "/" (app/page.tsx) lands here: /dashboard, /urls, /link/…
describe("app pages", () => {
  beforeEach(() => vi.clearAllMocks());

  test("open the app for a signed-in visitor", async () => {
    vi.mocked(auth, { partial: true }).mockResolvedValue({
      isAuthenticated: true,
    });

    expect(
      renderToStaticMarkup(await Page(appParams(["dashboard"]))),
    ).toContain("Account access");
    expect(
      renderToStaticMarkup(await Page(appParams(["link", "my-slug"]))),
    ).toContain("Account access");
  });

  test("send signed-out visitors to sign-in", async () => {
    const redirectToSignIn = vi.fn(() => {
      throw new Error("Sign-in redirect");
    });
    vi.mocked(auth, { partial: true }).mockResolvedValue({
      isAuthenticated: false,
      redirectToSignIn,
    });

    await expect(Page(appParams(["dashboard"]))).rejects.toThrow(
      "Sign-in redirect",
    );
    expect(redirectToSignIn).toHaveBeenCalledOnce();
  });

  test("return 404 for unknown paths before checking auth", async () => {
    await expect(Page(appParams(["does-not-exist"]))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    await expect(Page(appParams(["dashboard", "extra"]))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFound).toHaveBeenCalledTimes(2);
    expect(auth).not.toHaveBeenCalled();
  });
});
