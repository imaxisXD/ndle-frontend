"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { identifyUser } from "@/lib/posthog";
import { AppAccess, AppLoading } from "./app-access";
import { ensureGuestSession, setClaimedLinkCount } from "@/lib/guest";
import { toast } from "sonner";

const App = dynamic(() => import("@/app/static-app-shell/app"), {
  ssr: false,
  loading: AppLoading,
});

export default function StaticAppShell() {
  return (
    <AppAccess>
      <StoreUser />
      <App />
    </AppAccess>
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
  const storeUser = useMutation(api.users.store);
  const initializedRef = useRef<string | null>(null);
  const sessionRefreshKeyRef = useRef<string | null>(null);
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
    if (!user || !syncedAt) return;

    const refreshKey = `${user.id}:${syncedAt}`;
    if (sessionRefreshKeyRef.current === refreshKey) return;

    // Mark this sync version before starting the request. user.reload() updates
    // both the User object and the session token, which can re-render this
    // effect before the request continuation runs.
    sessionRefreshKeyRef.current = refreshKey;
    void user.reload().catch((error) => {
      console.error("[StoreUser] Could not refresh the account session", error);
    });
  }, [accountSync?.metadataSyncedAt, user]);

  return null;
}
