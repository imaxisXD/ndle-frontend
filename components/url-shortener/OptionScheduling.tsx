"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarPreset } from "@/components/ui/calendar-presets";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-select";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/base-collapsible";
import { Button } from "@/components/ui/button";

export function OptionScheduling({ form }: { form: any }) {
  const expiresEnabled = form.watch("expiresEnabled");
  const activateAtEnabled = form.watch("activateAtEnabled");
  const expireMode: string = form.watch("expireMode") || "none";

  const activateAtValue: string | undefined = form.watch("activateAt");
  const activateAtDate = useMemo(() => {
    return activateAtValue ? new Date(activateAtValue) : undefined;
  }, [activateAtValue]);
  const expiresAtValue: string | undefined = form.watch("expiresAt");
  const expiresAtDate = useMemo(() => {
    return expiresAtValue ? new Date(expiresAtValue) : undefined;
  }, [expiresAtValue]);

  const [open, setOpen] = useState<boolean>(() => !!expiresEnabled);

  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      {/* Activate at */}
      <FormField
        control={form.control}
        name="activateAtEnabled"
        render={({ field }) => (
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!field.value}
              onCheckedChange={field.onChange}
              id="opt-activate"
            />
            <label htmlFor="opt-activate">Activate at (start date)</label>
          </div>
        )}
      />

      <FormField
        control={form.control}
        name="activateAt"
        render={({ field }) => (
          <FormItem>
            <div className="flex pl-3">
              <CalendarPreset
                disabled={!activateAtEnabled}
                isPro={false}
                value={activateAtDate}
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
              name="expireMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Expiration type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="grid gap-2 md:grid-cols-2"
                      value={field.value || "datetime"}
                      onValueChange={(v) => field.onChange(v)}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <RadioGroupItem
                          id="exp-datetime"
                          value="datetime"
                          size="sm"
                        />
                        <label htmlFor="exp-datetime">On date & time</label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RadioGroupItem
                          id="exp-total"
                          value="totalClicks"
                          size="sm"
                        />
                        <label htmlFor="exp-total">After total clicks</label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RadioGroupItem
                          id="exp-duration"
                          value="duration"
                          size="sm"
                        />
                        <label htmlFor="exp-duration">After duration</label>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <RadioGroupItem
                          id="exp-inactivity"
                          value="inactivity"
                          size="sm"
                        />
                        <label htmlFor="exp-inactivity">After inactivity</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Datetime */}
            {expireMode === "datetime" && (
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
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
            )}

            {/* Total clicks */}
            {expireMode === "totalClicks" && (
              <FormField
                control={form.control}
                name="expireTotalClicks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total allowed clicks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Duration */}
            {expireMode === "duration" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="expireDurationAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="expireDurationUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Inactivity */}
            {expireMode === "inactivity" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="expireInactivityAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="expireInactivityUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">Minutes</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                              <SelectItem value="weeks">Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  );
}
