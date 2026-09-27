import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

import { AuthScreen, authClerkAppearance } from "@/app/_auth/auth-screen";

// See the sign-in page: out of search results, with its own title.
export const metadata: Metadata = {
  title: "Create your account | ndle",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <AuthScreen
      title="Create account"
      subtitle="Start with free short links, custom domain setup, and link checks."
      switchText="Already have an account?"
      switchHref="/sign-in"
      switchLabel="Log in"
    >
      <SignUp
        fallbackRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        signInFallbackRedirectUrl="/dashboard"
        appearance={authClerkAppearance}
      />
    </AuthScreen>
  );
}
