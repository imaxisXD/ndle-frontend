import { AiSummaryGenerator } from "../ai-summary-generator";
import { AiChat } from "../ai-chat";
import { TableRow, TableCell } from "@/components/ui/table";
import type { DisplayUrl } from "./types";

export function ExpandedRowContent({
  columnsCount,
  url,
  activeTab,
  setActiveTab,
}: {
  columnsCount: number;
  url: DisplayUrl;
  activeTab: "memory" | "chat" | "healing" | "analytics";
  setActiveTab: (tab: "memory" | "chat" | "healing" | "analytics") => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columnsCount} className="bg-muted/20 p-0">
        <div className="p-6">
          <div className="border-border mb-4 flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("memory")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "memory"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <FileTextIcon className="h-4 w-4" />
              Memory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "chat"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <MessageSquareIcon className="h-4 w-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("healing")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "healing"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <RefreshCwIcon className="h-4 w-4" />
              Healing History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "analytics"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <BarChartIcon className="h-4 w-4" />
              Analytics
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === "memory" && (
              <div className="space-y-4">
                <AiSummaryGenerator url={url.originalUrl} />

                <div className="border-border bg-card rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileTextIcon className="text-muted-foreground h-4 w-4" />
                    <h4 className="text-sm font-medium">Your Notes</h4>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Add your notes here.
                  </p>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-yellow-700" />
                    <h4 className="text-sm font-medium text-yellow-900">
                      Why You Saved This
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Keep a brief reason for future context.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="space-y-4">
                <AiChat linkUrl={url.originalUrl} />
              </div>
            )}

            {activeTab === "healing" && (
              <div className="space-y-3">
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
                  <CheckCircle2Icon className="mx-auto h-8 w-8 text-green-600" />
                  <p className="text-foreground mt-2 text-sm">
                    Link is healthy
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    No healing actions required
                  </p>
                </div>
              </div>
            )}

            {activeTab === "analytics" &&
              (url.analytics ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium">Clicks Over Time</h4>
                    <div className="mt-3 space-y-2">
                      {url.analytics.dailyClicks.map((d) => (
                        <div key={d.day} className="flex items-center gap-3">
                          <span className="w-8 text-xs">{d.day}</span>
                          <div className="flex-1">
                            <div className="bg-muted h-2 overflow-hidden rounded-md">
                              <div
                                className="bg-foreground h-full"
                                style={{
                                  width: `${
                                    (d.clicks /
                                      Math.max(
                                        ...url.analytics!.dailyClicks.map(
                                          (x) => x.clicks,
                                        ),
                                      )) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="w-10 text-right text-xs">
                            {d.clicks}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Top Countries</h4>
                    <div className="mt-3 space-y-4">
                      {url.analytics.topCountries.map((c) => (
                        <div key={c.country}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs">{c.country}</span>
                            <span className="text-xs">{c.clicks}</span>
                          </div>
                          <div className="bg-muted h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-foreground h-full"
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
                  <BarChartIcon className="text-muted-foreground mx-auto h-8 w-8" />
                  <p className="text-foreground mt-2 text-sm">
                    No analytics yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Clicks and geography will appear here
                  </p>
                </div>
              ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
