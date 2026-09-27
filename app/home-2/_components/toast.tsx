import type { ComponentType, ReactNode } from "react";
import { CheckIcon, ExclamationMarkIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { NEW_LINK } from "./demo-script";
import { SHORT_DOMAIN } from "./sample-data";

/* One toast for the whole page: the app's "Short link ready" in the hero
   demo, and the two monitoring alerts in both the hero demo and the
   features bento. A dark card that pops up from the bottom right with room
   around its two lines, a status dot for what happened, the headline, and
   one line of detail. Always mounted, so arriving and leaving are both
   transitions and a seek, Replay or loop never snaps them: in over 400ms
   from a little lower and smaller, out in 150ms, quieter than they came. A
   newer toast tucks the older one behind it, peeking out above. */

type ToastTone = "ready" | "down" | "up";

const TOAST_DOT: Record<ToastTone, { Icon: ComponentType<{ size?: number; weight?: "bold" }>; className: string }> = {
  ready: { Icon: CheckIcon, className: "bg-[var(--sig)] text-[#141312]" },
  down: { Icon: ExclamationMarkIcon, className: "bg-red-500 text-white" },
  up: { Icon: CheckIcon, className: "bg-green-500 text-white" },
};

export function Toast({
  shown,
  behind = false,
  tone,
  title,
  children,
}: {
  shown: boolean;
  /** A newer toast has landed in front of this one. */
  behind?: boolean;
  tone: ToastTone;
  title: ReactNode;
  children: ReactNode;
}) {
  const { Icon, className } = TOAST_DOT[tone];
  return (
    <div
      className={cn(
        "col-start-1 row-start-1 origin-bottom self-end transition-[opacity,translate,scale,filter]",
        !shown
          ? "translate-y-3 scale-[0.96] opacity-0 blur-[4px] duration-150 ease-out"
          : behind
            ? "-translate-y-3 scale-[0.94] opacity-60 blur-none duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-y-0 scale-100 opacity-100 blur-none duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
      )}
    >
      <div className="flex items-start gap-3.5 rounded-xl bg-[#141312] px-4 py-3.5 font-sans text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.1),0_1px_2px_oklch(0_0_0/0.2),0_16px_40px_-12px_oklch(0_0_0/0.45)]">
        <span className={cn("mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full", className)}>
          <Icon size={11} weight="bold" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm leading-5 font-medium">{title}</p>
          <p className="mt-1 truncate text-[13px] leading-5 text-white/55">{children}</p>
        </div>
      </div>
    </div>
  );
}

/** Where toasts land: the bottom right of whatever holds them, stacked in
    one spot. `className` moves the spot, e.g. clear of a slanted edge. */
export function ToastStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("absolute right-6 bottom-6 z-10 grid w-[340px]", className)}>{children}</div>;
}

/** The sample short link, as it reads inside a toast. */
export function ShortLink() {
  return <span className="font-mono text-white/90">{`${SHORT_DOMAIN}/${NEW_LINK.slug}`}</span>;
}

/* The two alerts ndle sends while /launch is down and when it's back. The
   caller decides when each is up; the recovery tucks the outage behind it. */
export function LinkAlertToasts({ down, up, className }: { down: boolean; up: boolean; className?: string }) {
  return (
    <ToastStack className={className}>
      <Toast
        shown={down}
        behind={up}
        tone="down"
        title={
          <>
            <ShortLink /> is down
          </>
        }
      >
        404 Not Found. We emailed you.
      </Toast>
      <Toast
        shown={up}
        tone="up"
        title={
          <>
            <ShortLink /> is back online
          </>
        }
      >
        Back on the next check. We emailed you again.
      </Toast>
    </ToastStack>
  );
}
