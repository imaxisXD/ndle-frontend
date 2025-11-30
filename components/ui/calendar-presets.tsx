"use client";

import * as React from "react";
import { addDays, startOfToday } from "date-fns";
import { CalendarPlus, ChevronDownIcon } from "lucide-react";
import { Lock, Spark, Star } from "iconoir-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { Matcher } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/base-popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";
import { cn } from "@/lib/utils";

type Calendar19Props = {
  isPro?: boolean;
  value?: Date;
  onSelectDate?: (date: Date | undefined) => void;
  onUpgradeClick?: () => void;
  disabled?: boolean;
};

export function CalendarPreset({
  isPro = false,
  value,
  disabled,
  onSelectDate,
  onUpgradeClick,
}: Calendar19Props) {
  const [timeZone, setTimeZone] = React.useState<string | undefined>();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  // Disable:
  // - All past dates
  // - Today
  // - For free users, anything after 30 days from today
  const today = startOfToday();
  const freeMaxDate = addDays(today, 29);
  const disabledMatcher: Matcher | Matcher[] = isPro
    ? [{ before: addDays(today, 1) }] // past + today
    : [{ before: addDays(today, 1) }, { after: freeMaxDate }];

  const handleSelect = (d?: Date) => {
    onSelectDate?.(d);
  };

  const selectPreset = (daysFromToday: number | undefined) => {
    if (typeof daysFromToday !== "number") {
      return;
    }
    const base = startOfToday();
    const newDate = addDays(base, daysFromToday);
    onSelectDate?.(newDate);
  };

  const presets: Array<{
    label: string;
    value: number | undefined;
    proOnly?: boolean;
    width?: string;
  }> = [
    { label: "Tomorrow", value: 1, width: "w-28" },
    { label: "In 3 days", value: 3, width: "w-28" },
    { label: "In a week", value: 7, width: "w-28" },
    { label: "In 2 weeks", value: 14, width: "w-28" },
    { label: "In 2 months", value: 60, proOnly: true, width: "w-62" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="text-xs"
        render={
          <Button
            disabled={disabled}
            variant="outline"
            className="h-8 w-48 justify-between rounded-sm bg-white py-0 font-normal disabled:cursor-not-allowed disabled:opacity-50"
          />
        }
      >
        <span className="inline-flex w-full items-center justify-between">
          <CalendarPlus className="size-4" />
          {value ? value.toLocaleDateString() : "Select date"}
          <ChevronDownIcon className="size-4" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-sm overflow-hidden p-0"
        align="start"
        showArrow={false}
      >
        <div className="px-4 py-4">
          <div className="relative">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(d) => {
                handleSelect(d);
                if (d) setOpen(false);
              }}
              defaultMonth={value}
              timeZone={timeZone}
              disabled={disabledMatcher}
              modifiers={
                isPro
                  ? { past: { before: addDays(today, 1) } }
                  : {
                      past: { before: addDays(today, 1) },
                      afterLimit: { after: freeMaxDate },
                    }
              }
              className="bg-transparent p-0 [--cell-size:--spacing(9.5)]"
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-evenly gap-2 border-t px-1 py-4">
          {presets.map((preset) => {
            const locked = !!preset.proOnly && !isPro;
            return (
              <Tooltip key={preset.label}>
                <TooltipTrigger>
                  <Button
                    disabled={disabled || locked}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1",
                      preset.width,
                      locked
                        ? "text-accent hover- hover:text-accent bg-gradient-to-tl from-black to-black/80 opacity-50 hover:bg-gradient-to-tl hover:from-black hover:to-black/80"
                        : "",
                    )}
                    onClick={() => {
                      if (locked) {
                        console.log("locked");
                        onUpgradeClick?.();
                        setOpen(false);
                        return;
                      }
                      selectPreset(preset.value);
                      setOpen(false);
                    }}
                  >
                    <span className="inline-flex items-center gap-1.5 font-normal">
                      {locked ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <Lock
                            className="size-4 fill-amber-50/20"
                            strokeWidth={1.5}
                          />
                          <span className="font-doto roundness-100 font-black tracking-tighter">
                            [Pro Only]
                          </span>
                        </span>
                      ) : null}
                      {preset.label}
                    </span>
                  </Button>
                </TooltipTrigger>
                {locked ? (
                  <TooltipContent className="flex items-center gap-2 text-xs">
                    Pro only preset,
                    <Button size="sm" className="h-6 rounded-sm px-2">
                      <Spark className="size-4 fill-white" />
                      Upgrade to Pro
                    </Button>
                  </TooltipContent>
                ) : null}
              </Tooltip>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
