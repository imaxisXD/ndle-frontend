import { describe, expect, it } from "vitest";
import { buildUtmUrl, mixedCaseFields } from "./utm";

describe("buildUtmUrl", () => {
  it("adds the parameters, keeping the page's own query and fragment", () => {
    expect(buildUtmUrl("shop.example.com/sale?size=m#top", { utm_source: "newsletter", utm_medium: "email", utm_campaign: "spring_sale" })).toBe(
      "https://shop.example.com/sale?size=m&utm_source=newsletter&utm_medium=email&utm_campaign=spring_sale#top",
    );
  });

  it("replaces a parameter that's already there and skips empty ones", () => {
    expect(buildUtmUrl("https://example.com/?utm_source=old", { utm_source: " new ", utm_term: "  " })).toBe(
      "https://example.com/?utm_source=new",
    );
  });

  it("returns nothing for an address that isn't a web page", () => {
    expect(buildUtmUrl("", { utm_source: "x" })).toBe("");
    expect(buildUtmUrl("not a url", { utm_source: "x" })).toBe("");
    expect(buildUtmUrl("localhost", { utm_source: "x" })).toBe("");
  });
});

describe("mixedCaseFields", () => {
  it("lists the values with capitals", () => {
    expect(mixedCaseFields({ utm_source: "Facebook", utm_medium: "social", utm_campaign: "Spring" })).toEqual([
      "utm_source",
      "utm_campaign",
    ]);
  });
});
