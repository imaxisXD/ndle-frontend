"use client";

import {
  ArrowsClockwiseIcon,
  CloudCheckIcon,
  CloudWarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { DomainStatus } from "./types";

interface StatusBadgeProps {
  status: DomainStatus;
}

const statusConfig = {
  pending: {
    icon: null,
    label: "Verifying",
    className: "text-blue-700",
  },
  active: {
    icon: CloudCheckIcon,
    label: "Active",
    className: "text-emerald-700",
  },
  failed: {
    icon: CloudWarningIcon,
    label: "Failed",
    className: "text-red-700",
  },
} as const;

/**
 * Status badge component with spinner for pending state
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { icon: Icon, label, className } = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1 text-xs ${className}`}
    >
      {status === "pending" ? (
        <ArrowsClockwiseIcon className="h-3 w-3 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : null}
      [{label}]
    </span>
  );
}
