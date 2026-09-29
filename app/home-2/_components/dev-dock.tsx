"use client";

import { DialTimeline } from "dialkit";
import "dialkit/styles.css";

/* Development only (home-two.tsx loads it): DialKit's timeline dock, where
   the "See it in ndle" pass (your-link-takeover.tsx) is retimed and
   scrubbed. Press See it in ndle once to put its timelines in the dock. */
export default function DevDock() {
  return <DialTimeline defaultOpen={false} />;
}
