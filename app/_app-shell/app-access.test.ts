// @vitest-environment node

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { AppAccess } from "./app-access";

vi.mock("@clerk/nextjs", () => ({ useAuth: vi.fn() }));
vi.mock("convex/react", () => ({ useConvexAuth: vi.fn() }));

const renderPrivatePage = vi.fn(() =>
  createElement("h1", null, "Your saved links"),
);

function renderPage() {
  return renderToStaticMarkup(
    createElement(AppAccess, null, createElement(renderPrivatePage)),
  );
}

describe("account access", () => {
  beforeEach(() => vi.clearAllMocks());

  test.each([
    {
      name: "Clerk is loading",
      isLoaded: false,
      isSignedIn: undefined,
      isLoading: true,
      isAuthenticated: false,
    },
    {
      name: "Convex is checking access",
      isLoaded: true,
      isSignedIn: true,
      isLoading: true,
      isAuthenticated: false,
    },
    {
      name: "sign-out is updating the page",
      isLoaded: true,
      isSignedIn: false,
      isLoading: false,
      isAuthenticated: true,
    },
  ] as const)("never renders private content while $name", (state) => {
    vi.mocked(useAuth, { partial: true }).mockReturnValue(state);
    vi.mocked(useConvexAuth).mockReturnValue({ ...state, isRefreshing: false });

    expect(renderPage()).toContain("Loading your account");
    expect(renderPrivatePage).not.toHaveBeenCalled();
  });

  test("keeps a failed Convex check separate from signing out", () => {
    vi.mocked(useAuth, { partial: true }).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    vi.mocked(useConvexAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      isRefreshing: false,
    });

    const page = renderPage();
    expect(page).toContain("You are signed in");
    expect(page).toContain("Try again");
    expect(renderPrivatePage).not.toHaveBeenCalled();
  });

  test("renders private content only after both checks pass", () => {
    vi.mocked(useAuth, { partial: true }).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    vi.mocked(useConvexAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      isRefreshing: false,
    });

    expect(renderPage()).toContain("Your saved links");
    expect(renderPrivatePage).toHaveBeenCalledOnce();
  });
});
