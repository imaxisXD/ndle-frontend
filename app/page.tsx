"use client";

import { useState } from "react";
import { Analytics } from "@/components/analytics";
import { Collections } from "@/components/collections";
import { LinkMonitoring } from "@/components/link-monitoring";
import { Settings } from "@/components/settings";
import { Sidebar } from "@/components/sidebar";
import { UrlList } from "@/components/url-list";
import { UrlShortener } from "@/components/url-shortener";

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<
    | "home"
    | "analytics"
    | "settings"
    | "create"
    | "collections"
    | "memory"
    | "monitoring"
  >("home");

  return (
    <div className="flex h-screen bg-[#f5f5f5] text-foreground overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="p-8 lg:p-12">
          <div className="mx-auto max-w-7xl space-y-8">
            {activeView === "home" && (
              <>
                <div>
                  <h1 className="font-doto text-4xl font-bold tracking-wide">
                    ndle
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Short. Sharp. Smarter.
                  </p>
                </div>
                <UrlShortener />
                <Analytics />
                <UrlList />
              </>
            )}

            {activeView === "analytics" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Analytics
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Detailed insights and statistics
                  </p>
                </div>
                <Analytics />
                <UrlList />
              </>
            )}

            {activeView === "monitoring" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Link Monitoring
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Real-time health monitoring and uptime tracking
                  </p>
                </div>
                <LinkMonitoring />
              </>
            )}

            {activeView === "settings" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Settings
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Configure ndle
                  </p>
                </div>
                <Settings />
              </>
            )}

            {activeView === "create" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Quick Create
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Bulk import and create multiple links
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-8">
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="bulk-import-urls"
                        className="font-mono text-sm font-medium"
                      >
                        Bulk Import URLs
                      </label>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Paste multiple URLs (one per line) to create shortened
                        links
                      </p>
                      <textarea
                        placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                        className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm h-48 focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      />
                    </div>
                    <button
                      type="button"
                      className="rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
                    >
                      Create All Links
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeView === "collections" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Collections
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    Organize your links into collections
                  </p>
                </div>
                <Collections />
              </>
            )}

            {activeView === "memory" && (
              <>
                <div>
                  <h1 className="font-mono text-3xl font-medium tracking-tight">
                    Memory & Conversations
                  </h1>
                  <p className="mt-2 font-mono text-sm text-muted-foreground">
                    AI-powered summaries, notes, and conversations about your
                    links
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      link: "short.link/a8x9k2",
                      title: "How to Build a SaaS Product",
                      memory:
                        "Saved for reference on product development strategies. Key insights about MVP approach.",
                      conversations: 5,
                    },
                    {
                      link: "short.link/m3p7q1",
                      title: "Getting Started Documentation",
                      memory:
                        "Important onboarding resource. Contains setup instructions for new team members.",
                      conversations: 12,
                    },
                    {
                      link: "short.link/p4r8t3",
                      title: "Analytics Dashboard Features",
                      memory:
                        "Competitor analysis reference. Good examples of data visualization patterns.",
                      conversations: 3,
                    },
                  ].map((item) => (
                    <div
                      key={item.link}
                      className="rounded-lg border border-border bg-card p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              {item.link}
                            </span>
                            <span className="rounded-full bg-[#fbbf24] px-2 py-0.5 font-mono text-xs text-foreground">
                              Memory
                            </span>
                          </div>
                          <h3 className="mt-2 font-mono text-base font-medium">
                            {item.title}
                          </h3>
                          <p className="mt-2 font-mono text-sm text-muted-foreground">
                            {item.memory}
                          </p>
                          <div className="mt-4 flex gap-4 font-mono text-xs text-muted-foreground">
                            <span>{item.conversations} conversations</span>
                            <span>Last updated 2 days ago</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
