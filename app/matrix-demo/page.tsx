"use client";

import {
  PlusIcon,
  InfoIcon,
  CloseIcon,
  CheckIcon,
} from "@/components/ui/matrix-icons";

export default function MatrixDemoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white p-8">
      <h1 className="mb-4 text-2xl font-semibold">Matrix Icons Demo</h1>
      <p className="text-muted-foreground mb-12 text-sm">
        Reusable animated pixel icons built with the Matrix component
      </p>

      <div className="flex w-full max-w-4xl flex-col gap-16">
        {/* Static Icons Section */}
        <section>
          <h2 className="mb-6 text-lg font-medium">Static Icons</h2>
          <div className="flex flex-wrap items-center justify-center gap-12">
            <IconCard label="Plus" description="Default/neutral">
              <PlusIcon size={6} gap={1} />
            </IconCard>
            <IconCard label="Info" description="Information">
              <InfoIcon size={6} gap={1} />
            </IconCard>
            <IconCard label="Close" description="Error/delete">
              <CloseIcon size={6} gap={1} />
            </IconCard>
            <IconCard label="Check" description="Success">
              <CheckIcon size={6} gap={1} />
            </IconCard>
          </div>
        </section>

        <hr className="border-border" />

        {/* Animated Icons Section */}
        <section>
          <h2 className="mb-6 text-lg font-medium">Animated Icons</h2>
          <div className="flex flex-wrap items-center justify-center gap-12">
            <IconCard label="Plus" description="Pulsing">
              <PlusIcon size={6} gap={1} animated fps={12} />
            </IconCard>
            <IconCard label="Info" description="Pulsing">
              <InfoIcon size={6} gap={1} animated fps={12} />
            </IconCard>
            <IconCard label="Close" description="Pulsing">
              <CloseIcon size={6} gap={1} animated fps={12} />
            </IconCard>
            <IconCard label="Check" description="Drawing">
              <CheckIcon size={6} gap={1} animated fps={8} />
            </IconCard>
          </div>
        </section>

        <hr className="border-border" />

        {/* Size Variations */}
        <section>
          <h2 className="mb-6 text-lg font-medium">Size Variations</h2>
          <div className="flex flex-wrap items-end justify-center gap-8">
            <IconCard label="Small" description="size=4">
              <CheckIcon size={4} gap={1} />
            </IconCard>
            <IconCard label="Medium" description="size=6">
              <CheckIcon size={6} gap={1} />
            </IconCard>
            <IconCard label="Large" description="size=8">
              <CheckIcon size={8} gap={2} />
            </IconCard>
            <IconCard label="XL" description="size=10">
              <CheckIcon size={10} gap={2} />
            </IconCard>
          </div>
        </section>

        <hr className="border-border" />

        {/* Usage Example */}
        <section>
          <h2 className="mb-4 text-lg font-medium">Usage</h2>
          <div className="bg-muted/30 rounded-lg border p-4">
            <pre className="text-sm">
              <code>{`import { PlusIcon, InfoIcon, CloseIcon, CheckIcon } from "@/components/ui/matrix-icons";

// Static icons
<PlusIcon />
<InfoIcon size={8} gap={2} />
<CloseIcon />
<CheckIcon />

// Animated icons
<PlusIcon animated />
<InfoIcon animated fps={24} />
<CloseIcon animated />
<CheckIcon animated fps={8} />`}</code>
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

function IconCard({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
      <div className="text-center">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-muted-foreground text-xs">{description}</div>
      </div>
    </div>
  );
}
