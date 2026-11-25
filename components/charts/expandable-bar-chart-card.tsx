"use client";

import { useMemo, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-bar-charts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/base-dialog";
import { Button } from "@/components/ui/button";
import { Expand } from "iconoir-react";
import { cn } from "@/lib/utils";

interface ExpandableBarChartCardProps<T extends { clicks: number }> {
  title: string;
  description: string;
  dialogTitle: string;
  expandLabel: string;
  icon: ReactNode;
  data?: T[];
  labelKey: keyof T & string;
  labelFormatter?: (value: unknown) => string;
  emptyTitle: string;
  emptyDescription: string;
  footerLabel?: (total: number) => string;
  isLoading?: boolean;
  limit?: number;
  labelWidth?: number;
  className?: string;
}

export function ExpandableBarChartCard<T extends { clicks: number }>({
  title,
  description,
  dialogTitle,
  expandLabel,
  icon,
  data,
  labelKey,
  labelFormatter,
  emptyTitle,
  emptyDescription,
  footerLabel,
  isLoading,
  limit = 7,
  labelWidth = 132,
  className,
}: ExpandableBarChartCardProps<T>) {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice().sort((a, b) => b.clicks - a.clicks);
  }, [data]);

  const chartData = useMemo(
    () => sortedData.slice(0, limit),
    [sortedData, limit],
  );

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium">
              {icon}
              {title}
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          {sortedData.length > limit && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={expandLabel}
                    className="hover:bg-surface-hover hover:text-foreground"
                  >
                    <Expand className="h-4 w-4" aria-hidden="true" />
                  </Button>
                }
              />
              <DialogContent className="flex flex-col gap-5 sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{dialogTitle}</DialogTitle>
                </DialogHeader>
                <DialogBody className="p-2">
                  <div className="max-h-[70vh] overflow-y-auto px-2 py-4">
                    <BklitHorizontalBarChart
                      barWidth={28}
                      data={sortedData}
                      heightClassName="h-auto"
                      labelFormatter={labelFormatter}
                      labelKey={labelKey}
                      labelWidth={labelWidth}
                      style={{
                        height: `${Math.max(sortedData.length * 40, 200)}px`,
                      }}
                      valueKey="clicks"
                    />
                  </div>
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          barWidth={28}
          data={chartData}
          emptyDescription={emptyDescription}
          emptyTitle={emptyTitle}
          heightClassName="h-[280px]"
          isLoading={isLoading}
          labelFormatter={labelFormatter}
          labelKey={labelKey}
          labelWidth={labelWidth}
          valueKey="clicks"
        />
      </CardContent>
      {footerLabel && sortedData.length > 0 && (
        <CardFooter className="text-muted-foreground border-t border-border pt-3 text-xs">
          {footerLabel(sortedData.length)}
        </CardFooter>
      )}
    </Card>
  );
}
