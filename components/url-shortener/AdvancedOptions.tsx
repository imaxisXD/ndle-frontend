"use client";

import { useState, type ComponentType } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { UrlFormValues } from "../url-shortener";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsiblePanel,
} from "@/components/ui/base-collapsible";
import { Switch, SwitchWrapper } from "@/components/ui/switch";
import { AnimatePresence, motion } from "motion/react";
import { OptionScheduling } from "./OptionScheduling";
import { OptionUTMBuilder } from "./OptionUTMBuilder";
import { OptionABTesting } from "./OptionABTesting";
import { OptionTargeting } from "./OptionTargeting";
import { OptionPassword } from "./OptionPassword";
import { OptionQRCode } from "./OptionQRCode";
import { OptionFallback } from "./OptionFallback";
import { OptionSocial } from "./OptionSocial";
import { OptionTagsNotes } from "./OptionTagsNotes";

// All enable keys for watching form changes
const ENABLE_KEYS = [
  "utmEnabled",
  "abEnabled",
  "passwordEnabled",
  "targetingEnabled",
  "activateAtEnabled",
  "fallbackEnabled",
  "qrEnabled",
  "socialEnabled",
  "tagsEnabled",
] as const satisfies readonly (keyof UrlFormValues)[];

type EnableKey = (typeof ENABLE_KEYS)[number];

type OptionComponent = ComponentType<{ form: UseFormReturn<UrlFormValues> }>;

type OptionItem = {
  key: string;
  label: string;
  component: OptionComponent;
  enableKey: EnableKey;
  description: string;
};

type OptionGroup = {
  title: string;
  items: OptionItem[];
};

const ENABLE_KEYS_ARRAY: EnableKey[] = [...ENABLE_KEYS];

type AdvancedOptionsProps = {
  form: UseFormReturn<UrlFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const GROUPS: OptionGroup[] = [
  {
    title: "Attribution",
    items: [
      {
        key: "utm",
        label: "UTM Builder",
        component: OptionUTMBuilder,
        enableKey: "utmEnabled",
        description: "Add campaign parameters to your link",
      },
      {
        key: "ab",
        label: "A/B Testing",
        component: OptionABTesting,
        enableKey: "abEnabled",
        description: "Split traffic between multiple destinations",
      },
    ],
  },
  {
    title: "Access & Expiration",
    items: [
      {
        key: "password",
        label: "Password Protection",
        component: OptionPassword,
        enableKey: "passwordEnabled",
        description: "Require a password to access the link",
      },
      {
        key: "targeting",
        label: "Geo & Device Targeting",
        component: OptionTargeting,
        enableKey: "targetingEnabled",
        description: "Redirect based on country or device type",
      },
    ],
  },
  {
    title: "Reliability",
    items: [
      {
        key: "schedule",
        label: "Scheduling",
        component: OptionScheduling,
        enableKey: "activateAtEnabled",
        description: "Set start and end times for link availability",
      },
      {
        key: "fallback",
        label: "Fallback URL",
        component: OptionFallback,
        enableKey: "fallbackEnabled",
        description: "Redirect if the main link is down",
      },
      {
        key: "qr",
        label: "QR Code",
        component: OptionQRCode,
        enableKey: "qrEnabled",
        description: "Generate a QR code for your link",
      },
    ],
  },
  {
    title: "Presentation",
    items: [
      {
        key: "social",
        label: "Social Previews",
        component: OptionSocial,
        enableKey: "socialEnabled",
        description: "Customize how your link looks on social media",
      },
      {
        key: "tags",
        label: "Tags & Notes",
        component: OptionTagsNotes,
        enableKey: "tagsEnabled",
        description: "Organize your links internally",
      },
    ],
  },
];

export function AdvancedOptions({
  form,
  open,
  onOpenChange,
}: AdvancedOptionsProps) {
  const [activeTab, setActiveTab] = useState("utm");

  // Watch all fields to ensure reactivity when toggling switches
  const watchedValues = useWatch<UrlFormValues>({
    control: form.control,
  });

  // Create a map of enable key -> watched value for easy lookup
  const enabledMap: Record<EnableKey, boolean> = ENABLE_KEYS_ARRAY.reduce(
    (acc, key) => {
      acc[key] = Boolean(watchedValues?.[key]);
      return acc;
    },
    {} as Record<EnableKey, boolean>,
  );

  const activeItem = GROUPS.flatMap((g) => g.items).find(
    (i) => i.key === activeTab,
  );

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsiblePanel>
        <div className="bg-muted/30 border-border mt-2 flex flex-col overflow-hidden rounded-lg border md:flex-row">
          {/* Sidebar */}
          <div className="bg-muted/10 border-border w-full shrink-0 space-y-6 border-b p-3 md:w-60 md:border-r md:border-b-0 md:p-4">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="text-muted-foreground pointer-events-none mb-3 px-1 text-xs">
                  {group.title}
                </h4>
                <div className="flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const isEnabled = enabledMap[item.enableKey];
                    const isActive = activeTab === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setActiveTab(item.key)}
                        className={cn(
                          "group text-primary relative flex items-center justify-between rounded-sm px-3 py-2 text-left text-xs font-medium transition-colors duration-200",
                          isActive
                            ? "ring-border/50 to-primary/80 bg-linear-to-tr from-black text-white shadow-sm ring-1"
                            : "hover:text-foreground hover:ring-border/50 hover:bg-white hover:ring",
                        )}
                      >
                        <span className="truncate">{item.label}</span>
                        {isEnabled && (
                          <span className="bg-primary h-1.5 w-1.5 rounded-full shadow-[0_0_4px_var(--primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-background/50 min-h-[400px] flex-1">
            <AnimatePresence mode="wait">
              {activeItem && (
                <motion.div
                  key={activeItem.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.05 }}
                  className="flex h-full flex-col p-4 md:p-6"
                >
                  <div className="border-border/50 mb-6 flex items-start justify-between border-b pb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {activeItem.label}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {activeItem.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <label
                        htmlFor={`toggle-${activeItem.key}`}
                        className="text-muted-foreground cursor-pointer text-xs font-medium"
                      >
                        {enabledMap[activeItem.enableKey]
                          ? "Enabled"
                          : "Disabled"}
                      </label>
                      <SwitchWrapper>
                        <Switch
                          id={`toggle-${activeItem.key}`}
                          size="sm"
                          checked={enabledMap[activeItem.enableKey] ?? false}
                          onCheckedChange={(checked) =>
                            form.setValue(activeItem.enableKey, checked, {
                              shouldDirty: true,
                            })
                          }
                        />
                      </SwitchWrapper>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex-1 transition-all duration-300",
                      !enabledMap[activeItem.enableKey] &&
                        "pointer-events-none opacity-50 grayscale select-none",
                    )}
                  >
                    <activeItem.component form={form} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
