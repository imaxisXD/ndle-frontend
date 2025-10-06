import { Settings } from "@/components/settings";

export default function SettingsRoute() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
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
