"use client";

import type { CSSProperties, ElementType } from "react";
import { usePathname } from "next/navigation";
import {
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HeadsetIcon,
  HouseIcon,
  LinkIcon,
  SecurityCameraIcon,
} from "@phosphor-icons/react";
import { DataTransferDown } from "iconoir-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SkeletonBone } from "@/components/ui/skeleton-bone";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  urlTableColumnSize,
  urlTableHeadClassName,
  urlTableStyle,
} from "@/components/url-table/column-sizes";
import { UrlTableSkeletonRows } from "@/components/url-table/UrlTableSkeletonRows";
import { PlanNote } from "@/components/url-shortener/PlanNote";
import { getShortDomain } from "@/lib/config";
import { cn } from "@/lib/utils";

// Mirrors app/static-app-shell/app.tsx, components/sidebar.tsx,
// routes/HomeRoute.tsx, components/url-shortener.tsx and the dashboard
// UrlTable box for box, so the real app replaces it without moving anything.
// If one of those layouts changes, change this file with it.

type NavItem = {
  path: string;
  Icon: ElementType<{ className?: string; weight?: "regular" | "duotone" }>;
  iconClassName?: string;
};

const primaryNav: NavItem[] = [
  { path: "/dashboard", Icon: HouseIcon },
  { path: "/urls", Icon: LinkIcon },
  { path: "/collections", Icon: FolderIcon },
  { path: "/analytics", Icon: ChartBarIcon },
  {
    path: "/monitoring",
    Icon: SecurityCameraIcon,
    iconClassName: "-scale-x-100",
  },
];

// The dashboard's UrlTable uses defaultPageSize={5}.
const DASHBOARD_LINK_ROWS = 5;

function fadeFrom(start: string) {
  return { "--skel-fade-start": start } as CSSProperties;
}

function isActivePath(pathname: string | null, path: string) {
  return pathname === path || pathname?.startsWith(`${path}/`) === true;
}

function SidebarSkeleton({ pathname }: { pathname: string | null }) {
  const navSlot = ({ path, Icon, iconClassName }: NavItem) => {
    const isActive = isActivePath(pathname, path);
    return (
      <span
        key={path}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground/60",
        )}
      >
        <Icon
          className={cn("size-5", iconClassName)}
          weight={isActive ? "duotone" : "regular"}
        />
      </span>
    );
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex h-14 flex-row items-center justify-between rounded-sm border border-dashed border-gray-400/60 bg-white px-2 shadow-2xs md:static md:my-auto md:ml-4 md:h-[65vh] md:w-16 md:shrink-0 md:flex-col md:justify-start md:px-0 md:py-2">
      <div className="flex flex-row gap-1 md:flex-1 md:flex-col md:gap-4">
        {primaryNav.map(navSlot)}
      </div>
      <div className="flex flex-row gap-1 md:flex-col md:gap-4">
        {navSlot({ path: "/settings", Icon: GearIcon })}
        <span className="flex h-10 w-10 items-center justify-center rounded-md text-blue-500/60">
          <HeadsetIcon className="size-5" weight="duotone" />
        </span>
      </div>
    </div>
  );
}

function ShortenerSkeleton() {
  const shortDomain = getShortDomain();
  return (
    <Card className="skel-frame" style={fadeFrom("82%")}>
      <CardHeader className="flex w-full flex-col items-start justify-between gap-1">
        <CardTitle className="text-lg font-medium">Shorten a Link</CardTitle>
        <CardDescription className="text-muted-foreground">
          Paste a long URL to create a short, trackable link
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-foreground text-sm leading-none font-medium">
            Enter your long link
          </span>
          <SkeletonBone className="h-9 w-full rounded-md" delay={40} />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="border-border bg-muted/20 rounded-lg border p-4">
            <div className="mb-4">
              <div className="text-muted-foreground mb-2 text-xs">Domain</div>
              <SkeletonBone className="h-8 w-28 rounded-md" delay={60} />
            </div>
            <div className="text-muted-foreground mb-3 text-xs">Link Style</div>
            {/* Static copy is real text so it wraps exactly like the form. */}
            <div className="grid gap-3">
              <div className="flex items-center gap-2">
                <SkeletonBone className="size-3.5 rounded-full" delay={80} />
                <span className="text-sm">
                  Random characters{" "}
                  <span className="text-muted-foreground text-xs">
                    (e.g. {shortDomain}/
                    <span className="text-primary px-1">a1b2c3</span>)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBone className="size-3.5 rounded-full" delay={120} />
                <span className="text-muted-foreground text-sm">
                  Readable words{" "}
                  <span className="text-muted-foreground text-xs">
                    (e.g. {shortDomain}/
                    <span className="text-primary px-1">bunnyhops</span>)
                  </span>
                  <span className="ml-2 text-[11px] tracking-wide uppercase">
                    Pro only
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <PlanNote state="loading" />
          <span className="flex h-9 items-center">
            <SkeletonBone className="h-5 w-48" delay={200} />
          </span>
          <div />
        </div>
      </CardContent>

      <CardFooter className="bg-background/80 flex-wrap justify-between gap-3 rounded-b-md border-t py-5">
        <SkeletonBone className="h-9 w-36" delay={240} />
      </CardFooter>
    </Card>
  );
}

function SkeletonColumnLabel({
  label,
  sortable = false,
}: {
  label: string;
  sortable?: boolean;
}) {
  if (!sortable) {
    return <span className="text-sm font-medium">{label}</span>;
  }
  return (
    <span className="flex items-center gap-2 text-sm font-medium">
      <span>{label}</span>
      <span className="text-muted-foreground/60 inline-flex w-4 justify-center">
        <DataTransferDown className="size-4" strokeWidth={2} />
      </span>
    </span>
  );
}

function RecentLinksSkeleton() {
  const columns = [
    {
      key: "status",
      width: urlTableColumnSize.status,
      label: <span className="pl-2 text-sm font-medium">Status</span>,
    },
    {
      key: "shortUrl",
      width: urlTableColumnSize.shortUrl,
      label: <SkeletonColumnLabel label="Short Link" />,
    },
    { key: "separator", width: urlTableColumnSize.separator, label: null },
    {
      key: "clicks",
      width: urlTableColumnSize.clicks,
      label: <SkeletonColumnLabel label="Clicks" sortable />,
    },
    {
      key: "createdAt",
      width: urlTableColumnSize.createdAt,
      label: <SkeletonColumnLabel label="Created" sortable />,
    },
    {
      key: "actions",
      width: urlTableColumnSize.actions,
      label: (
        <span className="sr-only text-sm font-medium md:not-sr-only">
          Options
        </span>
      ),
    },
  ];

  return (
    <div className="skel-frame rounded-md" style={fadeFrom("45%")}>
      <div className="border-border border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">Recent Links</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Your latest shortened links
            </p>
          </div>
        </div>
      </div>

      <div className="border-border border-b">
        <Table style={urlTableStyle}>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={urlTableHeadClassName(column.key)}
                  style={{ width: column.width }}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <UrlTableSkeletonRows rows={DASHBOARD_LINK_ROWS} delay={300} />
          </TableBody>
        </Table>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center justify-center">
          <span className="text-sm text-blue-500">[View All Links]</span>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <header className="flex flex-col items-start">
        <p className="font-doto roundness-100 text-5xl font-black tracking-tight select-none">
          ndle
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Short. Sharp. Smarter.
        </p>
      </header>
      <ShortenerSkeleton />
      <RecentLinksSkeleton />
    </>
  );
}

// Other routes get the same shell with a neutral page outline.
function PageSkeleton() {
  return (
    <>
      <header className="space-y-3">
        <SkeletonBone className="h-9 w-48" onPage />
        <SkeletonBone className="h-4 w-64" delay={40} onPage />
      </header>
      <div className="skel-frame h-[420px] rounded-md" style={fadeFrom("40%")}>
        <div className="space-y-3 border-b p-6">
          <SkeletonBone className="h-5 w-40" delay={80} />
          <SkeletonBone className="h-3.5 w-72" delay={120} />
        </div>
        <div className="space-y-4 p-6">
          {Array.from({ length: 4 }, (_, row) => (
            <SkeletonBone
              key={row}
              className="h-10 w-full rounded-md"
              delay={160 + row * 90}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function AppShellSkeleton() {
  const pathname = usePathname();

  return (
    <div
      aria-hidden="true"
      className="bg-home text-foreground dot flex min-h-screen w-full gap-4 overflow-hidden"
    >
      <SidebarSkeleton pathname={pathname} />
      <div className="flex min-h-screen w-full min-w-0 flex-1 items-start justify-center overflow-y-auto px-4 pt-4 pb-24 md:py-8">
        <div className="pointer-events-none flex w-full max-w-6xl flex-col space-y-8 py-4 select-none md:px-6 md:py-8">
          {isActivePath(pathname, "/dashboard") ? (
            <DashboardSkeleton />
          ) : (
            <PageSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
