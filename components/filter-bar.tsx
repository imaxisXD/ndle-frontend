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
  RobotIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/base-popover";
import {
  FILTER_CONFIGS,
  type AnalyticsFilterKey,
  type FilterOption,
} from "@/lib/analytics-filters";
import type { FilterOptions } from "@/types/analytics-v2";

export interface AnalyticsFilterState {
  timeRange: string;
  country: string;
  device: string;
  browser: string;
  os: string;
  link: string;
  excludeBots: boolean;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  timeRange: "30d",
  country: "all",
  device: "all",
  browser: "all",
  os: "all",
  link: "all",
  excludeBots: false,
};

export interface TimeRangeOption {
  value: string;
  label: string;
  displayValue: string;
}

export const ALL_TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: "24h", label: "Today (UTC)", displayValue: "Today (UTC)" },
  { value: "7d", label: "Last 7 days", displayValue: "Last 7 days" },
  { value: "30d", label: "Last 30 days", displayValue: "Last 30 days" },
  { value: "3m", label: "Last 3 months", displayValue: "Last 3 months" },
  { value: "12m", label: "Last 12 months", displayValue: "Last 12 months" },
  { value: "mtd", label: "Month to Date", displayValue: "Month to Date" },
  { value: "qtd", label: "Quarter to Date", displayValue: "Quarter to Date" },
  { value: "ytd", label: "Year to Date", displayValue: "Year to Date" },
  { value: "all", label: "All Time", displayValue: "All Time" },
];

export const FREE_TIME_RANGE_OPTIONS: TimeRangeOption[] = ALL_TIME_RANGE_OPTIONS.slice(0, 3);

interface FilterBarProps {
  filters: AnalyticsFilterState;
  onFiltersChange: (next: AnalyticsFilterState) => void;
  options: FilterOptions;
  timeRangeOptions?: TimeRangeOption[];
  className?: string;
}

export function FilterBar({
  filters,
  onFiltersChange,
  options,
  timeRangeOptions = ALL_TIME_RANGE_OPTIONS,
  className,
}: FilterBarProps) {
  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AnalyticsFilterKey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const updateFilter = <K extends keyof AnalyticsFilterState>(
    key: K,
    value: AnalyticsFilterState[K],
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      ...DEFAULT_ANALYTICS_FILTERS,
      timeRange: filters.timeRange,
    });
  };

  const activeFilters = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      valueLabel: string;
      icon: React.ElementType;
      onRemove: () => void;
    }> = [];

    for (const config of FILTER_CONFIGS) {
      const value = filters[config.id];
      const list = options[config.id];
      if (value !== "all" && list) {
        const option = list.find((o) => o.value === value);
        items.push({
          key: config.id,
          label: config.label,
          valueLabel: option?.label || value,
          icon: config.icon,
          onRemove: () => onFiltersChange({ ...filters, [config.id]: "all" }),
        });
      }
    }

    if (filters.excludeBots) {
      items.push({
        key: "bots",
        label: "Bots",
        valueLabel: "Excluded",
        icon: RobotIcon,
        onRemove: () => onFiltersChange({ ...filters, excludeBots: false }),
      });
    }

    return items;
  }, [filters, options, onFiltersChange]);

  const filterCategories = useMemo(
    () =>
      FILTER_CONFIGS.map((config) => ({
        id: config.id,
        label: config.label,
        icon: config.icon,
        options: (options[config.id] ?? []) as FilterOption[],
      })),
    [options],
  );

  const filteredOptions = useMemo(() => {
    if (!selectedCategory) return [];
    const category = filterCategories.find((c) => c.id === selectedCategory);
    if (!category?.options) return [];
    if (!searchQuery) return category.options;
    const needle = searchQuery.toLowerCase();
    return category.options.filter((opt) => opt.label.toLowerCase().includes(needle));
  }, [selectedCategory, searchQuery, filterCategories]);

  const handleSelectOption = (value: string) => {
    if (selectedCategory) {
      updateFilter(selectedCategory, value);
    }
    setIsAddFilterOpen(false);
    setSelectedCategory(null);
    setSearchQuery("");
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className={cn("", className)}>
      <div className="bg-surface-raised shadow-raised border-border flex items-center gap-3 rounded-md border px-4 py-2.5">
        <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <div
                  key={filter.key}
                  className="border-border bg-muted text-foreground flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs shadow-xs"
                >
                  <Icon
                    className="text-muted-foreground size-3"
                    weight="duotone"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground">{filter.label}:</span>
                  <span
                    className="text-foreground max-w-[150px] truncate font-medium"
                    title={filter.valueLabel}
                  >
                    {filter.valueLabel}
                  </span>
                  <button
                    type="button"
                    onClick={filter.onRemove}
                    aria-label={`Remove ${filter.label} filter`}
                    className="text-muted-foreground hover:text-foreground ml-0.5 rounded-xs transition-colors"
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
                  "text-foreground border-border bg-secondary hover:border-accent hover:bg-accent/10 hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed px-2.5 py-1 text-xs font-medium shadow-xs transition-colors",
                  isAddFilterOpen && "border-accent bg-accent/10 text-foreground",
                )}
              >
                {hasActiveFilters ? (
                  <FunnelIcon className="h-3.5 w-3.5" weight="duotone" aria-hidden="true" />
                ) : (
                  <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
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
                      const isUsed = activeFilters.some((f) => f.key === category.id);
                      const CatIcon = category.icon;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          disabled={isUsed}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSearchQuery("");
                          }}
                          className={cn(
                            "mx-1 flex items-center justify-between rounded-md px-2 py-2 text-xs transition-colors",
                            isUsed
                              ? "text-muted-foreground/50 cursor-not-allowed"
                              : "text-foreground/80 hover:bg-surface-hover hover:text-foreground cursor-pointer",
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <CatIcon
                              weight="duotone"
                              className="text-muted-foreground h-4 w-4"
                              aria-hidden="true"
                            />
                            <span className="font-medium">{category.label}</span>
                          </div>
                          {isUsed ? (
                            <CheckIcon
                              className="text-success h-3.5 w-3.5"
                              weight="bold"
                              aria-hidden="true"
                            />
                          ) : (
                            <CaretRightIcon
                              className="text-muted-foreground/60 h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={filters.excludeBots}
                      onClick={() => {
                        updateFilter("excludeBots", true);
                        setIsAddFilterOpen(false);
                      }}
                      className={cn(
                        "mx-1 flex items-center justify-between rounded-md px-2 py-2 text-xs transition-colors",
                        filters.excludeBots
                          ? "text-muted-foreground/50 cursor-not-allowed"
                          : "text-foreground/80 hover:bg-surface-hover hover:text-foreground cursor-pointer",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <RobotIcon
                          weight="duotone"
                          className="text-muted-foreground h-4 w-4"
                          aria-hidden="true"
                        />
                        <span className="font-medium">Exclude bots</span>
                      </div>
                      {filters.excludeBots && (
                        <CheckIcon
                          className="text-success h-3.5 w-3.5"
                          weight="bold"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="border-border flex items-center gap-2 border-b px-2 py-2">
                      <button
                        type="button"
                        aria-label="Back to filter categories"
                        onClick={() => setSelectedCategory(null)}
                        className="text-muted-foreground hover:bg-surface-hover hover:text-foreground rounded p-1 transition-colors"
                      >
                        <CaretRightIcon className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
                      </button>
                      <span className="text-foreground text-xs font-semibold">
                        {filterCategories.find((c) => c.id === selectedCategory)?.label}
                      </span>
                    </div>
                    <div className="border-border border-b px-3 py-2">
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
                            type="button"
                            onClick={() => handleSelectOption(option.value)}
                            className="text-foreground/80 hover:bg-surface-hover hover:text-foreground mx-1 flex w-[calc(100%-8px)] cursor-pointer items-center rounded-md px-2 py-2 text-xs transition-colors"
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

        <div className="bg-border h-5 w-px" />

        <Select
          value={filters.timeRange}
          onValueChange={(value) => updateFilter("timeRange", String(value))}
        >
          <SelectTrigger
            size="md"
            className="border-border hover:bg-surface-hover w-46 rounded-md px-3 text-xs"
          >
            <SelectValue>
              <div className="flex items-center gap-1.5">
                <CalendarDotIcon
                  weight="duotone"
                  className="text-muted-foreground size-4"
                  aria-hidden="true"
                />
                <span>
                  {timeRangeOptions.find((opt) => opt.value === filters.timeRange)?.displayValue}
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
      </div>
    </div>
  );
}
