import { ConvexError } from "convex/values";

/* What the hero shortener says when a link doesn't go through. In
   production Convex hides a failed call's message behind "[Request ID: …]
   Server Error", so the reason has to come from a ConvexError's data, never
   from `error.message`. The server's reasons are written for the dashboard;
   the ones below are reworded for a guest on the home page. */

export type Problem = {
  /** What went wrong, in one short sentence. */
  title: string;
  /** More about it, when there's more to say. */
  detail?: string;
  /** When a free account is the way on: the rest of the sentence after the
      "Sign up free" link, e.g. "to keep shortening." */
  signUp?: string;
};

/** A problem found before the link reaches the server. */
export class ShortenProblem extends Error {
  constructor(readonly problem: Problem) {
    super(problem.title);
  }
}

export const PROBLEMS = {
  empty: { title: "Paste a link first." },
  invalid: { title: "That doesn't look like a link.", detail: "Try one like example.com/page." },
  connecting: { title: "Still connecting.", detail: "Try again in a second." },
  unavailable: { title: "Guest links are unavailable right now.", signUp: "to shorten links." },
  // A failure with no reason attached: the server broke, not the link.
  failed: { title: "ndle couldn't shorten that just now.", detail: "Try again in a moment." },
  copyBlocked: { title: "Copying was blocked.", detail: "Select the link and copy it by hand." },
} satisfies Record<string, Problem>;

/* The server's reasons (convex/urlMainFuction.ts and the guest session
   checks), matched on their wording. Anything else it says, such as why a
   link failed validation, is already written for people and is shown as it
   is. */
const REWORDED: Array<{ match: RegExp; problem: (found: RegExpMatchArray) => Problem }> = [
  {
    match: /allows up to (\d+) links each day/i,
    problem: ([, limit]) => ({ title: `You've made today's ${limit} guest links.`, signUp: "to keep shortening." }),
  },
  {
    match: /from your network reached today's limit of (\d+)/i,
    problem: ([, limit]) => ({
      title: `Your network has made today's ${limit} guest links.`,
      signUp: "to keep shortening.",
    }),
  },
  {
    match: /paused for now because of unusually high demand/i,
    problem: () => ({
      title: "Guest links are paused for now.",
      detail: "ndle is seeing unusually high demand.",
      signUp: "to keep shortening, or try again later.",
    }),
  },
  {
    match: /domain has been blocked/i,
    problem: () => ({ title: "ndle doesn't shorten links to this site.", detail: "Its domain is blocked for safety reasons." }),
  },
  {
    match: /guest sessions are not configured/i,
    problem: () => PROBLEMS.unavailable,
  },
  {
    match: /guest links were moved to an account/i,
    problem: () => ({
      title: "This browser's guest links moved into an account.",
      detail: "Sign in to keep shortening, or refresh the page to start over as a guest.",
    }),
  },
  {
    match: /guest session (is invalid|is required|not found)/i,
    problem: () => ({ title: "Your guest session ran out.", detail: "Refresh the page and try again." }),
  },
];

/** The reason a ConvexError carries: its data, as a string or `{ message }`. */
export function serverReason(error: unknown): string | null {
  if (!(error instanceof ConvexError)) return null;
  const data: unknown = error.data;
  if (typeof data === "string") return data.trim() || null;
  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return data.message.trim() || null;
  }
  return null;
}

/** What to tell a guest about any failure while shortening. */
export function problemFor(error: unknown): Problem {
  if (error instanceof ShortenProblem) return error.problem;
  const reason = serverReason(error);
  if (!reason) return PROBLEMS.failed;
  for (const { match, problem } of REWORDED) {
    const found = reason.match(match);
    if (found) return problem(found);
  }
  return { title: reason };
}
