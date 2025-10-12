import { useState, useEffect, useCallback } from "react";
import { SortingState, OnChangeFn } from "@tanstack/react-table";
import { useSearchParams } from "react-router";

// Compact sorting format: "column:direction" e.g., "clicks:desc" or "createdAt:asc"
type CompactSorting = string;

// Convert TanStack sorting to compact format
function sortingToCompact(sorting: SortingState): CompactSorting {
  if (sorting.length === 0) return "";
  const { id, desc } = sorting[0];
  return `${id}:${desc ? "desc" : "asc"}`;
}

// Convert compact format to TanStack sorting
function compactToSorting(compact: CompactSorting): SortingState {
  if (!compact) return [];

  const [id, direction] = compact.split(":");
  if (!id || !direction) return [];

  return [{ id, desc: direction === "desc" }];
}

// Hook to persist only sorting state in URL parameters with compact format using React Router
export function useTableSortingURL() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load sorting from URL on mount
  useEffect(() => {
    try {
      const sortParam = searchParams.get("sort");
      if (sortParam) {
        const parsedSorting = compactToSorting(sortParam);
        setSorting(parsedSorting);
      }
    } catch (error) {
      console.warn("Failed to load sorting from URL:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [searchParams]);

  // Update URL when sorting changes - handles both direct values and updater functions
  const updateSorting: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;

      setSorting(newSorting);

      const compactSorting = sortingToCompact(newSorting);

      setSearchParams((prev: URLSearchParams) => {
        const newParams = new URLSearchParams(prev);

        if (compactSorting) {
          newParams.set("sort", compactSorting);
        } else {
          newParams.delete("sort");
        }

        return newParams;
      });
    },
    [sorting, setSearchParams],
  );

  return {
    sorting,
    isLoaded,
    updateSorting,
  };
}
