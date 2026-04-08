"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRightIcon,
  ChartLineUpIcon,
  GlobeHemisphereWestIcon,
  LightningIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";

const featureCards = [
  {
    title: "Fast dashboard",
    text: "Open the app, shorten a link, and manage everything in one place.",
    icon: GlobeHemisphereWestIcon,
  },
  {
    title: "Clean tracking",
    text: "See clicks, top links, and simple traffic views without extra setup.",
    icon: ChartLineUpIcon,
  },
  {
    title: "Branded links",
    text: "Use your own domain when you want a stronger brand and better trust.",
    icon: SparkleIcon,
  },
];

const quickStats = [
  { label: "Free custom domains", value: "1" },
  { label: "Free active links", value: "100" },
  { label: "Simple analytics window", value: "30 days" },
];

export function PublicHome() {
  return (
    <div className="bg-home text-foreground relative min-h-[100dvh] w-full overflow-x-clip">
      <div aria-hidden className="dot pointer-events-none opacity-70" />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-6 py-6 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-doto roundness-100 text-5xl font-black tracking-tight">
              ndle
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Short. Sharp. Smarter.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost">
              <Link href="/sign-in?redirect_url=/">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up?redirect_url=/">Create account</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-8 py-8">
          <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em]">
                <LightningIcon className="size-4" />
                Link dashboard for teams and creators
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
                  Shorten, track, and brand your links from one clean dashboard.
                </h1>
                <p className="text-muted-foreground max-w-2xl text-base leading-7">
                  ndle gives you a simple home for links, clicks, branded
                  domains, and live health checks. Start with the free plan and
                  move faster without the usual clutter.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/sign-in?redirect_url=/">
                    Open dashboard
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/sign-up?redirect_url=/">Start free</Link>
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-black/10 bg-white/85 shadow-2xl shadow-black/5">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                      Dashboard preview
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      Built for daily link work
                    </h2>
                  </div>
                  <div className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                    Free to start
                  </div>
                </div>

                <div className="grid gap-3">
                  {quickStats.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-2xl border border-black/10 bg-zinc-50 px-4 py-4"
                    >
                      <span className="text-sm text-zinc-600">{item.label}</span>
                      <span className="text-lg font-semibold text-zinc-950">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-black px-5 py-5 text-white">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">
                    Why teams switch
                  </p>
                  <p className="mt-3 text-lg leading-7 text-white/90">
                    One place for short links, click data, domain control, and
                    health checks. Less jumping around. More shipping.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-black/10 bg-white/85">
                <CardContent className="space-y-3 p-6">
                  <div className="inline-flex rounded-lg border border-black/10 bg-zinc-50 p-2">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-lg font-medium">{item.title}</h2>
                    <p className="text-muted-foreground text-sm leading-6">
                      {item.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </section>
        </main>
      </div>
    </div>
  );
}
