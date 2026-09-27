"use client";

import { useState } from "react";
import { GlassFolder } from "@/components/collection/glass-folder";
import { FOCUS } from "./kit";

/* The Collections page's glass folder as a toy: hover lifts the sheets,
   click fans them out. */

export function DemoFolder({
  name,
  count,
  urls,
  color,
  tilt,
  open,
}: {
  name: string;
  count: number;
  urls: readonly string[];
  color: string;
  tilt: number;
  /** Controlled open state, used for the first-view sequence. */
  open?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [clicked, setClicked] = useState(false);
  const isOpen = open ?? clicked;

  return (
    <button
      type="button"
      aria-label={`${name} collection, ${count} links`}
      aria-pressed={isOpen}
      onClick={() => setClicked((c) => !c)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setClicked(false);
      }}
      onBlur={() => setClicked(false)}
      className={`block w-[300px] cursor-pointer rounded-[22px] [-webkit-tap-highlight-color:transparent] ${FOCUS}`}
    >
      <GlassFolder previewUrls={urls} color={color} label={name} meta={`${count} links`} tilt={tilt} hovered={hover} open={isOpen} />
    </button>
  );
}
