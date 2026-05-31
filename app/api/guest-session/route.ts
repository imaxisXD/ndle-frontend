import { NextRequest, NextResponse } from "next/server";
import { getRateLimit } from "@/lib/rateLimit";

const GUEST_ID_COOKIE = "ndle_guest_id";
const GUEST_TOKEN_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type GuestTokenPayload = {
  v: 1;
  guestId: string;
  issuedAt: number;
  expiresAt: number;
};

function getGuestSessionSecret() {
  return (
    process.env.GUEST_SESSION_SECRET ||
    process.env.API_SECRET ||
    process.env.SHARED_SECRET ||
    ""
  );
}

function encodeBase64Url(value: string | ArrayBuffer): string {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signPayload(payload: string, secret: string): Promise<string> {
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

function getClientKey(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("fly-client-ip") ||
    "anonymous"
  );
}

async function readBody(request: NextRequest): Promise<{ guestId?: string }> {
  try {
    return (await request.json()) as { guestId?: string };
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const secret = getGuestSessionSecret();
  if (secret.length < 16) {
    return NextResponse.json(
      { error: "Guest sessions are not configured" },
      { status: 503 },
    );
  }

  const rateLimit = getRateLimit();
  const rateResult = await rateLimit.limit(`guest-session:${getClientKey(request)}`);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: "Too many guest session requests" },
      { status: 429 },
    );
  }

  const body = await readBody(request);
  const cookieGuestId = request.cookies.get(GUEST_ID_COOKIE)?.value;
  const requestedGuestId = body.guestId?.trim();
  const guestId = UUID_REGEX.test(requestedGuestId || "")
    ? requestedGuestId!
    : UUID_REGEX.test(cookieGuestId || "")
      ? cookieGuestId!
      : crypto.randomUUID();

  const issuedAt = Date.now();
  const payload: GuestTokenPayload = {
    v: 1,
    guestId,
    issuedAt,
    expiresAt: issuedAt + GUEST_TOKEN_MAX_AGE_MS,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const signature = await signPayload(payloadPart, secret);

  const response = NextResponse.json({
    guestId,
    guestToken: `${payloadPart}.${signature}`,
    expiresAt: payload.expiresAt,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(GUEST_ID_COOKIE, guestId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
