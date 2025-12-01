"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ProgressListItem } from "@/components/analytics/ProgressListItem";
import { cn } from "@/lib/utils";

function getCountryFlag(countryCode: string, size: number = 4) {
  const code = (countryCode || "").slice(0, 2).toLowerCase();
  const showFlag = /^[a-z]{2}$/.test(code) && code !== "ot" && code !== "un";

  if (!showFlag) return <Globe className="text-muted-foreground size-4" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={countryCode}
      src={`/api/flag?code=${code}`}
      className={cn("shrink-0", size ? `size-${size}` : "size-4")}
    />
  );
}

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

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="border-b py-2.5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium">
              <Globe className="size-5" />
              Top Countries
            </CardTitle>
            <CardDescription className="space-between flex w-full text-xs">
              Clicks by geographic location
            </CardDescription>
          </div>
          <div className="mb-6 flex items-start justify-between">
            {topCountries.length > limit && (
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <Expand className="h-4 w-4" />
                    </Button>
                  }
                ></DialogTrigger>
                <DialogContent className="flex flex-col gap-5 sm:max-w-md">
                  <DialogHeader className="bg-transparent">
                    <DialogTitle>All Countries</DialogTitle>
                  </DialogHeader>
                  <DialogBody className="rounded-sm bg-white p-2">
                    <div className="max-h-[50vh] space-y-3.5 overflow-y-auto px-2 py-4">
                      {topCountries.map((country) => (
                        <ProgressListItem
                          key={country.country}
                          label={
                            <div
                              className="flex items-center gap-2"
                              title={country.country}
                            >
                              {getCountryFlag(country.country, 4)}
                              <span className="text-muted-foreground text-xs">
                                {country.country}
                              </span>
                            </div>
                          }
                          value={country.clicks}
                          percentage={country.percentage}
                        />
                      ))}
                    </div>
                  </DialogBody>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : topCountries.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No location data available.
          </div>
        ) : (
          <div className="space-y-3.5">
            {topCountries.slice(0, limit).map((country) => (
              <ProgressListItem
                key={country.country}
                label={
                  <div
                    className="flex items-center gap-2"
                    title={country.country}
                  >
                    {getCountryFlag(country.country)}
                    <span className="text-sm">{country.country}</span>
                  </div>
                }
                value={country.clicks}
                percentage={country.percentage}
              />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="border-border mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Total countries
              </span>
              <span className="text-sm font-medium">
                [{topCountries.length}]
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
