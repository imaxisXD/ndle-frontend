/* eslint-disable @tanstack/query/no-unstable-deps */
"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import dynamic from "next/dynamic";
import SignInComponent from "../sign-in/[[...sign-in]]/sign-in";
import { useCallback, useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { useSession, useUser } from "@clerk/nextjs";
import { identifyUser } from "@/lib/posthog";

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
        <SignInComponent />
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
  const initializedRef = useRef(false);

  const initializeUser = useCallback(async () => {
    if (!user || initializedRef.current) return;

    try {
      // 1. Create/get Convex user - returns { id, metadataUpdated }
      const result = await storeUser();

      // 2. If metadata was updated (new user), refresh the Clerk session
      //    to get the new JWT with convex_user_id claim
      if (result.metadataUpdated) {
        // Force Clerk to fetch fresh user data with updated public_metadata
        await user.reload();
        // Force new session token to be issued with the updated claims
        // skipCache: true ensures we don't use a cached token
        if (session) {
          await session.getToken({ skipCache: true });
        }
      }

      // 3. Identify user in PostHog for analytics tracking
      identifyUser(user.id, {
        convex_id: result.id,
        clerk_user_id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        created_at: user.createdAt?.getTime(),
      });

      initializedRef.current = true;
    } catch (error) {
      console.error("[StoreUser] Error initializing user:", error);
    }
  }, [user, session, storeUser]);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  return null;
}
