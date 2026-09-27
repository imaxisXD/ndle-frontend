import { PaperPlaneRightIcon, RobotIcon, SparkleIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { BklitVerticalBarChart } from "@/components/charts/bklit-chart-kit";
import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";
import { cn } from "@/lib/utils";
import { HOURLY_CLICKS } from "./sample-data";

/* The AI chart builder's own layout: the question, a thinking beat, then the
   chart it draws, built with the dashboard's hourly chart. Shared by the
   tour's Ask stop, the hero demo (which types the question in first) and the
   features bento (compact). */

export const ASK = {
  question: "When do my links get clicked the most?",
  answer: "Two peaks: around 10:00 and 20:00. Post just before them.",
} as const;

export function AskCard({
  draft = "",
  focused = false,
  asked = true,
  answered,
  compact = false,
  hideField = compact,
  className,
}: {
  /** Typed into the field but not sent yet. */
  draft?: string;
  focused?: boolean;
  /** The question has been sent and sits in the thread. */
  asked?: boolean;
  answered: boolean;
  /** For small frames, like a bento panel: the answer draws the same hourly
      bars without their card. */
  compact?: boolean;
  /** Leave the field off, e.g. once a small frame needs the room for the
      answer. Off by default unless compact. */
  hideField?: boolean;
  className?: string;
}) {
  return (
    // A column, so in a fixed-height frame the field sits at the bottom like a
    // chat's; at natural height it lays out as before.
    <div className={cn("flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-xs", className)}>
      <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-5 py-3">
        <span className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <SparkleIcon size={20} weight="duotone" className="text-amber-500" />
          Ask AI to Create Charts
        </span>
      </div>
      <div className={cn("min-h-0 flex-1", compact ? "space-y-3 p-3" : "space-y-4 p-4")}>
        {asked ? (
          <div className="h2-settle flex gap-3 rounded-lg bg-zinc-100 p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
              <UserIcon size={16} weight="bold" />
            </span>
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">You</p>
              <p className="text-sm text-zinc-900">{ASK.question}</p>
            </div>
          </div>
        ) : (
          <p className="px-1 py-3 text-sm text-zinc-500">Ask about your clicks, and ndle draws the chart.</p>
        )}
        {asked && (
          <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
              <RobotIcon size={16} weight="bold" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-2 text-xs font-medium text-zinc-500">ndle</p>
              {answered ? (
                <div className="h2-settle space-y-3">
                  <p className="text-sm text-zinc-900">{ASK.answer}</p>
                  {compact ? (
                    <BklitVerticalBarChart data={HOURLY_CLICKS} heightClassName="h-[88px]" labelKey="hour" valueKey="clicks" />
                  ) : (
                    <HourlyActivityChart data={HOURLY_CLICKS} />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 py-2" aria-label="Thinking">
                  <span className="size-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                  <span className="size-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                  <span className="size-2 animate-bounce rounded-full bg-zinc-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div aria-hidden className={cn("flex items-center gap-3 border-t border-zinc-200 px-4 py-3", hideField && "hidden")}>
        <span
          data-demo="ask-field"
          className={cn(
            "flex h-[38px] min-w-0 flex-1 items-center rounded-md border px-3 text-sm transition-[border-color,box-shadow] duration-150",
            focused ? "border-[oklch(0.78_0.15_88)] ring-[3px] ring-[oklch(0.86_0.17_88/0.35)]" : "border-zinc-200",
          )}
        >
          {draft && <span className="truncate text-zinc-900">{draft}</span>}
          {focused && <span className="h2-caret ml-px h-4 w-px shrink-0 bg-zinc-900" />}
          {!draft && <span className="text-zinc-400">Describe the chart you want...</span>}
        </span>
        <span data-demo="ask-send" className={cn("transition-colors duration-150", draft ? "text-zinc-900" : "text-zinc-400")}>
          <PaperPlaneRightIcon size={18} />
        </span>
      </div>
    </div>
  );
}
