import { LinkMonitoring } from "@/components/link-monitoring";

export default function MonitoringRoute() {
  return (
    <>
      <header>
        <h1 className="font-mono text-3xl font-medium tracking-tight">
          Link Monitoring
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
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
