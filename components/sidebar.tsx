"use client";

import { NavLink } from "react-router";
import {
  Brain,
  FolderPlus,
  HomeAlt,
  Presentation,
  Reports,
  Settings,
} from "iconoir-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";

export function Sidebar() {
  return (
    <aside className="my-auto ml-4 flex h-[90vh] w-16 flex-shrink-0 flex-col items-center rounded-sm border border-dashed border-gray-400/60 bg-white py-6 shadow-2xs">
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
            <HomeAlt className="size-5" />
          </TooltipTrigger>
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
              />
            }
          >
            <FolderPlus className="size-5" />
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
            <Brain className="size-5" />
          </TooltipTrigger>
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
              />
            }
          >
            <Reports className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Analytics</TooltipContent>
        </Tooltip>
      </nav>

      <div className="flex flex-col gap-4">
        {/* TODO: WILL ADD BACK IN LATER notification center */}
        {/* <NotificationCenter /> */}
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
            <Presentation className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Monitoring</TooltipContent>
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
            <Settings className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
