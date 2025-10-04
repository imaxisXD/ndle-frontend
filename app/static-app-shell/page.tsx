"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import dynamic from "next/dynamic";
import SignInComponent from "../sign-in/[[...sign-in]]/sign-in";

const App = dynamic(() => import("@/shell-route/app"), { ssr: false });

export default function StaticAppShell() {
  return (
    <>
      <Authenticated>
        <App />
      </Authenticated>
      <Unauthenticated>
        <SignInComponent />
      </Unauthenticated>
    </>
  );
}
