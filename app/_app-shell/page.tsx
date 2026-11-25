"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { identifyUser } from "@/lib/posthog";
import { AppAccess, AppLoading } from "./app-access";
import { ensureGuestSession, readGuestId } from "@/lib/guest";
import { toast } from "sonner";

const App = dynamic(() => import("@/app/_app-shell/app"), {
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
 * only when metadata sync advances after mount (e.g. brand-new user or plan change).
 *
 * This ensures the JWT has the convex_user_id claim for secure file proxy auth.
 */
function StoreUser() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.store);
  const initializedRef = useRef<string | null>(null);
  const observedSyncRef = useRef<{
    userId: string;
    syncedAt: number | undefined;
  } | null>(null);
  const accountSync = useQuery(api.users.getAccountSyncState);

  const initializeUser = useCallback(async () => {
    if (!user || initializedRef.current === user.id) return;

    // Claim before awaiting so concurrent StrictMode/re-render effects cannot double-run.
    initializedRef.current = user.id;

    try {
      // Only fetch/refresh a guest session when this browser actually created guest links.
      const guestSession = readGuestId() ? await ensureGuestSession().catch(() => null) : null;
      const result = await storeUser({
        guestId: guestSession?.guestId,
        guestToken: guestSession?.guestToken,
      });

      identifyUser(user.id, {
        convex_id: result.id,
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        created_at: user.createdAt?.getTime(),
        plan: result.membership,
      });

      // A claimed guest ID can't make guest links again, so swap it only then.
      if (result.guestSessionClaimed) await ensureGuestSession(true);
      if (result.claimedLinkCount > 0) {
        toast.success(`Moved ${result.claimedLinkCount} guest links to your account.`);
      }
    } catch (error) {
      initializedRef.current = null;
      console.error("[StoreUser] Error initializing user:", error);
    }
  }, [user, storeUser]);

  useEffect(() => {
    void initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    if (!user || accountSync === undefined) return;
    const syncedAt = accountSync?.metadataSyncedAt;

    // Record the initial observed sync timestamp without forcing a Clerk reload.
    if (!observedSyncRef.current || observedSyncRef.current.userId !== user.id) {
      observedSyncRef.current = { userId: user.id, syncedAt };
      return;
    }

    const previous = observedSyncRef.current.syncedAt;
    if (syncedAt === undefined || syncedAt === previous) return;

    // Advance before calling reload() because user.reload() updates User and
    // triggers a re-render before the promise settles.
    observedSyncRef.current = { userId: user.id, syncedAt };
    void user.reload().catch((error) => {
      console.error("[StoreUser] Could not refresh the account session", error);
    });
  }, [accountSync, user]);

  return null;
}
