import { NavLink } from "react-router";
import { UrlShortener } from "@/components/url-shortener";
import { UrlList } from "@/components/recent-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Brain,
  FolderPlus,
  HomeShield,
  Plus,
  ReportColumns,
} from "iconoir-react";

export default function HomeRoute() {
  return (
    <>
      <header>
        <h1
          className="font-doto roundness-100 text-5xl font-bold tracking-tight text-black"
          id="home-heading"
        >
          ndle
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Short. Sharp. Smarter.
        </p>
      </header>

      <section aria-labelledby="create-shortcut-heading">
        <h2 className="sr-only" id="create-shortcut-heading">
          Create Shortcut
        </h2>
        <UrlShortener />
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 className="sr-only" id="quick-actions-heading">
          Quick Actions
        </h2>
        <Card>
          <CardHeader className="flex flex-col items-start">
            <CardTitle className="text-sm">Quick Actions</CardTitle>
            <CardDescription className="text-sm">
              Jump into common workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  to: "/create",
                  title: "Create Link",
                  description: "Shorten a new URL",
                  Icon: Plus,
                },
                {
                  to: "/collections",
                  title: "Collections",
                  description: "Organize links by topic",
                  Icon: FolderPlus,
                },
                {
                  to: "/analytics",
                  title: "Analytics",
                  description: "View insights & stats",
                  Icon: ReportColumns,
                },
                {
                  to: "/monitoring",
                  title: "Monitoring",
                  description: "Check link health",
                  Icon: HomeShield,
                },
                {
                  to: "/memory",
                  title: "Memory",
                  description: "Summaries & notes",
                  Icon: Brain,
                },
              ].map((action) => (
                <NavLink
                  key={action.to}
                  to={action.to}
                  className="group border-border bg-background hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted rounded-md p-2">
                      <action.Icon className="text-muted-foreground h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {action.description}
                      </p>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground text-xs">
                      Open →
                    </span>
                  </div>
                </NavLink>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="recent-links-heading">
        <h2 className="sr-only" id="recent-links-heading">
          Recent Links
        </h2>
        <UrlList />
      </section>
    </>
  );
}
