import { useCallback, useMemo } from "react";
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

  const sorting = useMemo<SortingState>(() => {
    try {
      const sortParam = searchParams.get("sort");
      return sortParam ? compactToSorting(sortParam) : [];
    } catch (error) {
      console.warn("Failed to parse sorting from URL:", error);
      return [];
    }
  }, [searchParams]);

  // Update URL when sorting changes - handles both direct values and updater functions
  const updateSorting: OnChangeFn<SortingState> = useCallback(
    (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;

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
    updateSorting,
  };
}
