// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
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
  test("renders the landing page on the server for a signed-out visitor", async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: false } as Awaited<
      ReturnType<typeof auth>
    >);

    const page = renderToStaticMarkup(
      await Page({ params: Promise.resolve({}) }),
    );
    expect(page).toContain("Landing page");
    expect(page).not.toContain("Account access");
  });

  test("sends a signed-in visitor directly to account access", async () => {
    vi.mocked(auth).mockResolvedValue({ isAuthenticated: true } as Awaited<
      ReturnType<typeof auth>
    >);

    const page = renderToStaticMarkup(
      await Page({ params: Promise.resolve({}) }),
    );
    expect(page).toContain("Account access");
    expect(page).not.toContain("Landing page");
  });

  test("sends signed-out visitors to sign-in for private URLs", async () => {
    const redirectToSignIn = vi.fn(() => {
      throw new Error("Sign-in redirect");
    });
    vi.mocked(auth).mockResolvedValue({
      isAuthenticated: false,
      redirectToSignIn,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await expect(
      Page({ params: Promise.resolve({ path: ["urls"] }) }),
    ).rejects.toThrow("Sign-in redirect");
    expect(redirectToSignIn).toHaveBeenCalledOnce();
  });
});
