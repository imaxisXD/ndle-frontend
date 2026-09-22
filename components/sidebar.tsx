"use client";

import { NavLink } from "react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";
import Link from "next/link";
import {
  // BrainIcon,
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HeadsetIcon,
  HouseIcon,
  LinkIcon,
  SecurityCameraIcon,
} from "@phosphor-icons/react";

export function Sidebar() {
  return (
    <aside className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex h-14 flex-row items-center justify-between rounded-sm border border-dashed border-gray-400/60 bg-white px-2 shadow-2xs md:static md:my-auto md:ml-4 md:h-[65vh] md:w-16 md:shrink-0 md:flex-col md:justify-start md:px-0 md:py-2">
      <nav className="flex flex-row gap-1 md:flex-1 md:flex-col md:gap-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/dashboard"
                aria-label="Dashboard"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <HouseIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Dashboard</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/urls"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <LinkIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">URLs</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/collections"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <FolderIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Collections</TooltipContent>
        </Tooltip>

        {/**TODO: WILL ADD BACK IN LATER */}
        {/* <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/memory"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <BrainIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Memory</TooltipContent>
        </Tooltip> */}

        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/analytics"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <ChartBarIcon
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          />
          <TooltipContent side="right">Analytics</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/monitoring"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {({ isActive }) => (
                  <SecurityCameraIcon
                    className="size-5 -scale-x-100"
                    weight={isActive ? "duotone" : "regular"}
                    aria-hidden="true"
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Monitoring</TooltipContent>
        </Tooltip>
      </nav>

      <div className="flex flex-row gap-1 md:flex-col md:gap-4">
        {/* TODO: WILL ADD BACK IN LATER notification center */}
        {/* <NotificationCenter /> */}

        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
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
          ></TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="https://ndles.userjot.com/?cursor=1&order=top&limit=10"
                target="_blank"
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
