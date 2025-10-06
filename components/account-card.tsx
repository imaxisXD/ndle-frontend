"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardToolbar,
} from "./ui/card";
import { SparklesIcon } from "./icons";
import { Button } from "./ui/button";
import { SignOutButton, useUser } from "@clerk/nextjs";

export function AccountCard() {
  const { user, isSignedIn } = useUser();

  if (!user || !isSignedIn) {
    return null;
  }

  const isPro = "pro";

  return (
    <Card variant={"accent"} className="border-border border">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-base font-medium">
          <div className="rounded-lg bg-purple-200 p-2">
            <svg
              className="h-5 w-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14c-5 0-8 2.5-8 5v1h16v-1c0-2.5-3-5-8-5z"
              />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5">
            Account
            <CardDescription className="text-muted-foreground text-xs font-normal">
              Profile
            </CardDescription>
          </div>
        </CardTitle>
        <CardToolbar>
          <SignOutButton>
            <Button variant="destructive" type="button">
              Sign out
            </Button>
          </SignOutButton>
        </CardToolbar>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Image
            src={user.imageUrl}
            alt={user.firstName ?? "Profile"}
            width={48}
            height={48}
            className="border-border h-12 w-12 rounded-full border object-cover"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="max-w-[200px] truncate text-sm font-medium sm:max-w-[260px]">
                {user.firstName} {user.lastName}
              </h4>
              <span className={isPro ? "badge-pro" : "badge-basic"}>
                {isPro ? <SparklesIcon className="h-3.5 w-3.5" /> : null}
                {isPro ? "PRO" : "BASIC"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
