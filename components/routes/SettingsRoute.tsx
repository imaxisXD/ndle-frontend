import { Settings } from "@/components/settings";

export default function SettingsRoute() {
  return (
    <>
      <header>
        <h1 className="font-mono text-3xl font-medium tracking-tight">
          Settings
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Configure ndle
        </p>
      </header>
      <section aria-labelledby="settings-section-heading">
        <h2 className="sr-only" id="settings-section-heading">
          Settings
        </h2>
        <Settings />
      </section>
    </>
  );
}
