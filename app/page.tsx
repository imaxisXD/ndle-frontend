import { HOME_METADATA, HomePage } from "@/app/home-2/_components/home-page";

// The home page, prerendered at build: it reads no request data, so
// Cloudflare serves it from the static cache. Signed-in state loads in the
// browser (the nav's Dashboard button).
export const metadata = HOME_METADATA;

export default function Page() {
  return <HomePage />;
}
