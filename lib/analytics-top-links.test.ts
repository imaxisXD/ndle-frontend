import { expect, test } from "vitest";
import { getAnalyticsTopLinks } from "./analytics-top-links";
import { makeShortLinkWithDomain } from "./config";

test("full URL and bare slug counts resolve to one current link before ranking", () => {
  const counts = {
    "https://ndle.im/elevenricelaugh": 4,
    elevenricelaugh: 3,
    another: 6,
  };
  const slugsForLookup = getAnalyticsTopLinks(counts).map(link => link.url);
  expect(slugsForLookup).toEqual(["elevenricelaugh", "another"]);

  const [link] = getAnalyticsTopLinks(counts, [{
    slugAssigned: "elevenricelaugh",
    fullurl: "https://chanhdai.com/",
    customDomain: "go.example.com",
    _creationTime: 123,
  }]);
  expect(link).toMatchObject({ url: "elevenricelaugh", originalUrl: "https://chanhdai.com/", clicks: 7, createdAt: 123 });
  expect(makeShortLinkWithDomain(link.url, link.customDomain)).toBe("go.example.com/elevenricelaugh");
  expect(`/link/${link.url}`).toBe("/link/elevenricelaugh");
});

test("a deleted link keeps its recorded custom domain without URL query or fragment in its route", () => {
  const [link] = getAnalyticsTopLinks({ "https://go.example.com/old-link/?utm_source=test#section": 2 });
  expect(link).toMatchObject({ url: "old-link", originalUrl: "Deleted link", clicks: 2 });
  expect(makeShortLinkWithDomain(link.url, link.customDomain)).toBe("go.example.com/old-link");
});

test("malformed identifiers cannot become broken detail routes", () => {
  expect(getAnalyticsTopLinks({
    "https://ndle.im/": 9,
    "https://ndle.im/one/two": 8,
    "javascript:alert(1)": 7,
    valid_slug: 1,
  }).map(link => link.url)).toEqual(["valid_slug"]);
});
