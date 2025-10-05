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

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider showCloseButton={true} limit={3}>
        <div className="fixed inset-0 flex bg-home text-foreground overflow-hidden dot">
          <Sidebar />
          <main className="flex-1 overflow-y-auto min-h-0">
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
                        <h1 className="font-mono text-3xl font-medium tracking-tight">
                          Not Found
                        </h1>
                        <p className="mt-2 font-mono text-sm text-muted-foreground">
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
    </BrowserRouter>
  );
}
