"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarPreset } from "@/components/ui/calendar-presets";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/base-collapsible";
import { Button } from "@/components/ui/button";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { UrlFormValues } from "../url-shortener";

export function OptionScheduling({
  form,
}: {
  form: UseFormReturn<UrlFormValues>;
}) {
  const expiresEnabled = useWatch({
    control: form.control,
    name: "expiresEnabled",
  });
  const expiresAtValue = useWatch({ control: form.control, name: "expiresAt" });
  const expiresAtDate = useMemo(() => {
    return expiresAtValue ? new Date(expiresAtValue) : undefined;
  }, [expiresAtValue]);

  const [open, setOpen] = useState<boolean>(() => !!expiresEnabled);

  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      {/* Expiration */}
      <FormField
        control={form.control}
        name="expiresEnabled"
        render={({ field }) => (
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!field.value}
              onCheckedChange={(v) => {
                const next = v === true;
                field.onChange(next);
                setOpen(next);
                if (next) {
                  const mode = form.getValues("expireMode");
                  if (!mode || mode === "none") {
                    form.setValue("expireMode", "datetime");
                  }
                } else {
                  form.setValue("expireMode", "none");
                }
              }}
              id="opt-expiration"
            />
            <label htmlFor="opt-expiration">Set expiration</label>
          </div>
        )}
      />

      <Collapsible open={open} onOpenChange={setOpen}>
        {expiresEnabled && (
          <div className="pl-3">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                {open ? "Hide expiration options" : "Show expiration options"}
              </Button>
            </CollapsibleTrigger>
          </div>
        )}
        <CollapsiblePanel>
          <div className="space-y-3 pl-3">
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Expiration date</FormLabel>
                  <div className="flex">
                    <CalendarPreset
                      disabled={!expiresEnabled}
                      isPro={true}
                      value={expiresAtDate}
                      onSelectDate={(d) => {
                        if (!d) {
                          field.onChange("");
                          return;
                        }
                        const v = format(d, "yyyy-MM-dd'T'HH:mm");
                        field.onChange(v);
                      }}
                      onUpgradeClick={() => null}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}
