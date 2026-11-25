import { ConvexError } from "convex/values";
import {
  GUEST_CREDENTIAL_COOKIE,
  GuestTokenError,
  createGuestSessionToken as createGuestSessionTokenRaw,
  deriveGuestNetworkKey as deriveGuestNetworkKeyRaw,
  readGuestSessionToken as readGuestSessionTokenRaw,
  verifyGuestSessionCredential as verifyGuestSessionCredentialRaw,
  verifyGuestSessionToken as verifyGuestSessionTokenRaw,
  type VerifiedGuestSession,
} from "../lib/guest-token";

export { GUEST_CREDENTIAL_COOKIE, type VerifiedGuestSession };

function toConvexError(error: unknown): never {
  if (error instanceof GuestTokenError) {
    throw new ConvexError(error.message);
  }
  throw error;
}

export async function deriveGuestNetworkKey(clientIp: string): Promise<string> {
  try {
    return await deriveGuestNetworkKeyRaw(clientIp);
  } catch (error) {
    toConvexError(error);
  }
}

export async function createGuestSessionToken(guestId: string, networkKey?: string) {
  try {
    return await createGuestSessionTokenRaw(guestId, networkKey);
  } catch (error) {
    toConvexError(error);
  }
}

export async function readGuestSessionToken(token: string) {
  try {
    return await readGuestSessionTokenRaw(token);
  } catch (error) {
    toConvexError(error);
  }
}

export async function verifyGuestSessionToken(
  guestId: string,
  token: string | undefined,
): Promise<string> {
  try {
    return await verifyGuestSessionTokenRaw(guestId, token);
  } catch (error) {
    toConvexError(error);
  }
}

export async function verifyGuestSessionCredential(
  guestId: string,
  token: string | undefined,
): Promise<VerifiedGuestSession> {
  try {
    return await verifyGuestSessionCredentialRaw(guestId, token);
  } catch (error) {
    toConvexError(error);
  }
}
