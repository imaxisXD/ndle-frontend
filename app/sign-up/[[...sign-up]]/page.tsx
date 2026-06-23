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
        forceRedirectUrl="/static-app-shell"
        fallbackRedirectUrl="/static-app-shell"
        signInUrl="/sign-in"
        signInForceRedirectUrl="/static-app-shell"
        signInFallbackRedirectUrl="/static-app-shell"
        appearance={authClerkAppearance}
      />
    </AuthScreen>
  );
}
