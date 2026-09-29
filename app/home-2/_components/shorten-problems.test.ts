import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { PROBLEMS, ShortenProblem, problemFor, serverReason } from "./shorten-problems";

/* The client's view of a failed call in production: the message is redacted
   and only a ConvexError's data survives. */
function redacted(data?: string | { message: string }) {
  const message = "[CONVEX M(urlMainFuction:createGuestUrl)] [Request ID: efe472f160642575] Server Error\n  Called by client";
  if (data === undefined) return new Error(message);
  const error = new ConvexError(message);
  (error as { data: unknown }).data = data;
  return error;
}

describe("serverReason", () => {
  it("reads a string or { message } from a ConvexError's data", () => {
    expect(serverReason(redacted("Guest mode allows up to 5 links each day."))).toBe("Guest mode allows up to 5 links each day.");
    expect(serverReason(redacted({ message: "Invalid custom domain." }))).toBe("Invalid custom domain.");
  });

  it("never falls back to the redacted message", () => {
    expect(serverReason(redacted())).toBeNull();
    expect(serverReason(new Error("boom"))).toBeNull();
  });
});

describe("problemFor", () => {
  it.each([
    [
      "You already have a short link for this destination. Copy it from your links list instead.",
      { title: "You've already shortened this link.", signUp: "and ndle moves it into your account." },
    ],
    ["Guest mode allows up to 5 links each day.", { title: "You've made today's 5 guest links.", signUp: "to keep shortening." }],
    [
      "Guest links from your network reached today's limit of 10. Sign in to keep creating links.",
      { title: "Your network has made today's 10 guest links.", signUp: "to keep shortening." },
    ],
    [
      "For safety reasons, this domain has been blocked.",
      { title: "ndle doesn't shorten links to this site.", detail: "Its domain is blocked for safety reasons." },
    ],
    ["Guest session is invalid", { title: "Your guest session ran out.", detail: "Refresh the page and try again." }],
    ["Guest sessions are not configured", PROBLEMS.unavailable],
  ])("rewords %s for a guest", (reason, problem) => {
    expect(problemFor(redacted(reason))).toEqual(problem);
  });

  it("shows other server reasons as they are", () => {
    expect(problemFor(redacted("Links to localhost are not supported."))).toEqual({
      title: "Links to localhost are not supported.",
    });
  });

  it("says the server failed when there's no reason, instead of showing the raw error", () => {
    expect(problemFor(redacted())).toBe(PROBLEMS.failed);
  });

  it("passes a problem found in the browser straight through", () => {
    expect(problemFor(new ShortenProblem(PROBLEMS.connecting))).toBe(PROBLEMS.connecting);
  });
});
