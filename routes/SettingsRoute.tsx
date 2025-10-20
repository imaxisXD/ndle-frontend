import { Settings } from "@/components/settings";

export default function SettingsRoute() {
  return (
    <>
      <header>
        <h1 className="font-doto roundness-100 text-4xl font-black">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">Configure ndle</p>
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
