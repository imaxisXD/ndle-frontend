"use client";

import { NavLink } from "react-router";
import {
  BarChartIcon,
  FoldersPlus,
  HouseOutlineIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  SquareIcon,
} from "./icons";
import { NotificationCenter } from "./notification-center";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";

export function Sidebar() {
  return (
    <aside className="flex h-[98vh] my-auto rounded-xl ml-4 w-16 flex-shrink-0 flex-col items-center border border-border bg-white py-6 drop-shadow-sm">
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
              />
            }
          >
            <HouseOutlineIcon className="size-5" strokeWidth={1.5} />
          </TooltipTrigger>
          <TooltipContent side="right">Home</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <NavLink
                to="/create"
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              />
            }
          >
            <PlusIcon className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Create</TooltipContent>
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
              />
            }
          >
            <FoldersPlus className="size-5" strokeWidth={2} />
          </TooltipTrigger>
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
              />
            }
          >
            <SquareIcon className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Memory</TooltipContent>
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
              />
            }
          >
            <ShieldIcon className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Monitoring</TooltipContent>
        </Tooltip>
      </nav>

      <div className="flex flex-col gap-4">
        <NotificationCenter />

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
              />
            }
          >
            <BarChartIcon className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Analytics</TooltipContent>
        </Tooltip>
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
              />
            }
          >
            <SettingsIcon className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
