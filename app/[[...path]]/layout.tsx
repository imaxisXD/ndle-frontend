import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

/* The app shell reads the request's auth state on its first render
   (app-access.tsx), so only this route opts into dynamic Clerk data, as Clerk's
   rendering-modes guide recommends. Nested under the root provider, this one
   only supplies that initial state. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <ClerkProvider dynamic>{children}</ClerkProvider>;
}
