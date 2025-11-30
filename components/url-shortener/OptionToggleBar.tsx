"use client";

import { Button } from "@/components/ui/button";

type Option = { key: string; label: string };

export function OptionToggleBar({
  options,
  value,
  onToggle,
}: {
  options: Array<Option>;
  value: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="border-border bg-muted/20 flex w-full flex-wrap gap-2 rounded-lg border p-2">
      {options.map((opt) => {
        const active = value.includes(opt.key);
        return (
          <Button
            key={opt.key}
            type="button"
            size="sm"
            variant={active ? "default" : "secondary"}
            className={active ? "bg-accent hover:bg-accent/90 text-black" : ""}
            onClick={() => onToggle(opt.key)}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
