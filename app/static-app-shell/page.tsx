"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useSession, useUser } from "@clerk/nextjs";
import { identifyUser } from "@/lib/posthog";
import { PublicHome } from "@/components/PublicHome";
import { ensureGuestSession, setClaimedLinkCount } from "@/lib/guest";
import { toast } from "sonner";

const App = dynamic(() => import("@/app/static-app-shell/app"), { ssr: false });

export default function StaticAppShell() {
  return (
    <>
      <AuthLoading>
        <App />
      </AuthLoading>
      <Authenticated>
        <StoreUser />
        <App />
      </Authenticated>
      <Unauthenticated>
        <PublicHome />
      </Unauthenticated>
    </>
  );
}

/**
 * StoreUser component - creates/updates Convex user and refreshes Clerk session
 * if metadata was updated (new user).
 *
 * This ensures the JWT has the convex_user_id claim for secure file proxy auth.
 */
function StoreUser() {
  const { user } = useUser();
  const { session } = useSession();
  const storeUser = useMutation(api.users.store);
  const initializedRef = useRef<string | null>(null);
  const refreshedAtRef = useRef<number | undefined>(undefined);
  const accountSync = useQuery(api.users.getAccountSyncState);

  const initializeUser = useCallback(async () => {
    if (!user || initializedRef.current === user.id) return;

    try {
      // 1. Create/get Convex user - returns { id, metadataUpdated }
      const guestSession = await ensureGuestSession().catch(() => null);
      const result = await storeUser({
        guestId: guestSession?.guestId,
        guestToken: guestSession?.guestToken,
      });

      // 3. Identify user in PostHog for analytics tracking
      identifyUser(user.id, {
        convex_id: result.id,
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        created_at: user.createdAt?.getTime(),
        plan: result.membership,
      });

      await ensureGuestSession(true);
      if (result.claimedLinkCount > 0) {
        setClaimedLinkCount(result.claimedLinkCount);
        toast.success(`Moved ${result.claimedLinkCount} guest links to your account.`);
      }

      initializedRef.current = user.id;
    } catch (error) {
      console.error("[StoreUser] Error initializing user:", error);
    }
  }, [user, storeUser]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    const syncedAt = accountSync?.metadataSyncedAt;
    if (!user || !syncedAt || refreshedAtRef.current === syncedAt) return;
    let canceled = false;
    void (async () => {
      try {
        await user.reload();
        await session?.getToken({ skipCache: true });
        if (!canceled) refreshedAtRef.current = syncedAt;
      } catch (error) {
        console.error("[StoreUser] Could not refresh the account session", error);
      }
    })();
    return () => { canceled = true; };
  }, [accountSync?.metadataSyncedAt, user, session]);

  return null;
}
