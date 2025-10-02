"use client"

import { Link2Icon, BarChartIcon, SettingsIcon, HomeIcon, PlusIcon, GridIcon, SquareIcon, ShieldIcon } from "./icons"
import { NotificationCenter } from "./notification-center"

interface SidebarProps {
  activeView: "home" | "analytics" | "settings" | "create" | "collections" | "memory" | "monitoring"
  onViewChange: (view: "home" | "analytics" | "settings" | "create" | "collections" | "memory" | "monitoring") => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="flex h-screen w-16 flex-shrink-0 flex-col items-center border-r border-border bg-background py-6">
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
        <Link2Icon className="h-5 w-5 text-background" />
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        <button
          onClick={() => onViewChange("home")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "home"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Home"
        >
          <HomeIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewChange("create")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "create"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Create"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewChange("collections")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "collections"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Collections"
        >
          <GridIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewChange("memory")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "memory"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Memory"
        >
          <SquareIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewChange("monitoring")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "monitoring"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Monitoring"
        >
          <ShieldIcon className="h-5 w-5" />
        </button>
      </nav>

      <div className="flex flex-col gap-4">
        <NotificationCenter />

        <button
          onClick={() => onViewChange("analytics")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "analytics"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Analytics"
        >
          <BarChartIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => onViewChange("settings")}
          className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
            activeView === "settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  )
}
