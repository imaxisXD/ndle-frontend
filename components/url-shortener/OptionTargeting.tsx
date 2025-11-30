"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const COUNTRY_CODES = [
  "US",
  "IN",
  "GB",
  "DE",
  "FR",
  "CA",
  "AU",
  "BR",
  "SG",
  "JP",
];

const DEVICES = ["mobile", "desktop", "tablet", "bot"];
const OS_LIST = ["iOS", "Android", "Windows", "macOS", "Linux"];

export function OptionTargeting({ form }: { form: any }) {
  const countries: string[] = form.watch("targetingCountries") || [];
  const devices: string[] = form.watch("targetingDevices") || [];
  const osList: string[] = form.watch("targetingOs") || [];
  const mode: string = form.watch("targetingCountryMode") || "include";

  const toggleArrayValue = (path: string, val: string) => {
    const curr: string[] = form.getValues(path) || [];
    const next = curr.includes(val)
      ? curr.filter((v) => v !== val)
      : [...curr, val];
    form.setValue(path, next, { shouldDirty: true });
  };

  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="mt-4 space-y-4">
        {/* Countries */}
        <FormField
          control={form.control}
          name="targetingCountryMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Country mode</FormLabel>
              <FormControl>
                <RadioGroup
                  className="flex gap-4"
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      id="ctry-include"
                      value="include"
                      size="sm"
                    />
                    <label htmlFor="ctry-include" className="text-sm">
                      Include
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      id="ctry-exclude"
                      value="exclude"
                      size="sm"
                    />
                    <label htmlFor="ctry-exclude" className="text-sm">
                      Exclude
                    </label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <div className="text-muted-foreground mb-2 text-xs">Countries</div>
          <div className="flex flex-wrap gap-2">
            {COUNTRY_CODES.map((code) => {
              const active = countries.includes(code);
              return (
                <Badge
                  key={code}
                  className={
                    active ? "cursor-pointer" : "cursor-pointer opacity-60"
                  }
                  variant="default"
                  onClick={() => toggleArrayValue("targetingCountries", code)}
                >
                  {code}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Devices */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">Devices</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {DEVICES.map((d) => (
              <FormField
                key={d}
                control={form.control}
                name="targetingDevices"
                render={() => (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`device-${d}`}
                      checked={devices.includes(d)}
                      onCheckedChange={() =>
                        toggleArrayValue("targetingDevices", d)
                      }
                    />
                    <label htmlFor={`device-${d}`}>{d}</label>
                  </div>
                )}
              />
            ))}
          </div>
        </div>

        {/* OS */}
        <div className="space-y-2">
          <div className="text-muted-foreground text-xs">Operating Systems</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {OS_LIST.map((o) => (
              <FormField
                key={o}
                control={form.control}
                name="targetingOs"
                render={() => (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id={`os-${o}`}
                      checked={osList.includes(o)}
                      onCheckedChange={() => toggleArrayValue("targetingOs", o)}
                    />
                    <label htmlFor={`os-${o}`}>{o}</label>
                  </div>
                )}
              />
            ))}
          </div>
        </div>

        <div className="text-muted-foreground text-xs">
          Mode: <span className="font-medium">{mode}</span> {countries.length}{" "}
          countries, {devices.length} devices, {osList.length} OS
        </div>
      </div>
    </div>
  );
}
