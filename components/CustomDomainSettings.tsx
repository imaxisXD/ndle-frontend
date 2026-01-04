"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useQuery } from "convex-helpers/react/cache/hooks";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { DomainItem, AddDomainForm, UpgradePrompt } from "./custom-domain-card";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Main Custom Domain Settings component
 * Displays user's custom domains and allows adding/removing domains
 */
export function CustomDomainSettings() {
  // const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(
  //   null,
  // );
  const domains = useQuery(api.customDomains.listUserDomains);
  const limits = useQuery(api.customDomains.getDomainLimits);
  const deleteDomain = useMutation(api.customDomains.deleteDomain);
  // const verifyDomain = useMutation(api.customDomains.verifyDomain);

  // Loading state
  if (domains === undefined || limits === undefined) {
    return <CustomDomainLoadingCard />;
  }

  // Non-pro users see upgrade prompt
  if (!limits.isPro) {
    return <CustomDomainUpgradeCard />;
  }

  const handleDelete = async (domainId: Id<"custom_domains">) => {
    const result = await deleteDomain({ domainId });
    if (result.success) {
      toast.success("Domain removed");
    } else {
      toast.error(result.error || "Failed to remove domain");
    }
  };

  // const handleVerify = async (domainId: Id<"custom_domains">) => {
  //   setVerifyingDomainId(domainId);
  //   try {
  //     const result = await verifyDomain({ domainId });
  //     if (result.success) {
  //       toast.info(
  //         "Verification in progress. Status will update automatically.",
  //       );
  //     } else {
  //       toast.error(result.error || "Failed to verify domain");
  //     }
  //   } finally {
  //     setVerifyingDomainId(null);
  //   }
  // };

  return (
    <Card variant="accent" className="border-border border">
      <CardHeader>
        <CustomDomainCardTitle
          subtitle={`Use your own domain for shortened links [${limits.used}/${limits.limit} used]`}
        />
      </CardHeader>
      <CardContent>
        {domains.length > 0 ? (
          <div className="space-y-3">
            {domains.map((domain) => (
              <DomainItem
                key={domain._id}
                domain={domain}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyDomainsState />
        )}
      </CardContent>
      <CardFooter>
        {limits.canAddMore ? (
          <AddDomainForm onSuccess={() => {}} />
        ) : (
          <div className="mt-4 w-full rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center text-sm text-yellow-800">
            You&apos;ve reached the maximum of {limits.limit} custom domains.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Internal sub-components

function CustomDomainCardTitle({ subtitle }: { subtitle?: string }) {
  return (
    <CardTitle className="flex items-center gap-3 text-base font-medium">
      <div className="rounded-lg bg-sky-200 p-2">
        <GlobeHemisphereWestIcon className="h-5 w-5 text-blue-600" />
      </div>
      <div className="flex flex-col gap-0.5">
        Custom Domains
        {subtitle && (
          <CardDescription className="text-muted-foreground text-xs font-normal">
            {subtitle}
          </CardDescription>
        )}
      </div>
    </CardTitle>
  );
}

function CustomDomainLoadingCard() {
  return (
    <Card variant="accent">
      <CardHeader>
        <CustomDomainCardTitle subtitle="Loading..." />
      </CardHeader>
      <CardContent>
        <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      </CardContent>
    </Card>
  );
}

function CustomDomainUpgradeCard() {
  return (
    <Card>
      <CardHeader>
        <CustomDomainCardTitle subtitle="Use your own domain for shortened links" />
      </CardHeader>
      <CardContent>
        <UpgradePrompt />
      </CardContent>
    </Card>
  );
}

function EmptyDomainsState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
      <GlobeHemisphereWestIcon className="text-muted-foreground mx-auto h-8 w-8" />
      <p className="text-muted-foreground mt-2 text-sm">
        No custom domains added yet
      </p>
    </div>
  );
}
