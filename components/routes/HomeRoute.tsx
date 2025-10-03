import { NavLink } from "react-router";
import { UrlShortener } from "@/components/url-shortener";
import { UrlList } from "@/components/url-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PlusIcon,
  FoldersPlus,
  BarChartIcon,
  ShieldIcon,
  SquareIcon,
} from "@/components/icons";

export default function HomeRoute() {
  return (
    <>
      <header>
        <h1
          className="font-doto text-4xl font-bold tracking-tight text-black"
          id="home-heading"
        >
          ndle
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
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
            <CardTitle className="font-mono">Quick Actions</CardTitle>
            <CardDescription className="font-mono">
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
                  Icon: PlusIcon,
                },
                {
                  to: "/collections",
                  title: "Collections",
                  description: "Organize links by topic",
                  Icon: FoldersPlus,
                },
                {
                  to: "/analytics",
                  title: "Analytics",
                  description: "View insights & stats",
                  Icon: BarChartIcon,
                },
                {
                  to: "/monitoring",
                  title: "Monitoring",
                  description: "Check link health",
                  Icon: ShieldIcon,
                },
                {
                  to: "/memory",
                  title: "Memory",
                  description: "Summaries & notes",
                  Icon: SquareIcon,
                },
              ].map((action) => (
                <NavLink
                  key={action.to}
                  to={action.to}
                  className="group block rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <action.Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-mono text-sm font-medium">
                        {action.title}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
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
