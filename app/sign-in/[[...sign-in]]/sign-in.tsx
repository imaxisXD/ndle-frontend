import { SignIn } from "@clerk/nextjs";

import { AuthScreen, authClerkAppearance } from "@/app/_auth/auth-screen";

export default function SignInComponent() {
  return (
    <AuthScreen
      title="Log in"
      subtitle="Use your account to open your links, monitoring, and analytics."
      switchText="Need an account?"
      switchHref="/sign-up"
      switchLabel="Create one"
    >
      <SignIn
        redirectUrl="/static-app-shell"
        afterSignInUrl="/static-app-shell"
        signUpUrl="/sign-up"
        afterSignUpUrl="/static-app-shell"
        appearance={authClerkAppearance}
      />
    </AuthScreen>
  );
}
