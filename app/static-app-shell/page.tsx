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
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";

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

function StoreUser() {
  const { user } = useUser();
  const storeUser = useMutation(api.users.store);

  useEffect(() => {
    async function createUser() {
      await storeUser();
    }
    createUser();
  }, [storeUser, user?.id]);

  return null;
}
