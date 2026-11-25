"use client";

import { NavLink } from "react-router";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";
import {
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HeadsetIcon,
  HouseIcon,
  LinkIcon,
  SecurityCameraIcon,
  type Icon,
} from "@phosphor-icons/react";

const PRIMARY_NAV_ITEMS: Array<{
  to: string;
  label: string;
  Icon: Icon;
  iconClassName?: string;
}> = [
  { to: "/dashboard", label: "Dashboard", Icon: HouseIcon },
  { to: "/urls", label: "URLs", Icon: LinkIcon },
  { to: "/collections", label: "Collections", Icon: FolderIcon },
  { to: "/analytics", label: "Analytics", Icon: ChartBarIcon },
  {
    to: "/monitoring",
    label: "Monitoring",
    Icon: SecurityCameraIcon,
    iconClassName: "-scale-x-100",
  },
];

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  }`;

export function Sidebar() {
  return (
    <aside className="bg-surface-raised shadow-raised fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex h-14 flex-row items-center justify-between rounded-sm border border-dashed border-gray-400/60 px-2 md:static md:my-auto md:ml-4 md:h-[65vh] md:w-16 md:shrink-0 md:flex-col md:justify-start md:px-0 md:py-2">
      <nav
        aria-label="Primary navigation"
        className="flex flex-row gap-1 md:flex-1 md:flex-col md:gap-4"
      >
        {PRIMARY_NAV_ITEMS.map(({ to, label, Icon, iconClassName }) => (
          <Tooltip key={to}>
            <TooltipTrigger
              render={
                <NavLink
                  to={to}
                  aria-label={label}
                  className={navLinkClassName}
                >
                  {({ isActive }) => (
                    <Icon
                      className={iconClassName ? `size-5 ${iconClassName}` : "size-5"}
                      weight={isActive ? "duotone" : "regular"}
                      aria-hidden="true"
                    />
                  )}
                </NavLink>
              }
            />
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </nav>

      <div className="flex flex-row gap-1 md:flex-col md:gap-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/settings"
                aria-label="Settings"
                className={navLinkClassName}
              >
                {({ isActive }) => (
                  <GearIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          />
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="https://ndles.userjot.com/?cursor=1&order=top&limit=10"
                target="_blank"
                rel="noopener"
                aria-label="Feedback"
                className="text-muted-foreground hover:text-accent-foreground flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-blue-500/20"
              >
                <HeadsetIcon
                  className="size-5 text-blue-500"
                  weight="duotone"
                  aria-hidden="true"
                />
              </Link>
            }
          />
          <TooltipContent side="right">Feedback</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
