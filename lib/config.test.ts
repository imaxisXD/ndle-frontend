import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DEFAULT_FILE_PROXY_URL,
  getFaviconEndpoint,
  getFileProxyUrl,
  getServerFileProxyOrigin,
} from "./config";

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
    expect(getFileProxyUrl("localhost")).toBe("https://proxy-file-worker.sunny735084.workers.dev");
    expect(getFileProxyUrl("")).toBe("https://proxy-file-worker.sunny735084.workers.dev");
  });

  test("server-side file proxy origin ignores relative browser paths like /apiv2", () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "/apiv2");
    vi.stubEnv("FILE_PROXY_ORIGIN", "");
    expect(getServerFileProxyOrigin()).toBe(DEFAULT_FILE_PROXY_URL);

    vi.stubEnv("FILE_PROXY_ORIGIN", "https://proxy-override.example/custom");
    expect(getServerFileProxyOrigin()).toBe("https://proxy-override.example");

    vi.stubEnv("FILE_PROXY_ORIGIN", "");
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "https://proxy-public.example/base");
    expect(getServerFileProxyOrigin()).toBe("https://proxy-public.example");
  });

  test("browser favicon endpoint uses the unified file proxy URL", () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "/apiv2/");
    expect(getFaviconEndpoint("ndle.app")).toBe("/apiv2/favicon");
  });
});
