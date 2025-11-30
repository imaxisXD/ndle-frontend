import { cn } from "@/lib/utils";

interface ProgressListItemProps {
  label: React.ReactNode;
  value: number;
  total?: number;
  percentage?: number;
  className?: string;
}

export function ProgressListItem({
  label,
  value,
  total,
  percentage,
  className,
}: ProgressListItemProps) {
  // Calculate width percentage if not provided
  const widthPercentage =
    percentage !== undefined
      ? percentage
      : total && total > 0
        ? (value / total) * 100
        : 0;

  return (
    <div className={cn("flex items-center gap-3.5", className)}>
      <span className="flex w-8 items-center justify-start text-sm">
        {label}
      </span>
      <div className="flex-1">
        <div className="bg-muted h-2 overflow-hidden rounded-md">
          <div
            className="bg-foreground h-full transition-all duration-500"
            style={{
              width: `${widthPercentage}%`,
            }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-xs">{value}</span>
    </div>
  );
}
