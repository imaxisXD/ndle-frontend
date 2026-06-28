import { BrowserRouter, Route, Routes } from "react-router";
import { Sidebar } from "@/components/sidebar";
import HomeRoute from "@/routes/HomeRoute";
import UrlsRoute from "@/routes/UrlsRoute";
import AnalyticsRoute from "@/routes/AnalyticsRoute";
import MonitoringRoute from "@/routes/MonitoringRoute";
import SettingsRoute from "@/routes/SettingsRoute";
import CollectionsRoute from "@/routes/CollectionsRoute";
import MemoryRoute from "@/routes/MemoryRoute";
import LinkDetailRoute from "@/routes/LinkDetailRoute";
import CollectionDetailRoute from "@/routes/CollectionDetailRoute";
import { Toaster } from "@/components/ui/sonner-toaster";
import ScrollToTop from "@/components/scroll-to-top";
import { RouteStateBoundary } from "@/components/route-state-boundary";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function App() {
  const collections = useQuery(api.collectionMangament.getUserCollections);

  return (
    <ConvexQueryCacheProvider>
      <BrowserRouter>
        <Toaster />
        <div className="bg-home text-foreground dot flex min-h-screen w-full gap-4 overflow-hidden">
          <Sidebar />
          <main className="flex min-h-screen w-full flex-1 items-start justify-center overflow-y-auto px-4 py-8">
            <div className="flex w-full max-w-6xl flex-col space-y-8 px-6 py-8">
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route
                  path="/urls"
                  element={
                    <RouteStateBoundary
                      description="Try refreshing the page. Your saved links stay safe."
                      imageName="errorLinks"
                      title="Links could not load"
                    >
                      <UrlsRoute />
                    </RouteStateBoundary>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <RouteStateBoundary
                      description="Try refreshing the page. Your links are safe."
                      imageName="errorAnalytics"
                      title="Analytics could not load"
                    >
                      <AnalyticsRoute />
                    </RouteStateBoundary>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <RouteStateBoundary
                      description="Try refreshing the page. Monitoring will resume when the data returns."
                      imageName="errorMonitoring"
                      title="Monitoring could not load"
                    >
                      <MonitoringRoute />
                    </RouteStateBoundary>
                  }
                />
                <Route path="/settings" element={<SettingsRoute />} />
                <Route
                  path="/collections"
                  element={
                    <RouteStateBoundary
                      description="Try refreshing the page. Your saved links stay safe."
                      imageName="errorCollections"
                      title="Collections could not load"
                    >
                      <CollectionsRoute collections={collections} />
                    </RouteStateBoundary>
                  }
                />
                <Route
                  path="/collection/:slug"
                  element={<CollectionDetailRoute />}
                />
                <Route path="/memory" element={<MemoryRoute />} />
                <Route path="/link/:slug" element={<LinkDetailRoute />} />
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
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ConvexQueryCacheProvider>
  );
}
