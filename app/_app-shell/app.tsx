import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner-toaster";
import ScrollToTop from "@/components/scroll-to-top";
import { RouteStateBoundary } from "@/components/route-state-boundary";
import { AppLoading } from "@/app/_app-shell/app-access";
import type { EmptyStateImageName } from "@/components/empty-state-image";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";

const HomeRoute = lazy(() => import("@/routes/HomeRoute"));
const UrlsRoute = lazy(() => import("@/routes/UrlsRoute"));
const AnalyticsRoute = lazy(() => import("@/routes/AnalyticsRoute"));
const MonitoringRoute = lazy(() => import("@/routes/MonitoringRoute"));
const SettingsRoute = lazy(() => import("@/routes/SettingsRoute"));
const CollectionsRoute = lazy(() => import("@/routes/CollectionsRoute"));
const LinkDetailRoute = lazy(() => import("@/routes/LinkDetailRoute"));
const CollectionDetailRoute = lazy(() => import("@/routes/CollectionDetailRoute"));

function AppRoutes() {
  const location = useLocation();

  const wrap = (
    element: ReactNode,
    boundary: {
      title: string;
      description: string;
      imageName: EmptyStateImageName;
    },
  ) => (
    <RouteStateBoundary
      resetKey={location.pathname}
      title={boundary.title}
      description={boundary.description}
      imageName={boundary.imageName}
    >
      <Suspense fallback={<AppLoading />}>{element}</Suspense>
    </RouteStateBoundary>
  );

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={wrap(<HomeRoute />, {
          title: "Dashboard could not load",
          description: "Try again. Your saved links stay safe.",
          imageName: "errorLinks",
        })}
      />
      <Route
        path="/urls"
        element={wrap(<UrlsRoute />, {
          title: "Links could not load",
          description: "Try refreshing the page. Your saved links stay safe.",
          imageName: "errorLinks",
        })}
      />
      <Route
        path="/analytics"
        element={wrap(<AnalyticsRoute />, {
          title: "Analytics could not load",
          description: "Try refreshing the page. Your links are safe.",
          imageName: "errorAnalytics",
        })}
      />
      <Route
        path="/monitoring"
        element={wrap(<MonitoringRoute />, {
          title: "Monitoring could not load",
          description: "Try refreshing the page. Monitoring will resume when the data returns.",
          imageName: "errorMonitoring",
        })}
      />
      <Route
        path="/settings"
        element={wrap(<SettingsRoute />, {
          title: "Settings could not load",
          description: "Try again in a moment.",
          imageName: "errorLinks",
        })}
      />
      <Route
        path="/collections"
        element={wrap(<CollectionsRoute />, {
          title: "Collections could not load",
          description: "Try refreshing the page. Your saved links stay safe.",
          imageName: "errorCollections",
        })}
      />
      <Route
        path="/collection/:slug"
        element={wrap(<CollectionDetailRoute />, {
          title: "Collection could not load",
          description: "Try again. Your saved links stay safe.",
          imageName: "errorCollections",
        })}
      />
      <Route
        path="/link/:slug"
        element={wrap(<LinkDetailRoute />, {
          title: "Link details could not load",
          description: "Try again. Your link keeps working.",
          imageName: "errorAnalytics",
        })}
      />
      <Route
        path="*"
        element={
          <>
            <h1 className="font-doto roundness-100 text-4xl font-black tracking-tight">
              Not Found
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
          </>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ConvexQueryCacheProvider>
      <BrowserRouter>
        <Toaster />
        <div className="bg-surface-page text-foreground dot flex min-h-screen w-full gap-4 overflow-hidden">
          <Sidebar />
          <main className="flex min-h-screen w-full min-w-0 flex-1 items-start justify-center overflow-y-auto px-4 pt-4 pb-24 md:py-8">
            <div className="flex w-full max-w-6xl flex-col space-y-8 py-4 md:px-6 md:py-8">
              <ScrollToTop />
              <AppRoutes />
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ConvexQueryCacheProvider>
  );
}
