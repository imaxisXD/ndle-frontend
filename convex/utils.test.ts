import { describe, expect, test } from "vitest";
import { isValidHttpUrl, VALIDATION_ERRORS } from "./utils";

describe("destination URL validation", () => {
  test.each([
    "https://youtube.com/@creator",
    "https://medium.com/@author/post",
    "https://example.com/search?q=data:text/plain",
    "https://example.com/page#@section",
    "https://[2606:4700:4700::1111]/",
    "https://[::ffff:8.8.8.8]/",
  ])("allows %s", (url) => {
    expect(isValidHttpUrl(url)).toMatchObject({ valid: true, errorCode: null });
  });

  test.each([
    "https://user@example.com/",
    "https://user:secret@example.com/",
    "https://youtube.com@evil.example/@creator",
  ])("rejects embedded credentials in %s", (url) => {
    expect(isValidHttpUrl(url)).toMatchObject({
      valid: false,
      errorCode: VALIDATION_ERRORS.USERINFO_NOT_ALLOWED,
    });
  });

  test.each([
    "http://[::1]/",
    "http://[::]/",
    "http://[fd00::1]/",
    "http://[fc00::1]/",
    "http://[fe80::1]/",
    "http://[fec0::1]/",
    "http://[ff02::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[::ffff:169.254.169.254]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[::ffff:100.64.0.1]/",
    "http://[0:0:0:0:0:ffff:c0a8:101]/",
    "http://[::127.0.0.1]/",
    "http://[::ffff:0:127.0.0.1]/",
    "http://[64:ff9b::169.254.169.254]/",
  ])("rejects the internal IPv6 address %s", (url) => {
    expect(isValidHttpUrl(url).valid).toBe(false);
  });

  test.each([
    "http://127.0.0.1/",
    "http://0x7f.1/",
    "http://10.1.2.3/",
    "http://100.64.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://192.168.1.1./",
    "https://localhost./",
  ])("still rejects the internal IPv4 or local host %s", (url) => {
    expect(isValidHttpUrl(url).valid).toBe(false);
  });

  test("the scheme, not a substring, decides data: and script links", () => {
    expect(isValidHttpUrl("data:text/html,hello")).toMatchObject({
      valid: false,
      errorCode: VALIDATION_ERRORS.INVALID_PROTOCOL,
    });
    expect(isValidHttpUrl("javascript:alert(1)").valid).toBe(false);
  });
});
