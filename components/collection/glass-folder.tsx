"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { useFavicon } from "@/hooks/use-favicon";
import { cn } from "@/lib/utils";

/**
 * A collection as a frosted folder: a solid back with a tab, the newest links
 * peeking out as little preview sheets, and a tinted glass front that blurs
 * whatever sits behind it. Any collection colour works; the glass, back, and
 * label ink are all derived from it.
 *
 * Geometry is drawn on a 300 x 252 frame and placed in percentages, with type
 * in container units, so the folder fills whatever width it is given.
 * Everything renders as spans so it can sit inside a link or a button.
 */

type Tone = {
  front: string;
  back: string;
  ink: string;
  soft: string;
  shadow: string;
  rim: string;
};

type Rgb = [number, number, number];

const HEX = /^#([0-9a-f]{6})$/i;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as Rgb;
const rgba = ([r, g, b]: Rgb, alpha = 1) => `rgba(${r},${g},${b},${alpha})`;

/** Glass tones for any 6-digit hex colour. Dark colours get light type. */
export function glassTone(color: string): Tone {
  const match = HEX.exec(color.trim());
  const n = match ? parseInt(match[1], 16) : 0x141312;
  const base: Rgb = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  const light = (0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]) / 255 >= 0.4;

  if (!light) {
    return {
      front: rgba(mix(base, WHITE, 0.08), 0.8),
      back: rgba(mix(base, BLACK, 0.35)),
      ink: "#f4f3ef",
      soft: "rgba(244,243,239,0.7)",
      shadow: rgba(mix(base, BLACK, 0.5), 0.4),
      rim: "rgba(255,255,255,0.16)",
    };
  }
  const ink = mix(base, BLACK, 0.72);
  return {
    front: rgba(mix(base, WHITE, 0.35), 0.64),
    back: rgba(mix(base, BLACK, 0.08)),
    ink: rgba(ink),
    soft: rgba(ink, 0.75),
    shadow: rgba(base, 0.34),
    rim: "rgba(255,255,255,0.58)",
  };
}

type Pose = "rest" | "lift" | "open";
type Place = { x: string; y: string; rotate: number };

// Offsets are in percent of a sheet's own size, so they scale with the folder.
const SHEETS: Array<Record<Pose, Place>> = [
  {
    rest: { x: "-49%", y: "9%", rotate: -9 },
    lift: { x: "-54%", y: "-4%", rotate: -12 },
    open: { x: "-70%", y: "-25%", rotate: -16 },
  },
  {
    rest: { x: "0%", y: "3%", rotate: 1 },
    lift: { x: "0%", y: "-12%", rotate: 0 },
    open: { x: "0%", y: "-37%", rotate: -1 },
  },
  {
    rest: { x: "48%", y: "11%", rotate: 8 },
    lift: { x: "52%", y: "-3%", rotate: 11 },
    open: { x: "70%", y: "-23%", rotate: 16 },
  },
];

// An empty collection keeps one blank sheet sunk into the folder.
const EMPTY: Record<Pose, Place> = {
  rest: { x: "0%", y: "22%", rotate: 1 },
  lift: { x: "0%", y: "8%", rotate: 0 },
  open: { x: "0%", y: "-12%", rotate: 0 },
};

// Hover fires constantly while scanning a grid, so settle fast and barely overshoot.
const SPRING = { type: "spring", stiffness: 240, damping: 24 } as const;

export function GlassFolder({
  previewUrls = [],
  color,
  label,
  meta,
  tilt = 0,
  lift = true,
  hovered,
  open = false,
  className,
}: {
  /** Full URLs whose favicons fill the sheets, newest first. Only three are shown. */
  previewUrls?: readonly string[];
  /** A 6-digit hex colour, such as the collection's colour. */
  color: string;
  /** The name written on the glass. */
  label: ReactNode;
  /** A small line under the name, such as the link count. */
  meta?: ReactNode;
  /** Resting rotation in degrees; hovering straightens it. */
  tilt?: number;
  /** Raise the whole folder on hover. Turn off when a parent moves it instead. */
  lift?: boolean;
  /** Controlled hover state. When omitted the folder tracks its own pointer. */
  hovered?: boolean;
  open?: boolean;
  className?: string;
}) {
  const [pointer, setPointer] = useState(false);
  const isHovered = hovered ?? pointer;
  const pose: Pose = open ? "open" : isHovered ? "lift" : "rest";
  const t = glassTone(color);
  const sheets =
    previewUrls.length === 0
      ? [{ url: null, place: EMPTY }]
      : SHEETS.map((place, i) => ({ url: previewUrls[i] ?? null, place }));

  return (
    <motion.span
      className={cn("relative block aspect-[300/252] w-full [container-type:inline-size] [perspective:900px]", className)}
      onMouseEnter={hovered === undefined ? () => setPointer(true) : undefined}
      onMouseLeave={hovered === undefined ? () => setPointer(false) : undefined}
      initial={false}
      animate={{ rotate: pose === "rest" ? tilt : tilt * 0.3, y: lift && pose !== "rest" ? -6 : 0 }}
      transition={SPRING}
    >
      {/* Back plate and tab */}
      <span
        aria-hidden
        className="absolute top-[10.3%] left-[6.7%] h-[11.9%] w-[36.7%] rounded-t-[4.7cqw]"
        style={{ background: t.back }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-[17.5%] bottom-[3.2%] rounded-[6.7cqw]"
        style={{ background: t.back, boxShadow: `inset 0 1px 0 ${t.rim}` }}
      />

      {/* The newest links */}
      <span aria-hidden className="absolute inset-x-0 top-[7.1%] flex justify-center">
        {sheets.map(({ url, place }, i) => (
          <motion.span
            key={url ?? `blank-${i}`}
            className="absolute block w-[40.7%]"
            initial={false}
            animate={place[pose]}
            transition={{ ...SPRING, delay: pose === "open" ? i * 0.04 : 0 }}
          >
            <Sheet url={url} />
          </motion.span>
        ))}
      </span>

      {/* Frosted front */}
      <motion.span
        className="absolute inset-x-0 top-[34.9%] bottom-0 block origin-bottom overflow-hidden rounded-[7.3cqw] backdrop-blur-[10px] backdrop-saturate-150"
        style={{
          background: t.front,
          boxShadow: `inset 0 1px 0 ${t.rim}, inset 0 0 0 1px ${t.rim}, inset 0 -10px 24px rgba(0,0,0,0.05), 0 1px 1px rgba(0,0,0,0.05), 0 22px 40px -18px ${t.shadow}`,
        }}
        initial={false}
        animate={{ rotateX: pose === "open" ? -16 : pose === "lift" ? -8 : 0 }}
        transition={SPRING}
      >
        <span aria-hidden className="absolute -top-[13cqw] -left-[11cqw] h-[48cqw] w-[69cqw] rounded-full bg-white/25 blur-2xl" />
        <span className="absolute inset-x-[7.3cqw] bottom-[6.3cqw] flex flex-col gap-[1.6cqw] text-left">
          <span
            className="truncate text-[clamp(15px,7.3cqw,22px)] leading-[1.1] font-medium tracking-[-0.02em]"
            style={{ color: t.ink }}
          >
            {label}
          </span>
          {meta && (
            <span
              className="truncate font-mono text-[clamp(11px,3.7cqw,12px)] leading-none tabular-nums"
              style={{ color: t.soft }}
            >
              {meta}
            </span>
          )}
        </span>
      </motion.span>
    </motion.span>
  );
}

/** A link preview sheet: favicon and host on top, a preview block under it. */
function Sheet({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  const { faviconUrl, isLoading, hostname } = useFavicon(url);
  const icon =
    isLoading || !faviconUrl || failed ? (
      <GlobeSimpleIcon weight="duotone" className="size-full text-zinc-400" />
    ) : (
      <Image
        src={faviconUrl}
        alt=""
        width={32}
        height={32}
        unoptimized
        onError={() => setFailed(true)}
        className="size-full rounded-[1.3cqw] object-contain"
      />
    );

  return (
    <span className="block aspect-[122/150] w-full rounded-[4.7cqw] bg-white p-[3.3cqw] shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.08)]">
      {url ? (
        <span className="flex items-center gap-[2cqw]">
          <span className="size-[5.3cqw] shrink-0">{icon}</span>
          <span className="truncate text-[3.5cqw] leading-none font-medium text-zinc-700">{hostname ?? url}</span>
        </span>
      ) : (
        <span className="block h-[2cqw] w-[70%] rounded-full bg-zinc-200" />
      )}
      <span className="mt-[2.4cqw] flex h-[20.7cqw] items-center justify-center rounded-[3cqw] bg-[linear-gradient(135deg,#f4f3ef,#e8e6e0)]">
        {url && <span className="size-[10.7cqw] opacity-90">{icon}</span>}
      </span>
      <span className="mt-[2.7cqw] block h-[2cqw] w-[86%] rounded-full bg-zinc-200" />
      <span className="mt-[2cqw] block h-[2cqw] w-[58%] rounded-full bg-zinc-200" />
    </span>
  );
}
