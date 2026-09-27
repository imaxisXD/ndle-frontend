import { describe, expect, it } from "vitest";
import { LinkTargetError, checkLink, parseTarget, verdictFor } from "./link-check";

/* A fake web: each address answers with a status and, for redirects, a
   Location. Requests are recorded so HEAD-then-GET can be checked. */
function fakeFetch(routes: Record<string, { status: number; location?: string } | "timeout" | "fail">) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method} ${url}`);
    const route = routes[url];
    if (route === "timeout") throw new DOMException("timed out", "TimeoutError");
    if (route === "fail" || !route) throw new TypeError("fetch failed");
    return new Response(null, { status: route.status, headers: route.location ? { location: route.location } : {} });
  }) as typeof fetch;
  return { impl, calls };
}

describe("parseTarget", () => {
  it("adds https:// to a bare address", () => {
    expect(parseTarget("example.com/page").href).toBe("https://example.com/page");
  });

  it.each([
    ["", "Paste a link to check."],
    ["ftp://example.com", "Only http and https links can be checked."],
    ["https://user:pass@example.com", "Links with a username or password in them can't be checked."],
    ["https://example.com:22", "Links on unusual ports can't be checked."],
    ["http://localhost:3000", "Links on unusual ports can't be checked."],
    ["http://localhost", "Only public websites can be checked."],
    ["http://127.0.0.1", "Only public websites can be checked."],
    ["http://192.168.1.10/admin", "Only public websites can be checked."],
    ["http://[::1]/", "Only public websites can be checked."],
    ["http://printer.local", "Only public websites can be checked."],
    ["http://intranet", "Only public websites can be checked."],
  ])("refuses %s", (input, message) => {
    expect(() => parseTarget(input)).toThrow(new LinkTargetError(message));
  });
});

describe("verdictFor", () => {
  it.each([
    [200, 100, "working"],
    [200, 4_000, "slow"],
    [404, 100, "broken"],
    [410, 100, "broken"],
    [500, 100, "broken"],
    [503, 100, "unclear"],
    [403, 100, "unclear"],
    [429, 100, "unclear"],
  ] as const)("%i in %ims is %s", (status, ms, verdict) => {
    expect(verdictFor(status, ms)).toBe(verdict);
  });
});

describe("checkLink", () => {
  it("follows redirects to the final page", async () => {
    const { impl } = fakeFetch({
      "https://ndle.fyi/k3x9qa": { status: 302, location: "https://yourcafe.com/menu" },
      "https://yourcafe.com/menu": { status: 200 },
    });
    const result = await checkLink(new URL("https://ndle.fyi/k3x9qa"), impl);
    expect(result.verdict).toBe("working");
    expect(result.finalUrl).toBe("https://yourcafe.com/menu");
    expect(result.hops.map((hop) => hop.status)).toEqual([302, 200]);
  });

  it("asks again with GET when HEAD isn't allowed", async () => {
    const answers = [405, 200];
    const calls: string[] = [];
    const impl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(init?.method));
      return new Response(null, { status: answers.shift() });
    }) as typeof fetch;
    const result = await checkLink(new URL("https://example.com/"), impl);
    expect(calls).toEqual(["HEAD", "GET"]);
    expect(result.verdict).toBe("working");
  });

  it("reports a missing page as broken", async () => {
    const { impl } = fakeFetch({ "https://example.com/gone": { status: 404 } });
    const result = await checkLink(new URL("https://example.com/gone"), impl);
    expect(result).toMatchObject({ verdict: "broken", status: 404 });
  });

  it("won't follow a redirect into a private address", async () => {
    const { impl, calls } = fakeFetch({
      "https://example.com/": { status: 301, location: "http://169.254.169.254/latest/meta-data" },
    });
    const result = await checkLink(new URL("https://example.com/"), impl);
    expect(result.verdict).toBe("broken");
    expect(result.error).toMatch(/can't be checked/);
    expect(calls).toHaveLength(1);
  });

  it("stops after too many redirects", async () => {
    const { impl } = fakeFetch({
      "https://a.example.com/": { status: 302, location: "https://b.example.com/" },
      "https://b.example.com/": { status: 302, location: "https://a.example.com/" },
    });
    const result = await checkLink(new URL("https://a.example.com/"), impl);
    expect(result.verdict).toBe("broken");
    expect(result.error).toMatch(/redirects too many times/);
    expect(result.hops).toHaveLength(11);
  });

  it("explains timeouts and failed connections", async () => {
    const slow = await checkLink(new URL("https://slow.example.com/"), fakeFetch({ "https://slow.example.com/": "timeout" }).impl);
    expect(slow).toMatchObject({ verdict: "broken", status: null, error: "The site took too long to respond." });
    const down = await checkLink(new URL("https://down.example.com/"), fakeFetch({ "https://down.example.com/": "fail" }).impl);
    expect(down.error).toMatch(/Couldn't connect/);
  });
});
