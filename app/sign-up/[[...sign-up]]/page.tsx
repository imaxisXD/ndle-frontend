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
        redirectUrl="/static-app-shell"
        afterSignUpUrl="/static-app-shell"
        signInUrl="/sign-in"
        afterSignInUrl="/static-app-shell"
        appearance={authClerkAppearance}
      />
    </AuthScreen>
  );
}
