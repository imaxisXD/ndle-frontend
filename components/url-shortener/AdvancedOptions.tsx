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
import { OptionOrganization } from "./OptionOrganization";
import {
  Megaphone,
  Split,
  Lock,
  Globe,
  CalendarClock,
  AlertTriangle,
  QrCode,
  Share2,
  FolderOpen,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

// All enable keys for watching form changes
const ENABLE_KEYS = [
  "utmEnabled",
  "abEnabled",
  "passwordEnabled",
  "targetingEnabled",
  "activateAtEnabled",
  "expiresEnabled", // Added to watch expiresEnabled
  "fallbackEnabled",
  "qrEnabled",
  "socialEnabled",
  "tagsEnabled",
  "collectionId", // Added to watch collection
  "notes", // Added to watch notes
  "tags", // Added to watch tags
] as const satisfies readonly (keyof UrlFormValues)[];

type EnableKey = (typeof ENABLE_KEYS)[number];

type OptionComponent = ComponentType<{ form: UseFormReturn<UrlFormValues> }>;

type OptionItem = {
  key: string;
  label: string;
  component: OptionComponent;
  enableKey?: EnableKey;
  description: string;
  icon: LucideIcon;
  isActive?: (values: Partial<UrlFormValues>) => boolean;
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
        icon: Megaphone,
      },
      {
        key: "ab",
        label: "A/B Testing",
        component: OptionABTesting,
        enableKey: "abEnabled",
        description: "Split traffic between multiple destinations",
        icon: Split,
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
        icon: Lock,
      },
      {
        key: "targeting",
        label: "Geo & Device Targeting",
        component: OptionTargeting,
        enableKey: "targetingEnabled",
        description: "Redirect based on country or device type",
        icon: Globe,
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
        // No enableKey - managed internally
        isActive: (v) => !!v.activateAtEnabled || !!v.expiresEnabled,
        description: "Set start and end times for link availability",
        icon: CalendarClock,
      },
      {
        key: "fallback",
        label: "Fallback URL",
        component: OptionFallback,
        enableKey: "fallbackEnabled",
        description: "Redirect if the main link is down",
        icon: AlertTriangle,
      },
      {
        key: "qr",
        label: "QR Code",
        component: OptionQRCode,
        enableKey: "qrEnabled",
        description: "Generate a QR code for your link",
        icon: QrCode,
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
        icon: Share2,
      },
    ],
  },
  {
    title: "Organization",
    items: [
      {
        key: "tags",
        label: "Tags, Notes & Collection",
        component: OptionOrganization,
        // No enableKey - managed internally
        isActive: (v) =>
          !!v.tagsEnabled ||
          (Array.isArray(v.tags) && v.tags.length > 0) ||
          !!v.collectionId ||
          !!v.notes,
        description: "Add tags, notes, and assign to a collection",
        icon: FolderOpen,
      },
    ],
  },
];

export function AdvancedOptions({
  form,
  open,
  onOpenChange,
}: AdvancedOptionsProps) {
  // State to track which item is currently expanded
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Watch fields
  const watchedValues = useWatch<UrlFormValues>({
    control: form.control,
  });

  // Create a map of enable key -> watched value
  const enabledMap: Record<string, any> = ENABLE_KEYS_ARRAY.reduce(
    (acc, key) => {
      acc[key] = watchedValues?.[key];
      return acc;
    },
    {} as Record<string, any>,
  );

  const handleSwitchChange = (
    key: string,
    enableKey: EnableKey,
    checked: boolean,
  ) => {
    form.setValue(enableKey, checked, { shouldDirty: true });
    if (checked) {
      setExpandedKey(key);
    }
  };

  const handleRowClick = (key: string) => {
    setExpandedKey(expandedKey === key ? null : key);
  };

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsiblePanel>
        <div className="mt-4 space-y-8 pb-4">
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <h4 className="text-muted-foreground/70 px-1 text-xs font-medium tracking-wider uppercase">
                {group.title}
              </h4>
              <div className="grid gap-2">
                {group.items.map((item) => {
                  // Determine if the feature is "active" (enabled)
                  const isEnabled = item.isActive
                    ? item.isActive(enabledMap)
                    : item.enableKey
                      ? !!enabledMap[item.enableKey]
                      : false;

                  const isExpanded = expandedKey === item.key;
                  const Icon = item.icon;

                  // Determine if content should be disabled (grayed out)
                  // Only applies if there is a specific master enableKey
                  const isContentDisabled = item.enableKey && !isEnabled;

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "group overflow-hidden rounded-lg border transition-all duration-200",
                        isExpanded || isEnabled
                          ? "border-border bg-background shadow-sm"
                          : "bg-muted/30 hover:bg-muted/50 border-transparent",
                      )}
                    >
                      {/* Header Row */}
                      <div
                        className="flex cursor-pointer items-center justify-between p-3 select-none"
                        onClick={() => handleRowClick(item.key)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                              isEnabled
                                ? "bg-primary/10 text-primary"
                                : "bg-background text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium">
                              {item.label}
                            </span>
                            <span className="text-muted-foreground truncate text-xs">
                              {item.description}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 pl-3">
                          {item.enableKey && (
                            <SwitchWrapper onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) =>
                                  handleSwitchChange(
                                    item.key,
                                    item.enableKey!,
                                    checked,
                                  )
                                }
                                size="sm"
                              />
                            </SwitchWrapper>
                          )}
                          <ChevronDown
                            className={cn(
                              "text-muted-foreground size-4 transition-transform duration-200",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <div className="border-border/50 mt-2 border-t px-4 pt-0 pb-4">
                              <div
                                className={cn(
                                  "pt-4",
                                  isContentDisabled &&
                                    "pointer-events-none opacity-60 grayscale",
                                )}
                              >
                                <item.component form={form} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}
