"use client";

import { Badge } from "@ui/badge";

export type Incident = {
  id: string;
  link: string;
  type: "error" | "warning" | "resolved";
  message: string;
  time: string;
};

export function RecentIncidents({ incidents }: { incidents: Array<Incident> }) {
  return (
    <div className="border-border bg-card rounded-xl border p-6">
      <div className="mb-6">
        <h3 className="text-base font-medium">Recent Incidents</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Latest monitoring alerts and issues
        </p>
      </div>

      {incidents.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No incidents recorded yet
        </p>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="border-border bg-background flex items-start gap-4 rounded-lg border p-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-8">
                  <div className="w-20">
                    <Badge
                      variant={
                        incident.type === "error"
                          ? "red"
                          : incident.type === "warning"
                            ? "yellow"
                            : "green"
                      }
                      label={
                        incident.type.charAt(0).toUpperCase() +
                        incident.type.slice(1)
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <code className="text-sm font-medium">{incident.link}</code>
                    <p className="text-muted-foreground text-sm">
                      {incident.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-xs">Occurred</p>
                <p className="text-muted-foreground text-xs">{incident.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
