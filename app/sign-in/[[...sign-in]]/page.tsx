import type { Metadata } from "next";
import SignInComponent from "./sign-in";

// A sign-in form has nothing for search results, and it shouldn't compete with
// the home page for the brand name.
export const metadata: Metadata = {
  title: "Sign in | ndle",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <SignInComponent />;
}
