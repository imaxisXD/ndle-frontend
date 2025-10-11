import { createContext, useContext } from "react";
import { useReactTable } from "@tanstack/react-table";
import { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { DisplayUrl } from "./types";

type UserUrlsResponse = FunctionReturnType<
  typeof api.urlMainFuction.getUserUrlsWithAnalytics
>;

export interface UrlListContextType {
  urls: UserUrlsResponse | undefined;
  isLoading: boolean;
  isEmpty: boolean;
  filteredUrls: DisplayUrl[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: "healthy" | "healed" | "checking" | "all";
  setStatusFilter: (status: "healthy" | "healed" | "checking" | "all") => void;
  showFiltersPanel: boolean;
  setShowFiltersPanel: (show: boolean) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  activeTab: "memory" | "chat" | "healing" | "analytics";
  setActiveTab: (tab: "memory" | "chat" | "healing" | "analytics") => void;
  table: ReturnType<typeof useReactTable<DisplayUrl>>;
  handleCopy: (shortUrl: string) => void;
}

export const UrlListContext = createContext<UrlListContextType | null>(null);

export function useUrlListContext() {
  const context = useContext(UrlListContext);
  if (!context) {
    throw new Error("UrlList compound components must be used within UrlList");
  }
  return context;
}
