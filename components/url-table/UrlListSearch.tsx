import React from "react";
import { Search, XmarkCircle } from "iconoir-react";
import { useUrlListContext } from "./UrlListContext";

interface UrlListSearchProps {
  placeholder?: string;
}

export function UrlListSearch({ placeholder }: UrlListSearchProps) {
  const { searchQuery, setSearchQuery } = useUrlListContext();

  return (
    <div className="border-border border-b p-6">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            placeholder || "Search links by URL, content, or notes..."
          }
          className="border-input bg-background focus:ring-foreground/20 w-full rounded-md border py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <XmarkCircle className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
