import { ConvexError } from "convex/values";

const GUEST_TOKEN_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
export const GUEST_CREDENTIAL_COOKIE = "ndle_guest_credential";

type GuestTokenPayload = {
  v: 1;
  guestId: string;
  issuedAt: number;
  expiresAt: number;
};

function getGuestSessionSecret() {
  const secret =
    process.env.GUEST_SESSION_SECRET ||
    process.env.API_SECRET ||
    process.env.SHARED_SECRET;
  if (!secret || secret.length < 16) {
    throw new ConvexError("Guest sessions are not configured");
  }
  return secret;
}

/** Epoch milliseconds or an ISO 8601 date; anything else disables the legacy window. */
function parseLegacyAcceptUntil(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) {
    const epochMs = Number(trimmed);
    return Number.isSafeInteger(epochMs) ? epochMs : undefined;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(
      trimmed,
    )
  )
    return undefined;
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Tokens signed before GUEST_SESSION_SECRET was set used the shared fallback
 * secrets. Accept them only until GUEST_SESSION_LEGACY_ACCEPT_UNTIL so existing
 * guests are not signed out; renewal re-signs them with the dedicated secret.
 */
function getLegacyGuestSessionSecrets(primary: string): string[] {
  if (!process.env.GUEST_SESSION_SECRET) return [];
  const acceptUntil = parseLegacyAcceptUntil(
    process.env.GUEST_SESSION_LEGACY_ACCEPT_UNTIL,
  );
  if (acceptUntil === undefined || Date.now() >= acceptUntil) return [];
  return [process.env.API_SECRET, process.env.SHARED_SECRET].filter(
    (secret): secret is string =>
      !!secret && secret.length >= 16 && secret !== primary,
  );
}

function decodeBase64Url(value: string): string {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function encodeBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signPayload(
  payload: string,
  secret = getGuestSessionSecret(),
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return encodeBase64Url(signature);
}

export async function createGuestSessionToken(guestId: string) {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + GUEST_TOKEN_MAX_AGE_MS;
  const payload = new TextEncoder().encode(JSON.stringify({ v: 1, guestId, issuedAt, expiresAt }));
  const payloadPart = encodeBase64Url(payload.buffer);
  return { guestId, guestToken: `${payloadPart}.${await signPayload(payloadPart)}`, expiresAt };
}

export async function readGuestSessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) throw new ConvexError("Guest session is invalid");
  let guestId: unknown;
  try {
    guestId = (JSON.parse(decodeBase64Url(parts[0])) as GuestTokenPayload).guestId;
  } catch {
    throw new ConvexError("Guest session is invalid");
  }
  if (typeof guestId !== "string") throw new ConvexError("Guest session is invalid");
  return verifyGuestSessionToken(guestId, token);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyGuestSessionToken(
  guestId: string,
  token: string | undefined,
): Promise<string> {
  if (!token) {
    throw new ConvexError("Guest session is required");
  }

  const [payloadPart, signature, extraPart] = token.split(".");
  if (!payloadPart || !signature || extraPart !== undefined) {
    throw new ConvexError("Guest session is invalid");
  }

  const primarySecret = getGuestSessionSecret();
  let validSignature = false;
  for (const secret of [
    primarySecret,
    ...getLegacyGuestSessionSecrets(primarySecret),
  ]) {
    // Compare against every candidate so timing does not reveal which one matched.
    validSignature =
      constantTimeEqual(signature, await signPayload(payloadPart, secret)) ||
      validSignature;
  }
  if (!validSignature) {
    throw new ConvexError("Guest session is invalid");
  }

  let payload: GuestTokenPayload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadPart)) as GuestTokenPayload;
  } catch {
    throw new ConvexError("Guest session is invalid");
  }

  const now = Date.now();
  if (
    payload.v !== 1 ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.guestId) ||
    !Number.isFinite(payload.issuedAt) ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= payload.issuedAt ||
    payload.guestId !== guestId ||
    payload.expiresAt < now ||
    payload.issuedAt > now + 60_000 ||
    payload.expiresAt - payload.issuedAt > GUEST_TOKEN_MAX_AGE_MS
  ) {
    throw new ConvexError("Guest session is invalid");
  }

  return payload.guestId;
}
