const GUEST_ID_STORAGE_KEY = "ndle_guest_id";
const GUEST_TOKEN_STORAGE_KEY = "ndle_guest_token";
const GUEST_ID_COOKIE = "ndle_guest_id";
const CLAIMED_COUNT_KEY = "ndle_claimed_link_count";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GuestSession = {
  guestId: string;
  guestToken: string;
  expiresAt: number;
};

function writeGuestCookie(guestId: string) {
  document.cookie = `${GUEST_ID_COOKIE}=${guestId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function isGuestId(value: string | undefined): value is string {
  return !!value && UUID_REGEX.test(value);
}

export function readGuestId() {
  if (typeof window === "undefined") {
    return "";
  }

  const localValue = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (localValue && isGuestId(localValue)) {
    writeGuestCookie(localValue);
    return localValue;
  }
  window.localStorage.removeItem(GUEST_ID_STORAGE_KEY);

  const cookieValue = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${GUEST_ID_COOKIE}=`))
    ?.split("=")[1];

  if (isGuestId(cookieValue)) {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, cookieValue);
    return cookieValue;
  }

  return "";
}

export function readGuestSession(): GuestSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const guestId = readGuestId();
  const guestToken = window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
  if (!guestId || !guestToken) {
    return null;
  }

  return { guestId, guestToken, expiresAt: 0 };
}

export async function ensureGuestSession(): Promise<GuestSession> {
  if (typeof window === "undefined") {
    throw new Error("Guest sessions are only available in the browser");
  }

  const existingGuestId = readGuestId();
  const response = await fetch("/api/guest-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestId: existingGuestId || undefined }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Guest session could not be created");
  }

  const session = (await response.json()) as GuestSession;
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, session.guestId);
  window.localStorage.setItem(GUEST_TOKEN_STORAGE_KEY, session.guestToken);
  writeGuestCookie(session.guestId);
  return session;
}

export function setClaimedLinkCount(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  if (count > 0) {
    window.sessionStorage.setItem(CLAIMED_COUNT_KEY, String(count));
  } else {
    window.sessionStorage.removeItem(CLAIMED_COUNT_KEY);
  }
}

export function consumeClaimedLinkCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  const value = window.sessionStorage.getItem(CLAIMED_COUNT_KEY);
  window.sessionStorage.removeItem(CLAIMED_COUNT_KEY);
  return value ? Number(value) : 0;
}
