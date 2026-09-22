"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/base-dialog";
import { Button } from "@/components/ui/button";
import { Expand, Globe } from "iconoir-react";

import { cn, countryCodeToName } from "@/lib/utils";

export function CountryChart({
  data,
  isLoading,
  limit = 7,
  className,
}: {
  data?: Array<{ country: string; clicks: number }>;
  isLoading?: boolean;
  limit?: number;
  className?: string;
}) {
  const topCountries = useMemo(() => {
    if (!data || data.length === 0) return [];

    const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

    return data
      .slice()
      .sort((a, b) => b.clicks - a.clicks)
      .map((item) => ({
        country: item.country,
        clicks: item.clicks,
        percentage:
          totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0,
      }));
  }, [data]);

  const chartData = useMemo(() => {
    return topCountries.slice(0, limit);
  }, [topCountries, limit]);

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium">
              <Globe className="size-5" />
              Top Countries
            </CardTitle>
            <CardDescription className="text-xs">
              Clicks by geographic location
            </CardDescription>
          </div>
          {topCountries.length > limit && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted hover:text-foreground"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="flex flex-col gap-5 sm:max-w-2xl">
                <DialogHeader className="bg-transparent">
                  <DialogTitle>All Countries</DialogTitle>
                </DialogHeader>
                <DialogBody className="bg-card rounded-sm p-2">
                  <div className="max-h-[70vh] overflow-y-auto px-2 py-4">
                    <BklitHorizontalBarChart
                      barWidth={28}
                      data={topCountries}
                      heightClassName="h-auto"
                      labelFormatter={(value) =>
                        countryCodeToName(String(value))
                      }
                      labelKey="country"
                      labelWidth={132}
                      style={{
                        height: `${Math.max(topCountries.length * 40, 200)}px`,
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
          emptyDescription="No location data available."
          emptyTitle="No location data"
          heightClassName="h-[280px]"
          isLoading={isLoading}
          labelFormatter={(value) => countryCodeToName(String(value))}
          labelKey="country"
          labelWidth={132}
          valueKey="clicks"
        />
      </CardContent>
      {!isLoading && chartData.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 pt-4 text-sm">
          <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
            <span>Total countries</span>
            <span className="text-foreground font-medium">
              [{topCountries.length}]
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
