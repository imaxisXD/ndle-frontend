/**
 * Doodle icons — hand-drawn social marks for the pulp landing page.
 *
 * Drawn like a felt-tip marker: one weight, round caps, lines that bow a
 * little instead of running straight, and corners that overshoot where a
 * hand would lift the pen. No ghost strokes — those read as smudges at
 * small sizes.
 */

import type { SVGProps } from "react";

type DoodleProps = SVGProps<SVGSVGElement> & { size?: number };

function Frame({ size = 20, children, ...rest }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** X — one fat inked diagonal, one thin one crossing it, like the mark itself. */
export function DoodleX(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* thick stroke: a wobbly filled sliver, top-left to bottom-right */}
      <path
        d="M4.4 4.6c1-.4 2-.6 3.1-.5 3.9 4.5 8 9.4 12.3 14.6-.9.6-1.9.9-3 1C12.8 15 8.7 10 4.4 4.6Z"
        fill="currentColor"
        stroke="none"
      />
      {/* thin stroke: bottom-left to top-right, bowing slightly */}
      <path d="M4.9 19.4c2.3-2.7 4.6-5.3 7-7.8 2.4-2.6 4.8-5 7.3-7.3" />
    </Frame>
  );
}

/** LinkedIn — a marker-drawn rounded square with "in" lettered inside. */
export function DoodleLinkedIn(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* frame, started at top-left and overshooting where the pen lifts */}
      <path d="M6.6 4.3c3.8-.2 7.6-.2 11.4 0 .9 0 1.6.7 1.7 1.6.2 4 .2 8 0 12 0 .9-.8 1.7-1.7 1.7-3.9.2-7.8.2-11.7 0-.9 0-1.6-.8-1.6-1.7-.2-4-.2-8 0-12 0-.9.7-1.6 1.6-1.6l1.4 0" />
      {/* i */}
      <path d="M8.4 10.6c.1 2.1.1 4.1 0 6.2" />
      <path d="M8.4 7.6h.1" strokeWidth={2.8} />
      {/* n */}
      <path d="M11.7 10.5c.1 2.1.1 4.2 0 6.3" />
      <path d="M11.8 12.6c.6-1.3 1.6-2.1 2.8-2.1 1.4 0 2.3 1 2.3 2.6.1 1.3 0 2.5-.1 3.8" />
    </Frame>
  );
}

/** GitHub — a doodled octocat head: round face, two ears, dot eyes, small mouth. */
export function DoodleGitHub(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* one continuous outline: left ear, top of head, right ear, then around */}
      <path d="M7.6 6.9 6.9 3.4l3.5 2.1c1-.4 2.1-.4 3.2 0l3.5-2.1-.7 3.5A7.8 7.4 8 1 1 7.6 6.9Z" />
      {/* eyes */}
      <path d="M9.2 12.2h.1" strokeWidth={2.8} />
      <path d="M14.7 12.2h.1" strokeWidth={2.8} />
      {/* mouth */}
      <path d="M10.4 15.3c.5.7 1 .9 1.5.4.5.6 1.1.5 1.7-.3" strokeWidth={1.7} />
    </Frame>
  );
}
