"use client";

import { Button } from "@/components/ui/button";
import { Inset } from "@/components/ui/inset";

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
    <Inset className="flex w-full flex-wrap gap-2 rounded-lg p-2">
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
    </Inset>
  );
}
