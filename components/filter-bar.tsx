"use client";

import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-select";
import { cn } from "@/lib/utils";
import {
  CalendarDotIcon,
  XIcon,
  PlusIcon,
  CheckIcon,
  CaretRightIcon,
  FunnelIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/base-popover";
import { FILTER_CONFIGS } from "@/lib/analytics-filters";
import { Button } from "./ui/button";

// --- Types ---

interface FilterBarProps {
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  timeRangeOptions?: Array<{
    value: string;
    label: string;
    displayValue: string;
  }>;
  linkFilter?: string;
  onLinkFilterChange?: (value: string) => void;
  linkOptions?: Array<{ value: string; label: string }>;
  countryFilter?: string;
  onCountryFilterChange?: (value: string) => void;
  countryOptions?: Array<{ value: string; label: string }>;
  deviceFilter?: string;
  onDeviceFilterChange?: (value: string) => void;
  deviceOptions?: Array<{ value: string; label: string }>;
  browserFilter?: string;
  onBrowserFilterChange?: (value: string) => void;
  browserOptions?: Array<{ value: string; label: string }>;
  osFilter?: string;
  onOSFilterChange?: (value: string) => void;
  osOptions?: Array<{ value: string; label: string }>;
  excludeBots?: boolean;
  onExcludeBotsChange?: (value: boolean) => void;
  className?: string;
}

// --- Sub-components ---

interface FilterPillProps {
  label: string;
  valueLabel: string;
  icon: React.ElementType;
  onRemove: () => void;
}

function FilterPill({
  label,
  valueLabel,
  icon: Icon,
  onRemove,
}: FilterPillProps) {
  return (
    <div className="group border-border flex items-center justify-between gap-2 rounded-sm border bg-linear-to-tr from-black to-black/70 px-2 py-1 text-xs shadow-sm">
      <div className="flex items-center gap-1">
        <Icon className="size-3 text-zinc-300" weight="duotone" />
        <span className="text-xs text-zinc-300">{label}:</span>
      </div>
      <span
        className="max-w-[150px] truncate text-xs font-medium text-zinc-100"
        title={valueLabel}
      >
        {valueLabel}
      </span>
      <Button
        size="xs"
        onClick={onRemove}
        variant="ghost"
        className="rounded-xs text-red-400"
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
}

// --- Main Component ---

export function FilterBar({
  timeRange = "30d",
  onTimeRangeChange,
  timeRangeOptions = [
    { value: "24h", label: "Last 24 hours", displayValue: "Last 24 hours" },
    { value: "7d", label: "Last 7 days", displayValue: "Last 7 days" },
    { value: "30d", label: "Last 30 days", displayValue: "Last 30 days" },
    { value: "3m", label: "Last 3 months", displayValue: "Last 3 months" },
    { value: "12m", label: "Last 12 months", displayValue: "Last 12 months" },
    { value: "mtd", label: "Month to Date", displayValue: "Month to Date" },
    { value: "qtd", label: "Quarter to Date", displayValue: "Quarter to Date" },
    { value: "ytd", label: "Year to Date", displayValue: "Year to Date" },
    { value: "all", label: "All Time", displayValue: "All Time" },
  ],
  linkFilter = "all",
  onLinkFilterChange,
  linkOptions = [{ value: "all", label: "All Links" }],
  countryFilter = "all",
  onCountryFilterChange,
  countryOptions = [{ value: "all", label: "All Countries" }],
  deviceFilter = "all",
  onDeviceFilterChange,
  deviceOptions = [{ value: "all", label: "All Devices" }],
  browserFilter = "all",
  onBrowserFilterChange,
  browserOptions = [{ value: "all", label: "All Browsers" }],
  osFilter = "all",
  onOSFilterChange,
  osOptions = [{ value: "all", label: "All OS" }],
  className,
}: FilterBarProps) {
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const clearAllFilters = () => {
    onLinkFilterChange?.("all");
    onCountryFilterChange?.("all");
    onDeviceFilterChange?.("all");
    onBrowserFilterChange?.("all");
    onOSFilterChange?.("all");
  };

  // Build active filters by checking each filter config
  const activeFilters = useMemo(() => {
    const filters: Array<{
      key: string;
      label: string;
      valueLabel: string;
      icon: React.ElementType;
      onRemove: () => void;
    }> = [];

    const filterState: Record<
      string,
      {
        value: string;
        options?: Array<{ value: string; label: string }>;
        onRemove: () => void;
      }
    > = {
      link: {
        value: linkFilter,
        options: linkOptions,
        onRemove: () => onLinkFilterChange?.("all"),
      },
      country: {
        value: countryFilter,
        options: countryOptions,
        onRemove: () => onCountryFilterChange?.("all"),
      },
      device: {
        value: deviceFilter,
        options: deviceOptions,
        onRemove: () => onDeviceFilterChange?.("all"),
      },
      browser: {
        value: browserFilter,
        options: browserOptions,
        onRemove: () => onBrowserFilterChange?.("all"),
      },
      os: {
        value: osFilter,
        options: osOptions,
        onRemove: () => onOSFilterChange?.("all"),
      },
    };

    for (const config of FILTER_CONFIGS) {
      const state = filterState[config.id];
      if (state && state.value !== "all" && state.options) {
        const option = state.options.find((o) => o.value === state.value);
        filters.push({
          key: config.id,
          label: config.label,
          valueLabel: option?.label || state.value,
          icon: config.icon,
          onRemove: state.onRemove,
        });
      }
    }

    return filters;
  }, [
    linkFilter,
    linkOptions,
    countryFilter,
    countryOptions,
    deviceFilter,
    deviceOptions,
    browserFilter,
    browserOptions,
    osFilter,
    osOptions,
    onLinkFilterChange,
    onCountryFilterChange,
    onDeviceFilterChange,
    onBrowserFilterChange,
    onOSFilterChange,
  ]);

  // Generate filter categories from FILTER_CONFIGS, matching options with props
  const filterCategories = useMemo(() => {
    const optionsMap: Record<
      string,
      Array<{ value: string; label: string }> | undefined
    > = {
      country: countryOptions,
      device: deviceOptions,
      browser: browserOptions,
      os: osOptions,
      link: linkOptions,
    };
    return FILTER_CONFIGS.map((config) => ({
      id: config.id,
      label: config.label,
      icon: config.icon,
      options: optionsMap[config.id] || [],
    }));
  }, [countryOptions, deviceOptions, browserOptions, osOptions, linkOptions]);

  const filteredOptions = useMemo(() => {
    if (!selectedCategory) return [];
    const category = filterCategories.find((c) => c.id === selectedCategory);
    if (!category?.options) return [];
    if (!searchQuery) return category.options;
    return category.options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [selectedCategory, searchQuery, filterCategories]);

  const handleSelectOption = (value: string) => {
    switch (selectedCategory) {
      case "country":
        onCountryFilterChange?.(value);
        break;
      case "device":
        onDeviceFilterChange?.(value);
        break;
      case "browser":
        onBrowserFilterChange?.(value);
        break;
      case "os":
        onOSFilterChange?.(value);
        break;
      case "link":
        onLinkFilterChange?.(value);
        break;
    }
    setIsAddFilterOpen(false);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn("", className)}>
      <div
        className="border-border flex items-center gap-3 rounded-sm border bg-white px-4 py-2.5 shadow-xs"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6), rgba(255,255,255,0.6)), url(/stripe.svg)",
          backgroundRepeat: "repeat",
          backgroundSize: "24px 24px",
        }}
      >
        {/* Filter Pills & Add Button */}
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            {activeFilters.map((filter) => (
              <FilterPill
                key={filter.key}
                label={filter.label}
                valueLabel={filter.valueLabel}
                icon={filter.icon}
                onRemove={filter.onRemove}
              />
            ))}

            <Popover
              open={isAddFilterOpen}
              onOpenChange={(open) => {
                setIsAddFilterOpen(open);
                if (!open) {
                  setSelectedCategory(null);
                  setSearchQuery("");
                }
              }}
            >
              <PopoverTrigger
                className={cn(
                  "text-muted-foreground flex cursor-pointer items-center gap-1.5 rounded-xs border border-dashed border-zinc-400 bg-white px-2 py-1 text-xs font-medium transition-all hover:border-yellow-500 hover:bg-zinc-50 hover:text-zinc-700",
                  isAddFilterOpen && "border-zinc-400 bg-zinc-50 text-zinc-700",
                )}
              >
                {hasActiveFilters ? (
                  <FunnelIcon className="h-3.5 w-3.5" weight="duotone" />
                ) : (
                  <PlusIcon className="h-3.5 w-3.5" />
                )}
                {hasActiveFilters ? "More" : "Add Filter"}
              </PopoverTrigger>
              <PopoverContent
                className="w-[220px] p-0"
                align="start"
                sideOffset={8}
                showArrow={false}
              >
                {!selectedCategory ? (
                  <div className="flex flex-col py-1">
                    <span className="px-3 py-2 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                      Filter by
                    </span>
                    {filterCategories.map((category) => {
                      const isUsed = activeFilters.some(
                        (f) => f.key === category.id,
                      );
                      return (
                        <button
                          key={category.id}
                          disabled={isUsed}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSearchQuery("");
                          }}
                          className={cn(
                            "mx-1 flex items-center justify-between rounded-md px-2 py-2 text-xs transition-colors",
                            isUsed
                              ? "cursor-not-allowed text-zinc-300"
                              : "cursor-pointer text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <category.icon
                              weight="duotone"
                              className={cn(
                                "h-4 w-4",
                                isUsed ? "text-zinc-300" : "text-zinc-400",
                              )}
                            />
                            <span className="font-medium">
                              {category.label}
                            </span>
                          </div>
                          {isUsed ? (
                            <CheckIcon
                              className="h-3.5 w-3.5 text-green-500"
                              weight="bold"
                            />
                          ) : (
                            <CaretRightIcon className="h-3.5 w-3.5 text-zinc-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 border-b border-zinc-100 px-2 py-2">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                      >
                        <CaretRightIcon className="h-3.5 w-3.5 rotate-180" />
                      </button>
                      <span className="text-xs font-semibold text-zinc-700">
                        {
                          filterCategories.find(
                            (c) => c.id === selectedCategory,
                          )?.label
                        }
                      </span>
                    </div>
                    <div className="border-b border-zinc-100 px-3 py-2">
                      <input
                        className="w-full bg-transparent text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-1">
                      {filteredOptions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-zinc-400">
                          No results
                        </div>
                      ) : (
                        filteredOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleSelectOption(option.value)}
                            className="mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center rounded-md px-2 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                          >
                            <span
                              className="max-w-[180px] truncate font-medium"
                              title={option.label}
                            >
                              {option.label}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="link"
              onClick={clearAllFilters}
              className="pr-1 pl-0 text-xs text-red-400 hover:text-red-600"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="h-5 w-px bg-zinc-200" />

        {/* Date Range - On the Right */}
        <Select
          value={timeRange}
          onValueChange={(v) => onTimeRangeChange?.(v as string)}
        >
          <SelectTrigger
            size="md"
            className="w-46 rounded-xs border-zinc-200 bg-white px-3 text-xs shadow-none hover:bg-zinc-100"
          >
            <SelectValue>
              <div className="flex items-center gap-1.5">
                <CalendarDotIcon
                  weight="duotone"
                  className="size-4 text-zinc-500"
                />
                <span>
                  {
                    timeRangeOptions.find((opt) => opt.value === timeRange)
                      ?.displayValue
                  }
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            className="rounded-xs border p-1 pb-1 text-xs"
            alignOffset={0}
          >
            {timeRangeOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-muted-foreground rounded-none border-x border-b text-xs"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
