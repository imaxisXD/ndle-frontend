"use client";

import { NavLink } from "react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";
import Link from "next/link";
import {
  BrainIcon,
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HeadsetIcon,
  HouseIcon,
  SecurityCameraIcon,
} from "@phosphor-icons/react";

export function Sidebar() {
  return (
    <aside className="my-auto ml-4 flex h-[90vh] w-16 shrink-0 flex-col items-center rounded-sm border border-dashed border-gray-400/60 bg-white py-4 shadow-2xs">
      <nav className="flex flex-1 flex-col gap-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/"
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
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Home</TooltipContent>
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
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Collections</TooltipContent>
        </Tooltip>
        <Tooltip>
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
        </Tooltip>

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
                    className="size-5"
                    weight={isActive ? "duotone" : "regular"}
                  />
                )}
              </NavLink>
            }
          ></TooltipTrigger>
          <TooltipContent side="right">Monitoring</TooltipContent>
        </Tooltip>
      </nav>

      <div className="flex flex-col gap-4">
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
              />
            }
          >
            <HeadsetIcon className="size-5 text-blue-500" weight="duotone" />
          </TooltipTrigger>
          <TooltipContent side="right">Feedback</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
