import { useParams, useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChartIcon,
  ClockIcon,
  ExternalLinkIcon,
  Trash2,
} from "@/components/icons";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params[":slug"] || params.slug || "unknown";
  const shortUrl = `ndle.im/${slug}`;

  const clicksData = [
    { day: "Mon", clicks: 12 },
    { day: "Tue", clicks: 18 },
    { day: "Wed", clicks: 24 },
    { day: "Thu", clicks: 19 },
    { day: "Fri", clicks: 32 },
    { day: "Sat", clicks: 15 },
    { day: "Sun", clicks: 21 },
  ];
  const maxClicks = Math.max(...clicksData.map((d) => d.clicks));

  const topCountries = [
    { country: "United States", clicks: 45, percentage: 38 },
    { country: "Germany", clicks: 22, percentage: 19 },
    { country: "India", clicks: 19, percentage: 16 },
  ];

  return (
    <>
      <header>
        <h1 className="text-3xl font-medium tracking-tight">{shortUrl}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Link analytics and settings
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium">Clicks Over Time</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Daily click activity
                </p>
              </div>
              <BarChartIcon className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="space-y-3">
              {clicksData.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-8 text-sm">{d.day}</span>
                  <div className="flex-1">
                    <div className="bg-muted h-2 overflow-hidden rounded-md">
                      <div
                        className="bg-foreground h-full"
                        style={{ width: `${(d.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-medium">
                    {d.clicks}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">Top Countries</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Clicks by geography
              </p>
            </div>
            <div className="space-y-5">
              {topCountries.map((c) => (
                <div key={c.country}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm">{c.country}</span>
                    <span className="text-sm font-medium">{c.clicks}</span>
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
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-medium">Metadata</h3>
            <div className="text-muted-foreground mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ExternalLinkIcon className="h-4 w-4" /> Short URL:{" "}
                <code className="text-foreground">https://{shortUrl}</code>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4" /> Created: 2 days ago
              </div>
              <div>Tracking: Enabled</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-medium text-red-600">Danger Zone</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" /> Delete Link
            </button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
