import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("h-lh animate-pulse rounded-sm bg-gray-200", className)}
    />
  );
}
