import { SignUp } from "@clerk/nextjs";

import { AuthScreen, authClerkAppearance } from "@/app/_auth/auth-screen";

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
