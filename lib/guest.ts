const GUEST_ID_STORAGE_KEY = "ndle_guest_id";
const GUEST_ID_COOKIE = "ndle_guest_id";
const CLAIMED_COUNT_KEY = "ndle_claimed_link_count";

function writeGuestCookie(guestId: string) {
  document.cookie = `${GUEST_ID_COOKIE}=${guestId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function readGuestId() {
  if (typeof window === "undefined") {
    return "";
  }

  const localValue = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  if (localValue) {
    writeGuestCookie(localValue);
    return localValue;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${GUEST_ID_COOKIE}=`))
    ?.split("=")[1];

  if (cookieValue) {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, cookieValue);
    return cookieValue;
  }

  return "";
}

export function getOrCreateGuestId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = readGuestId();
  if (existing) {
    return existing;
  }

  const nextGuestId = crypto.randomUUID();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, nextGuestId);
  writeGuestCookie(nextGuestId);
  return nextGuestId;
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

