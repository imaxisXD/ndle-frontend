"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/shell-route/app"), { ssr: false });

export default function StaticAppShell() {
  return <App />;
}
