import { LinkMonitoring } from "@/components/link-monitoring";

export default function MonitoringRoute() {
  return (
    <>
      <header>
        <h1 className="font-doto roundness-100 text-4xl font-black">
          Link Monitoring
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Real-time health monitoring and uptime tracking
        </p>
      </header>
      <section aria-labelledby="monitoring-section-heading">
        <h2 className="sr-only" id="monitoring-section-heading">
          Monitoring
        </h2>
        <LinkMonitoring />
      </section>
    </>
  );
}
