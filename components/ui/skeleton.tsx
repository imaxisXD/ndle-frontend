import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div className={cn("h-lh animate-pulse rounded-sm bg-gray-200", className)}>
      {children}
    </div>
  );
}
