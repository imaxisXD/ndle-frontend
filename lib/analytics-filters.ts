import {
  GlobeIcon,
  DevicesIcon,
  BrowserIcon,
  DesktopIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

export type AnalyticsFilterKey = "country" | "device" | "browser" | "os" | "link";

export interface FilterConfig {
  id: AnalyticsFilterKey;
  label: string;
  icon: Icon;
}

export interface FilterOption {
  value: string;
  label: string;
}

export const FILTER_CONFIGS: readonly FilterConfig[] = [
  { id: "country", label: "Country", icon: GlobeIcon },
  { id: "device", label: "Device", icon: DevicesIcon },
  { id: "browser", label: "Browser", icon: BrowserIcon },
  { id: "os", label: "OS", icon: DesktopIcon },
  { id: "link", label: "Link", icon: LinkSimpleIcon },
] as const;
