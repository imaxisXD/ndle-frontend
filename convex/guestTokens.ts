import { ConvexError } from "convex/values";

const GUEST_TOKEN_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

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

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getGuestSessionSecret()),
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

  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    throw new ConvexError("Guest session is invalid");
  }

  const expectedSignature = await signPayload(payloadPart);
  if (!constantTimeEqual(signature, expectedSignature)) {
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
    payload.guestId !== guestId ||
    payload.expiresAt < now ||
    payload.issuedAt > now + 60_000 ||
    payload.expiresAt - payload.issuedAt > GUEST_TOKEN_MAX_AGE_MS
  ) {
    throw new ConvexError("Guest session is invalid");
  }

  return payload.guestId;
}
