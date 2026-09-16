import type { Metadata } from "next";
import { LandingV2 } from "./LandingV2";

export const metadata: Metadata = {
  title: "ndle — the link workspace",
  description:
    "Every link, watched. Short. Sharp. Smarter. — the intelligent URL shortener with real-time analytics and uptime monitoring.",
};

export default function LandingV2Page() {
  return <LandingV2 />;
}
