"use client";

import { Button } from "@/components/ui/button";
import { GlobeHemisphereEastIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Upgrade prompt shown to non-Pro users
 */
export function UpgradePrompt() {
  return (
    <div className="border-border rounded-lg border bg-linear-to-br from-purple-50 to-blue-50 p-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-purple-100 p-2">
          <GlobeHemisphereEastIcon
            weight="duotone"
            className="h-6 w-6 text-purple-600"
          />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Custom Domains</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Use your own branded domain for shortened links. Upgrade to Pro to
            unlock this feature.
          </p>
          <Button className="mt-4" variant="default">
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
