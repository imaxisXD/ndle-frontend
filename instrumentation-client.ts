import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  ui_host: "https://us.posthog.com", // Required for toolbar when using reverse proxy
  defaults: "2025-11-30",
});
