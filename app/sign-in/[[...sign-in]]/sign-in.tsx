import Link from "next/link";

import { SignIn } from "@clerk/nextjs";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "iconoir-react";

const highlights = [
  {
    title: "Adaptive destinations",
    description: "Links that heal themselves whenever targets move or change.",
  },
  {
    title: "Intent-rich analytics",
    description: "Uncover the why behind every click, channel, and audience.",
  },
  {
    title: "Team-grade guardrails",
    description:
      "Granular roles and review flows keep launches sharp and safe.",
  },
];

export default function SignInComponent() {
  return (
    <div className="text-foreground relative flex min-h-[100svh] flex-col bg-[var(--home)] lg:flex-row">
      <div className="relative hidden min-h-full w-full max-w-[520px] flex-1 flex-col justify-between overflow-hidden px-10 py-14 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#101010] to-[#1d1d1d]" />
        <div className="relative flex items-center gap-3 text-sm tracking-[0.32em] text-white/70 uppercase">
          <span className="font-doto roundness-100 text-4xl font-medium text-white">
            ndle
          </span>
          <span className="text-xs tracking-normal text-white/50 normal-case">
            short. sharp. smarter.
          </span>
        </div>

        <div className="relative mt-10 space-y-8">
          <div className="grid gap-4">
            {highlights.map((card) => (
              <Card
                key={card.title}
                variant="accent"
                className="group border border-white/10 bg-white/[0.07] p-0 text-white shadow-none backdrop-blur transition hover:border-white/20 hover:bg-white/10"
              >
                <CardHeader className="flex items-start justify-between gap-4 p-5">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold text-white">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-white/70">
                      {card.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="relative mt-10 text-xs text-white/60">
          Trusted by fast-moving teams calibrating every launch touchpoint.
        </div>
      </div>

      <div className="bg-background relative flex min-h-full w-full flex-1 justify-center px-6 py-12 lg:px-16 lg:py-14">
        <div className="relative z-10 flex w-full max-w-md flex-col justify-center gap-10">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="space-y-3">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight">
              Log in to ndle
            </h2>
            <p className="text-muted-foreground text-sm">
              Continue with your team account to access the adaptive dashboard.
            </p>
          </div>

          <div className="border-border bg-card/70 rounded-2xl border p-6 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.4)] backdrop-blur">
            <SignIn
              redirectUrl="/static-app-shell"
              afterSignInUrl="/static-app-shell"
              signUpUrl="/sign-up"
              afterSignUpUrl="/static-app-shell"
              appearance={{
                layout: {
                  socialButtonsVariant: "iconButton",
                  logoImageUrl: "",
                },
                elements: {
                  rootBox: "bg-transparent",
                  card: "border-0 bg-transparent shadow-none",
                  headerTitle: "text-foreground",
                  headerSubtitle: "text-muted-foreground",
                  formFieldLabel:
                    "text-xs uppercase tracking-wide text-muted-foreground",
                  formFieldInput:
                    "bg-background border-border/80 text-foreground",
                  footer: "hidden",
                  socialButtons: "grid grid-cols-2 gap-3",
                  socialButton:
                    "border border-border bg-card text-foreground hover:bg-accent/10",
                  dividerLine: "bg-border",
                  dividerText:
                    "text-muted-foreground text-[11px] uppercase tracking-[0.32em]",
                  primaryButton:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
