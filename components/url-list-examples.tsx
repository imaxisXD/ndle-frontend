// Usage examples for the TRUE COMPOSITION PATTERN UrlList component

import { UrlList } from "./url-table/UrlList";

// Example 1: Full list with all features (TRUE COMPOSITION)
export function FullUrlList() {
  return (
    <UrlList defaultPageSize={10} queryArgs={{ limit: 50 }}>
      <UrlList.Header
        title="All Links"
        description="Complete list of your shortened links with full functionality"
      />
      <UrlList.Search placeholder="Search links by URL, content, or notes..." />
      <UrlList.Filters />
      <UrlList.Table />
      <UrlList.Pagination />
    </UrlList>
  );
}

// Example 2: Recent links without filters and pagination (TRUE COMPOSITION)
export function RecentUrlList() {
  return (
    <UrlList defaultPageSize={5} queryArgs={{ limit: 5 }}>
      <UrlList.Header
        title="Recent Links"
        description="Your latest shortened links"
      />
      <UrlList.Table />
    </UrlList>
  );
}

// Example 3: Search-only list (TRUE COMPOSITION)
export function SearchableUrlList() {
  return (
    <UrlList>
      <UrlList.Header
        title="Search Links"
        description="Find your links quickly"
      />
      <UrlList.Search placeholder="Search by URL or content..." />
      <UrlList.Table />
    </UrlList>
  );
}

// Example 4: Custom configuration with footer (TRUE COMPOSITION)
export function CustomUrlList() {
  return (
    <UrlList defaultPageSize={20}>
      <UrlList.Header
        title="My Links"
        description="Customized link management"
      />
      <UrlList.Search placeholder="Type to search..." />
      <UrlList.Filters />
      <UrlList.Table />
      <UrlList.Pagination />
      <UrlList.Footer content="Total links: 1,234 • Last updated: 2 minutes ago" />
    </UrlList>
  );
}

// Example 5: Minimal list for dashboard widgets (TRUE COMPOSITION)
export function DashboardUrlWidget() {
  return (
    <UrlList defaultPageSize={3}>
      <UrlList.Header title="Quick Links" description="" />
      <UrlList.Table />
    </UrlList>
  );
}

// Example 6: Different order - search first, then filters (TRUE COMPOSITION)
export function ReorderedUrlList() {
  return (
    <UrlList>
      <UrlList.Header
        title="Custom Order"
        description="Search first, then filter"
      />
      <UrlList.Search />
      <UrlList.Filters />
      <UrlList.Table />
      <UrlList.Pagination />
    </UrlList>
  );
}

// Example 7: Only table - minimal usage (TRUE COMPOSITION)
export function MinimalUrlList() {
  return (
    <UrlList>
      <UrlList.Table />
    </UrlList>
  );
}

// Example 8: With footer only (TRUE COMPOSITION)
export function UrlListWithFooter() {
  return (
    <UrlList>
      <UrlList.Header
        title="Quick Stats"
        description="Overview of your links"
      />
      <UrlList.Table />
      <UrlList.Footer content="Showing 5 of 50 total links" />
    </UrlList>
  );
}

// Example 9: Footer with different content (TRUE COMPOSITION)
export function UrlListWithCustomFooter() {
  return (
    <UrlList>
      <UrlList.Header
        title="Analytics"
        description="Link performance metrics"
      />
      <UrlList.Search />
      <UrlList.Table />
      <UrlList.Footer content="Data refreshes every 5 minutes • Contact support for help" />
    </UrlList>
  );
}

// Example 10: With specific query parameters (TRUE COMPOSITION)
export function UrlListWithQueryParams() {
  return (
    <UrlList
      queryArgs={{
        limit: 20,
        status: "active",
        sortBy: "createdAt",
        sortOrder: "desc",
      }}
    >
      <UrlList.Header
        title="Active Links"
        description="Only showing active links"
      />
      <UrlList.Table />
      <UrlList.Footer content="Showing only active links • Sorted by creation date" />
    </UrlList>
  );
}

// Example 11: Dashboard widget with minimal data (TRUE COMPOSITION)
export function DashboardWidgetWithQuery() {
  return (
    <UrlList
      defaultPageSize={3}
      queryArgs={{ limit: 3, includeAnalytics: false }}
    >
      <UrlList.Header title="Quick Links" description="" />
      <UrlList.Table />
    </UrlList>
  );
}
