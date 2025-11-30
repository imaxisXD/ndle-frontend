import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "item-center pointer-events-none inline-flex h-5 w-fit min-w-5 justify-center gap-1 rounded-sm bg-gradient-to-tr from-black to-black/80 text-sm font-normal text-white no-underline select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-black/20 [[data-slot=tooltip-content]_&]:text-white",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-0.5 no-underline", className)}
      {...props}
    />
  );
}

export { Kbd, KbdGroup };
