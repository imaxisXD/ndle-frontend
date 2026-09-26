import { afterEach, describe, expect, test, vi } from "vitest";
import { getFileProxyUrl } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("file proxy URL", () => {
  test("the build setting wins on every host", () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "/apiv2");
    expect(getFileProxyUrl("ndle.app")).toBe("/apiv2");
    expect(getFileProxyUrl("localhost")).toBe("/apiv2");
  });

  test("without the build setting, ndle.app uses the production route", () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "");
    expect(getFileProxyUrl("ndle.app")).toBe("/apiv2");
    expect(getFileProxyUrl("www.ndle.app")).toBe("/apiv2");
  });

  test("without the build setting, local development keeps the development proxy", () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "");
    expect(getFileProxyUrl("localhost")).toBe(
      "https://proxy-file-worker.sunny735084.workers.dev",
    );
    expect(getFileProxyUrl("")).toBe(
      "https://proxy-file-worker.sunny735084.workers.dev",
    );
  });
});
