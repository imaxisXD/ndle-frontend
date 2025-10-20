import { BrowserRouter, Route, Routes } from "react-router";
import { Sidebar } from "@/components/sidebar";
import HomeRoute from "@/routes/HomeRoute";
import AnalyticsRoute from "@/routes/AnalyticsRoute";
import MonitoringRoute from "@/routes/MonitoringRoute";
import SettingsRoute from "@/routes/SettingsRoute";
import CollectionsRoute from "@/routes/CollectionsRoute";
import MemoryRoute from "@/routes/MemoryRoute";
import LinkDetailRoute from "@/routes/LinkDetailRoute";
import CollectionDetailRoute from "@/routes/CollectionDetailRoute";
import { ToastProvider } from "@/components/ui/base-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ScrollToTop from "@/components/scroll-to-top";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache/provider";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function App() {
  const queryClient = new QueryClient();
  const collections = useQuery(api.collectionMangament.getUserCollections);

  return (
    <ConvexQueryCacheProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ToastProvider showCloseButton={true} limit={5}>
            <div className="bg-home text-foreground dot flex w-full overflow-hidden">
              <Sidebar />
              <main className="flex min-h-0 w-full items-start justify-center overflow-y-auto">
                <div className="w-5xl flex-col space-y-8 py-8">
                  <ScrollToTop />
                  <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/analytics" element={<AnalyticsRoute />} />
                    <Route path="/monitoring" element={<MonitoringRoute />} />
                    <Route path="/settings" element={<SettingsRoute />} />
                    <Route
                      path="/collections"
                      element={<CollectionsRoute collections={collections} />}
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
          </ToastProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ConvexQueryCacheProvider>
  );
}
