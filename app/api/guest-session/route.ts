import { NextRequest, NextResponse } from "next/server";
import { getRateLimit } from "@/lib/rateLimit";
import { createGuestSessionToken, readGuestSessionToken, GUEST_CREDENTIAL_COOKIE } from "@/convex/guestTokens";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "This request must come from this website." }, { status: 403 });
  }
  const secret = process.env.GUEST_SESSION_SECRET || process.env.API_SECRET || process.env.SHARED_SECRET || "";
  if (secret.length < 16) {
    return NextResponse.json({ error: "Guest sessions are not configured" }, { status: 503 });
  }
  const clientKey = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "anonymous";
  if (!(await getRateLimit().limit(`guest-session:${clientKey}`)).success) {
    return NextResponse.json({ error: "Too many guest session requests" }, { status: 429 });
  }
  const body: unknown = await request.json().catch(() => ({}));
  const storedToken = typeof body === "object" && body !== null && "guestToken" in body && typeof body.guestToken === "string"
    ? body.guestToken : undefined;
  const startNew = !!body && typeof body === "object" && "startNew" in body && body.startNew === true;
  const credential = startNew ? undefined : request.cookies.get(GUEST_CREDENTIAL_COOKIE)?.value || storedToken;
  let guestId: string;
  if (credential) {
    try {
      guestId = await readGuestSessionToken(credential);
    } catch {
      const response = NextResponse.json({ error: "Your guest session expired. Start a new guest session to continue.", code: "guest_session_expired" }, { status: 401 });
      response.cookies.delete(GUEST_CREDENTIAL_COOKIE);
      return response;
    }
  } else {
    // A supplied identifier is not proof of ownership. Only the server chooses new IDs.
    guestId = crypto.randomUUID();
  }
  const session = await createGuestSessionToken(guestId);
  const response = NextResponse.json(session);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(GUEST_CREDENTIAL_COOKIE, session.guestToken, {
    path: "/", maxAge: 8 * 24 * 60 * 60, sameSite: "lax", httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
