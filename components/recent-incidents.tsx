"use client";

import { AlertCircleIcon, CheckCircle2Icon } from "./icons";
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

      <div className="space-y-3">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="border-border bg-background flex items-start gap-4 rounded-lg border p-4"
          >
            <div className="mt-0.5 flex-shrink-0">
              {incident.type === "error" && (
                <AlertCircleIcon className="h-5 w-5 text-red-600" />
              )}
              {incident.type === "warning" && (
                <AlertCircleIcon className="h-5 w-5 text-yellow-600" />
              )}
              {incident.type === "resolved" && (
                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <code className="text-sm font-medium">{incident.link}</code>
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
              <p className="text-muted-foreground mt-1 text-sm">
                {incident.message}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {incident.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
