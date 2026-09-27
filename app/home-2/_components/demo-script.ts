/* ─────────────────────────────────────────────────────────
 * HERO DEMO STORYBOARD
 *
 * One pass through the dashboard behind the glass, with sample data. Read
 * top to bottom; every time is ms from the start of the pass. The clock
 * (demo-clock.tsx) drives it all, so Replay and the chapter buttons are
 * seeks, and every chapter can be entered at its first frame.
 *
 *  1 · SHORTEN                                         Dashboard
 *      500ms   cursor glides in to the link field
 *     1050ms   click; the field focuses
 *     1250ms   the long link types in (18ms a character)
 *     2800ms   cursor heads for Shorten
 *     3350ms   click; "Shortening…"
 *     3900ms   the new link opens into Recent Links; "Short link ready"
 *     4700ms   its first check lands: pending → healthy
 *     5200ms   its clicks start ticking up (every 280ms)
 *
 *  2 · TRACK                                           Analytics
 *     6600ms   cursor to Analytics in the rail
 *     7150ms   click; the page opens, the charts draw, the counter ticks
 *
 *  3 · ASK                                             Analytics, lower down
 *     9400ms   cursor drifts over the charts
 *     9800ms   the page scrolls to the AI chart builder (1000ms)
 *    10900ms   cursor to the question field; click at 11400ms
 *    11600ms   the question types in (30ms a character)
 *    12900ms   cursor to send; click at 13400ms; ndle thinks
 *    14600ms   the answer lands and the hourly chart draws
 *
 *  4 · ALERT                                           Monitoring
 *    16800ms   cursor to Monitoring in the rail; click at 17350ms
 *    18700ms   /launch is being checked…
 *    19200ms   …and fails: 503, the light behind the glass turns red
 *    19800ms   the DOWN email lands
 *    23000ms   back online: the light turns yellow, RECOVERED email lands
 *    23900ms   cursor to /launch in the table; click at 24450ms
 *    24450ms   the link's own page opens on Health: its clicks, its
 *              status, and the incident it just came through
 *    26200ms   cursor fades out
 *    27500ms   end, Replay. The pass rests on the link's page.
 * ───────────────────────────────────────────────────────── */

export const T = {
  cursorIn:        500,   // cursor glides in to the link field
  fieldClick:     1050,   // click: the field focuses
  typeUrl:        1250,   // the long link types in
  toShorten:      2800,   // cursor heads for Shorten
  shortenClick:   3350,   // press: "Shortening…"
  linkReady:      3900,   // new row opens in, toast
  firstCheck:     4700,   // pending → healthy
  clicksStart:    5200,   // its clicks tick up
  toAnalytics:    6600,   // cursor to Analytics in the rail
  analyticsClick: 7150,   // Analytics opens
  toCharts:       9400,   // cursor drifts over the charts
  scroll:         9800,   // page scrolls to the chart builder
  toAskField:    10900,   // cursor to the question field
  askClick:      11400,   // click: the field focuses
  typeQuestion:  11600,   // the question types in
  toSend:        12900,   // cursor to send
  sendClick:     13400,   // question posts, ndle thinks
  answer:        14600,   // answer and chart land
  toMonitoring:  16800,   // cursor to Monitoring in the rail
  monitoringClick: 17350, // Monitoring opens
  check:         18700,   // /launch is being checked
  down:          19200,   // …and fails: 503, light turns red
  alert:         19800,   // DOWN email lands
  recovered:     23000,   // back online, light turns yellow
  toLink:        23900,   // cursor to /launch in the table
  linkClick:     24450,   // the link's page opens
  cursorOut:     26200,   // cursor fades out
  end:           27500,   // end of the pass, resting on the link's page
} as const;

/** The design size of the dashboard behind the glass. The frame scales it
    down to fit, so the product always lays out at desktop size. */
export const STAGE = { width: 1176, height: 720 } as const;

export const CHAPTERS = [
  { id: "shorten", label: "Shorten", start: 0 },
  { id: "track", label: "Track clicks", start: T.toAnalytics },
  { id: "ask", label: "Ask AI", start: T.toCharts },
  { id: "alert", label: "Get alerts", start: T.toMonitoring },
] as const;

export type Page = "home" | "analytics" | "monitoring" | "link";

export function pageAt(t: number): Page {
  if (t < T.analyticsClick) return "home";
  if (t < T.monitoringClick) return "analytics";
  if (t < T.linkClick) return "monitoring";
  return "link";
}

export function chapterAt(t: number) {
  return lastAt(CHAPTERS.map((c) => c.start), t);
}

/** The last frame of a chapter, where everything it shows has settled. */
export function chapterEnd(index: number) {
  const next = CHAPTERS[index + 1];
  return next ? next.start - 1 : T.end;
}

/* The pointer. It enters from below the glass, travels to each target (a
   `data-demo` element, aimed at `ax`/`ay` of its box) and clicks. */
export const CURSOR = {
  enter: { x: 940, y: 790 },                               // below the pane, lower right
  spring: { stiffness: 170, damping: 26, mass: 1 },        // ~600ms glide, no overshoot
  pressMs: 220,                                            // one click, down and up
  moves: [
    { at: T.cursorIn,        to: "url-field", ax: 0.22 },
    { at: T.toShorten,       to: "shorten" },
    { at: T.toAnalytics,     to: "rail-analytics" },
    { at: T.toCharts,        to: "charts", ax: 0.62, ay: 0.45 },
    { at: T.toAskField,      to: "ask-field", ax: 0.3 },
    { at: T.toSend,          to: "ask-send" },
    { at: T.toMonitoring,    to: "rail-monitoring" },
    { at: T.monitoringClick + 700, to: "launch-row", ax: 0.66, ay: 0.7 },
    { at: T.toLink,          to: "launch-link", ax: 0.4 },
    { at: T.linkClick + 700, to: "link-clicks", ax: 0.72, ay: 0.8 },
  ],
  clicks: [T.fieldClick, T.shortenClick, T.analyticsClick, T.askClick, T.sendClick, T.monitoringClick, T.linkClick],
} as const;

export const CURSOR_MOVE_TIMES = CURSOR.moves.map((m) => m.at);

/** Typing speed, ms per character. */
export const TYPE = { url: 18, question: 30 } as const;

export const LONG_URL = "https://acme.com/launch-week?utm_source=newsletter&utm_campaign=spring";

/* The link made in chapter 1, and its clicks as they land. */
export const NEW_LINK = {
  slug: "launch",
  destination: "https://acme.com/launch-week",
  clicks: [1, 3, 8, 14, 23, 31, 38],   // one step per `clickEvery`
  clickEvery: 280,
} as const;

/* The live counter on Analytics: a starting total and what each tick adds. */
export const LIVE_COUNT = {
  base: 48_213,
  every: 650,
  adds: [3, 1, 4, 2, 5, 2, 3, 1, 4, 3],
} as const;

/* The /launch link's own counter on its page, minutes after the newsletter
   went out, still climbing. */
export const LINK_COUNT = {
  base: 1_236,
  every: 700,
  adds: [2, 1, 3, 1, 2, 4, 1, 2],
} as const;

/* ───────── helpers: pure functions of time ───────── */

export function between(t: number, from: number, to: number) {
  return t >= from && t < to;
}

/** Index of the last time at or before `t`, or -1. Times are ascending. */
export function lastAt(times: readonly number[], t: number) {
  let index = -1;
  for (let i = 0; i < times.length && times[i] <= t; i++) index = i;
  return index;
}

export function typedAt(text: string, start: number, perChar: number, t: number) {
  if (t < start) return "";
  return text.slice(0, Math.min(text.length, Math.floor((t - start) / perChar) + 1));
}

/** Walk a list of values, one step every `every` ms from `start`. */
export function stepAt(values: readonly number[], start: number, every: number, t: number) {
  if (t < start) return 0;
  return values[Math.min(values.length - 1, Math.floor((t - start) / every))];
}

/** A counter that ticks up from `count.base` once `start` has passed. */
function countAt(count: { base: number; every: number; adds: readonly number[] }, start: number, t: number) {
  if (t < start) return count.base;
  const ticks = Math.floor((t - start) / count.every);
  let total = count.base;
  for (let i = 0; i < ticks; i++) total += count.adds[i % count.adds.length];
  return total;
}

export function liveCountAt(t: number) {
  return countAt(LIVE_COUNT, T.analyticsClick, t);
}

export function linkCountAt(t: number) {
  return countAt(LINK_COUNT, T.linkClick, t);
}

/** "Checked Ns ago" on the monitoring table, ticking with the clock; a
    check lands every 60 seconds. */
export function checkedAgo(offsetSeconds: number, t: number) {
  const elapsed = Math.max(0, Math.floor((t - T.monitoringClick) / 1000));
  const seconds = (offsetSeconds + elapsed) % 60;
  return seconds < 2 ? "just now" : `${seconds}s ago`;
}
