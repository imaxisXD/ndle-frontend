"use client";

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

interface SidebarProps {
  activeView:
    | "home"
    | "analytics"
    | "settings"
    | "create"
    | "collections"
    | "memory"
    | "monitoring";
  onViewChange: (
    view:
      | "home"
      | "analytics"
      | "settings"
      | "create"
      | "collections"
      | "memory"
      | "monitoring"
  ) => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="flex h-[98vh] my-auto rounded-xl ml-4 w-16 flex-shrink-0 flex-col items-center border border-border bg-white py-6 drop-shadow-sm">
      <nav className="flex flex-1 flex-col gap-4">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={() => onViewChange("home")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "home"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("create")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "create"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("collections")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "collections"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("memory")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "memory"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("monitoring")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "monitoring"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("analytics")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "analytics"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
              <button
                type="button"
                onClick={() => onViewChange("settings")}
                className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "settings"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
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
