"use client";

import { AccountCard } from "./account-card";
import { CustomDomainSettings } from "./CustomDomainSettings";

export function Settings() {
  return (
    <div className="space-y-6">
      <AccountCard />
      <CustomDomainSettings />
    </div>
  );
}
