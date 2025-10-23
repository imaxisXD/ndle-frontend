"use client";

import * as React from "react";
import { addDays, startOfToday } from "date-fns";
import { CalendarPlus, ChevronDownIcon, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [timeZone, setTimeZone] = React.useState<string | undefined>();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  React.useEffect(() => {
    setDate(value);
  }, [value]);

  const disabledMatcher = { before: startOfToday() } as const;

  const handleSelect = (d?: Date) => {
    if (!isPro) return; // custom selection is PRO-only
    setDate(d);
    onSelectDate?.(d);
  };

  const selectPreset = (daysFromToday: number | undefined) => {
    if (typeof daysFromToday !== "number") {
      // Custom preset: gate behind PRO
      if (!isPro) {
        onUpgradeClick?.();
        return;
      }
      return;
    }
    const base = startOfToday();
    const newDate = addDays(base, daysFromToday);
    setDate(newDate);
    onSelectDate?.(newDate);
  };

  const presets: Array<{ label: string; value: number | undefined }> = [
    { label: "Today", value: 0 },
    { label: "Tomorrow", value: 1 },
    { label: "In 3 days", value: 3 },
    { label: "In a week", value: 7 },
    { label: "In 2 weeks", value: 14 },
    { label: "Custom", value: undefined },
  ];

  return (
    <div className="flex flex-col gap-2">
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
            {date ? date.toLocaleDateString() : "Select date"}
            <ChevronDownIcon className="size-4" />
          </span>
        </PopoverTrigger>
        <PopoverContent className="max-w-sm overflow-hidden p-0" align="start">
          <div className="px-4 py-4">
            <div className="relative">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  handleSelect(d);
                  if (isPro && d) setOpen(false);
                }}
                defaultMonth={date}
                timeZone={timeZone}
                disabled={disabledMatcher}
                className="bg-transparent p-0 [--cell-size:--spacing(9.5)]"
              />
              {!isPro && (
                <div className="bg-background/60 pointer-events-auto absolute inset-0 flex items-center justify-center rounded-md backdrop-blur-sm">
                  <span className="flex items-center gap-2 text-sm">
                    <Lock className="size-4" /> Custom date requires {""}
                    <span className="badge-pro">PRO</span>
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t px-4 py-4">
            {presets.slice(0, 5).map((preset) => (
              <Button
                disabled={disabled || !isPro}
                key={preset.label}
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  selectPreset(preset.value);
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={disabled || !isPro}
                    onClick={() => (isPro ? undefined : onUpgradeClick?.())}
                  />
                }
              >
                <span className="inline-flex items-center">
                  {!isPro && <Lock className="mr-1 size-3" />}
                  Custom
                  {!isPro && <span className="badge-pro ml-1">PRO</span>}
                </span>
              </TooltipTrigger>
              {!isPro && (
                <TooltipContent>Custom date is a PRO feature</TooltipContent>
              )}
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
