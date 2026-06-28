"use client";

import { useState, useMemo, useCallback } from "react";
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

  // Memoized remove handlers to prevent re-renders
  const handleRemoveLink = useCallback(
    () => onLinkFilterChange?.("all"),
    [onLinkFilterChange],
  );
  const handleRemoveCountry = useCallback(
    () => onCountryFilterChange?.("all"),
    [onCountryFilterChange],
  );
  const handleRemoveDevice = useCallback(
    () => onDeviceFilterChange?.("all"),
    [onDeviceFilterChange],
  );
  const handleRemoveBrowser = useCallback(
    () => onBrowserFilterChange?.("all"),
    [onBrowserFilterChange],
  );
  const handleRemoveOS = useCallback(
    () => onOSFilterChange?.("all"),
    [onOSFilterChange],
  );

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
        onRemove: handleRemoveLink,
      },
      country: {
        value: countryFilter,
        options: countryOptions,
        onRemove: handleRemoveCountry,
      },
      device: {
        value: deviceFilter,
        options: deviceOptions,
        onRemove: handleRemoveDevice,
      },
      browser: {
        value: browserFilter,
        options: browserOptions,
        onRemove: handleRemoveBrowser,
      },
      os: {
        value: osFilter,
        options: osOptions,
        onRemove: handleRemoveOS,
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
    handleRemoveLink,
    handleRemoveCountry,
    handleRemoveDevice,
    handleRemoveBrowser,
    handleRemoveOS,
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

  const barInner = (
    <>
      <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <div
                key={filter.key}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground shadow-xs"
              >
                <Icon className="size-3 text-muted-foreground" weight="duotone" />
                <span className="text-muted-foreground">{filter.label}:</span>
                <span
                  className="max-w-[150px] truncate font-medium text-foreground"
                  title={filter.valueLabel}
                >
                  {filter.valueLabel}
                </span>
                <button
                  type="button"
                  onClick={filter.onRemove}
                  aria-label={`Remove ${filter.label} filter`}
                  className="ml-0.5 rounded-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <XIcon className="size-3" aria-hidden="true" />
                </button>
              </div>
            );
          })}

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
                "text-foreground flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border bg-secondary px-2.5 py-1 text-xs font-medium shadow-xs transition-colors hover:border-accent hover:bg-accent/10 hover:text-foreground",
                isAddFilterOpen && "border-accent bg-accent/10 text-foreground",
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
                  <span className="text-muted-foreground px-3 py-2 text-[10px] font-semibold tracking-wider uppercase">
                    Filter by
                  </span>
                  {filterCategories.map((category) => {
                    const isUsed = activeFilters.some(
                      (f) => f.key === category.id,
                    );
                    const CatIcon = category.icon;
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
                            ? "text-muted-foreground/50 cursor-not-allowed"
                            : "text-foreground/80 hover:bg-muted hover:text-foreground cursor-pointer",
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <CatIcon
                            weight="duotone"
                            className="text-muted-foreground h-4 w-4"
                          />
                          <span className="font-medium">{category.label}</span>
                        </div>
                        {isUsed ? (
                          <CheckIcon
                            className="text-success h-3.5 w-3.5"
                            weight="bold"
                          />
                        ) : (
                          <CaretRightIcon className="text-muted-foreground/60 h-3.5 w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 border-b border-border px-2 py-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
                    >
                      <CaretRightIcon className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <span className="text-foreground text-xs font-semibold">
                      {
                        filterCategories.find(
                          (c) => c.id === selectedCategory,
                        )?.label
                      }
                    </span>
                  </div>
                  <div className="border-b border-border px-3 py-2">
                    <input
                      autoComplete="off"
                      aria-label="Search filter values"
                      className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-xs focus:outline-none"
                      placeholder="Search…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto py-1">
                    {filteredOptions.length === 0 ? (
                      <div className="text-muted-foreground py-4 text-center text-xs">
                        No results
                      </div>
                    ) : (
                      filteredOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSelectOption(option.value)}
                          className="text-foreground/80 hover:bg-muted hover:text-foreground mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center rounded-md px-2 py-2 text-xs transition-colors"
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
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground pr-1 pl-0 text-xs transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-border" />

      <Select
        value={timeRange}
        onValueChange={(v) => onTimeRangeChange?.(v as string)}
      >
        <SelectTrigger
          size="md"
          className="border-border bg-card hover:bg-muted w-46 rounded-md px-3 text-xs shadow-xs"
        >
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <CalendarDotIcon
                weight="duotone"
                className="text-muted-foreground size-4"
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
        <SelectContent className="rounded-md border p-1 text-xs" alignOffset={0}>
          {timeRangeOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-muted-foreground rounded-sm text-xs"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className={cn("", className)}>
      <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_10px_-2px_rgba(0,0,0,0.08)]">
        {barInner}
      </div>
    </div>
  );
}
