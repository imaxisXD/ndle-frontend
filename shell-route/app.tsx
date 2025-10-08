import { BrowserRouter, Route, Routes } from "react-router";
import { Sidebar } from "@/components/sidebar";
import HomeRoute from "@/components/routes/HomeRoute";
import AnalyticsRoute from "@/components/routes/AnalyticsRoute";
import MonitoringRoute from "@/components/routes/MonitoringRoute";
import SettingsRoute from "@/components/routes/SettingsRoute";
import CreateRoute from "@/components/routes/CreateRoute";
import CollectionsRoute from "@/components/routes/CollectionsRoute";
import MemoryRoute from "@/components/routes/MemoryRoute";
import LinkDetailRoute from "@/components/routes/LinkDetailRoute";
import { ToastProvider } from "@/components/ui/base-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function App() {
  const queryClient = new QueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider showCloseButton={true} limit={3}>
          <div className="bg-home text-foreground dot fixed inset-0 flex overflow-hidden">
            <Sidebar />
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="p-8 lg:p-12">
                <div className="mx-auto max-w-7xl space-y-8">
                  <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/analytics" element={<AnalyticsRoute />} />
                    <Route path="/monitoring" element={<MonitoringRoute />} />
                    <Route path="/settings" element={<SettingsRoute />} />
                    <Route path="/create" element={<CreateRoute />} />
                    <Route path="/collections" element={<CollectionsRoute />} />
                    <Route path="/memory" element={<MemoryRoute />} />
                    <Route path="/link/:slug" element={<LinkDetailRoute />} />
                    <Route
                      path="*"
                      element={
                        <>
                          <h1 className="text-3xl font-medium tracking-tight">
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
              </div>
            </main>
          </div>
        </ToastProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
