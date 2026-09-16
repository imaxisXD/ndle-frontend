"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFavicon } from "@/hooks/use-favicon";

/**
 * Animated folder used on the collections page. The three "sheets" inside the
 * folder show the favicons of the collection's most recent links instead of
 * the generic lined-paper card. Slots without a link fall back to a blank sheet.
 */

type Theme = {
  backFill: string;
  backInsetShadow: string;
  flapFill: string;
  flapFillOpacity: number;
  flapStroke: string;
  flapInsetColor: string;
  cardFill: string;
  cardStroke: string;
  cardLineFill: string;
  cardInsetColor: string;
};

const themes = {
  black: {
    backFill: "black",
    backInsetShadow: "inset 0 0 6px 2px rgba(255,255,255,0.37)",
    flapFill: "#292929",
    flapFillOpacity: 0.25,
    flapStroke: "#979797",
    flapInsetColor: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0",
    cardFill: "#F1F1F1",
    cardStroke: "#E0E0E0",
    cardLineFill: "#D4D4D4",
    cardInsetColor: "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0",
  },
  white: {
    backFill: "#ffffff",
    backInsetShadow: "inset 0 0 6px 2px rgba(178,178,178,0.25)",
    flapFill: "#f5f5f5",
    flapFillOpacity: 0.85,
    flapStroke: "#d4d4d4",
    flapInsetColor: "0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0 0.6 0 0 0 0.15 0",
    cardFill: "#262626",
    cardStroke: "#404040",
    cardLineFill: "#737373",
    cardInsetColor: "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.15 0",
  },
  blue: {
    backFill: "#50B1FD",
    backInsetShadow: "inset 0 0 6px 2px rgba(255,255,255,0.35)",
    flapFill: "#3a9ae8",
    flapFillOpacity: 0.45,
    flapStroke: "#7ec8ff",
    flapInsetColor: "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.12 0",
    cardFill: "#F1F1F1",
    cardStroke: "#E0E0E0",
    cardLineFill: "#D4D4D4",
    cardInsetColor: "0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0",
  },
} as const satisfies Record<string, Theme>;

type ThemeName = keyof typeof themes;

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

/** True for a 6-digit hex color such as `#3b82f6`. Rejects names like `transparent`. */
export function isHexColor(value: string | undefined | null): value is string {
  return typeof value === "string" && HEX_COLOR.test(value.trim());
}

/** Mix a hex color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const match = HEX_COLOR.exec(hex.trim());
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    const target = amount > 0 ? 255 : 0;
    return Math.round(c + (target - c) * Math.abs(amount));
  };
  return `#${[16, 8, 0]
    .map((s) => channel(s).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Build a folder theme from a single accent color (e.g. the collection color). */
function themeFromAccent(accent: string): Theme {
  return {
    ...themes.blue,
    backFill: accent,
    flapFill: shade(accent, -0.12),
    // Opaque enough that the sheets behind it stay crisp instead of ghosting through.
    flapFillOpacity: 0.92,
    flapStroke: shade(accent, 0.35),
  };
}

const sizeScales = { xs: 0.5, sm: 0.65, md: 1, lg: 1.35 } as const;

const BASE_WIDTH = 321;
const BASE_HEIGHT = 270;
const CARD_WIDTH = 164;
const CARD_HEIGHT = 214;
const PREVIEW_SLOTS = 3;

const FLAP_PATH =
  "M0 25C0 11.1929 11.1929 0 25 0H136.084C143.044 0 149.689 2.90139 154.42 8.00608L178.08 33.5343C182.811 38.639 189.456 41.5404 196.416 41.5404H296C309.807 41.5404 321 52.7333 321 66.5404V216C321 229.807 309.807 241 296 241H25C11.1929 241 0 229.807 0 216V25Z";

type CollectionFolderProps = Omit<React.ComponentProps<"div">, "color"> & {
  /** Full URLs whose favicons fill the sheets, newest first. Only the first three are used. */
  previewUrls?: readonly string[];
  /** A preset theme name or any 6-digit hex accent color. */
  color?: ThemeName | (string & {});
  size?: keyof typeof sizeScales;
  /** Controlled hover state. When omitted the folder tracks its own pointer. */
  hovered?: boolean;
  /** Controlled open state. When omitted the folder toggles on click. */
  open?: boolean;
};

// Sheets rest high enough that the favicon tile clears the flap without hovering.
const CARD_MOTION = [
  {
    rest: { y: -58, x: 40, rotate: 10 },
    hover: { y: -80, x: 44, rotate: 13 },
    open: { y: -160, x: 70, rotate: 18 },
  },
  {
    rest: { y: -66, x: 3, rotate: 2 },
    hover: { y: -88, x: 2, rotate: 0 },
    open: { y: -180, x: 0, rotate: -3 },
  },
  {
    rest: { y: -70, x: -40, rotate: -5 },
    hover: { y: -94, x: -44, rotate: -8 },
    open: { y: -170, x: -65, rotate: -14 },
  },
] as const;

// A collection with no links shows one blank sheet sunk into the folder.
const EMPTY_MOTION = {
  rest: { y: -8, x: 0, rotate: 1 },
  hover: { y: -28, x: 0, rotate: 0 },
  open: { y: -120, x: 0, rotate: 0 },
} as const;

// Hover fires constantly while scanning a grid, so settle fast and never overshoot.
const SPRING = { type: "spring", stiffness: 220, damping: 26 } as const;

export function CollectionFolder({
  previewUrls = [],
  color = "black",
  size = "md",
  hovered,
  open,
  className,
  ...props
}: CollectionFolderProps) {
  const theme: Theme =
    color in themes ? themes[color as ThemeName] : themeFromAccent(color);
  const scale = sizeScales[size];
  const [internalHovered, setInternalHovered] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isHovered = hovered ?? internalHovered;
  const isOpen = open ?? internalOpen;
  const controlled = hovered !== undefined;

  const isEmpty = previewUrls.length === 0;
  // Sheet 3 sits in front, so put the newest link there.
  const sheets = isEmpty
    ? [{ url: null, motion: EMPTY_MOTION }]
    : CARD_MOTION.map((motion, i) => ({
        url: previewUrls[PREVIEW_SLOTS - 1 - i] ?? null,
        motion,
      }));

  return (
    <div
      data-slot="folder"
      className={cn(
        "relative flex h-full w-full items-center justify-center",
        className,
      )}
      {...props}
    >
      <div
        className="relative select-none"
        style={{
          width: BASE_WIDTH * scale,
          height: BASE_HEIGHT * scale,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseEnter={controlled ? undefined : () => setInternalHovered(true)}
        onMouseLeave={
          controlled
            ? undefined
            : () => {
                setInternalHovered(false);
                setInternalOpen(false);
              }
        }
        onClick={
          open === undefined ? () => setInternalOpen((o) => !o) : undefined
        }
      >
        <div
          className="absolute top-1/2 left-1/2"
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `translate(-50%, -50%) scale(${scale})`,
            perspective: 800 * scale,
          }}
        >
          {/* Back plate */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div
              style={{
                width: BASE_WIDTH,
                height: BASE_HEIGHT,
                borderRadius: 25,
                backgroundColor: theme.backFill,
                boxShadow: theme.backInsetShadow,
              }}
            />
          </div>

          {/* Sheets */}
          <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            {sheets.map(({ url, motion: m }, i) => (
              <motion.div
                key={i}
                className="absolute"
                animate={isOpen ? m.open : isHovered ? m.hover : m.rest}
                transition={SPRING}
              >
                <Sheet id={i + 1} theme={theme} url={url} />
              </motion.div>
            ))}
          </div>

          {/* Front flap */}
          <motion.div
            className="absolute top-1/2 left-1/2 mt-4 -translate-x-1/2 -translate-y-1/2"
            style={{
              transformOrigin: "bottom center",
              transformStyle: "preserve-3d",
              width: 321,
              height: 241,
            }}
            animate={{ rotateX: isOpen ? -55 : isHovered ? -38 : -15 }}
            transition={SPRING}
          >
            <svg
              className="absolute inset-0"
              width="321"
              height="241"
              viewBox="0 0 321 241"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#folder_flap_inset)">
                <path
                  d={FLAP_PATH}
                  fill={theme.flapFill}
                  fillOpacity={theme.flapFillOpacity}
                />
                <path
                  d="M25 0.5H136.084C142.905 0.5 149.417 3.3431 154.054 8.3457L177.713 33.874C182.539 39.0808 189.317 42.04 196.416 42.04H296C309.531 42.04 320.5 53.0092 320.5 66.54V216C320.5 229.531 309.531 240.5 296 240.5H25C11.469 240.5 0.5 229.531 0.5 216V25C0.5 11.469 11.469 0.5 25 0.5Z"
                  stroke={theme.flapStroke}
                />
              </g>
              <defs>
                <filter
                  id="folder_flap_inset"
                  x="-25.4"
                  y="-25.4"
                  width="371.8"
                  height="291.8"
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix" />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                  />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset />
                  <feGaussianBlur stdDeviation="2.65" />
                  <feComposite
                    in2="hardAlpha"
                    operator="arithmetic"
                    k2="-1"
                    k3="1"
                  />
                  <feColorMatrix type="matrix" values={theme.flapInsetColor} />
                  <feBlend
                    mode="normal"
                    in2="shape"
                    result="effect1_innerShadow"
                  />
                </filter>
              </defs>
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export type { CollectionFolderProps };

/**
 * One sheet inside the folder. With a URL it shows that site's favicon and
 * hostname near the top (the part that peeks out when the folder opens);
 * without one it renders the original blank lined sheet.
 */
function Sheet({
  id,
  theme,
  url,
}: {
  id: number;
  theme: Theme;
  url: string | null;
}) {
  const filterId = `folder_sheet_inset_${id}`;
  return (
    <div
      data-slot="folder-card"
      className="relative"
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <svg
        className="absolute inset-0"
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter={`url(#${filterId})`}>
          <rect
            width="163.078"
            height="213.262"
            rx="20"
            fill={theme.cardFill}
          />
        </g>
        <rect
          x="0.5"
          y="0.5"
          width="162.078"
          height="212.262"
          rx="19.5"
          stroke={theme.cardStroke}
        />
        {url === null ? (
          <BlankLines fill={theme.cardLineFill} />
        ) : (
          <>
            {/* Faint body lines under the favicon so the sheet still reads as a page */}
            {[108, 122, 136, 150].map((y) => (
              <rect
                key={y}
                x="14.8"
                y={y}
                width="134.8"
                height="5.9"
                rx="2.9"
                fill={theme.cardLineFill}
                opacity={0.6}
              />
            ))}
          </>
        )}
        <defs>
          <filter
            id={filterId}
            x="0"
            y="0"
            width="166.078"
            height="218.262"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feMorphology
              radius="2"
              operator="erode"
              in="SourceAlpha"
              result="effect1_innerShadow"
            />
            <feOffset dx="3" dy="5" />
            <feGaussianBlur stdDeviation="3.05" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix type="matrix" values={theme.cardInsetColor} />
            <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
          </filter>
        </defs>
      </svg>
      {url !== null && <SheetFavicon url={url} theme={theme} />}
    </div>
  );
}

function SheetFavicon({ url, theme }: { url: string; theme: Theme }) {
  const [imgError, setImgError] = useState(false);
  const { faviconUrl, isLoading, hostname } = useFavicon(url);
  const showPlaceholder = isLoading || !faviconUrl || imgError;

  return (
    <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2.5 px-4 pt-3">
      <div
        className="flex size-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: theme.cardLineFill,
          boxShadow: `inset 0 0 0 1px ${theme.cardStroke}`,
        }}
      >
        {showPlaceholder ? (
          <GlobeSimpleIcon
            className="size-8"
            weight="duotone"
            style={{ color: theme.cardStroke }}
          />
        ) : (
          <Image
            src={faviconUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg object-contain outline-1 -outline-offset-1 outline-[oklch(0_0_0/0.1)]"
            onError={() => setImgError(true)}
            unoptimized
          />
        )}
      </div>
      <span
        className="w-full truncate text-center text-[13px] leading-tight font-medium"
        style={{ color: theme.cardLineFill }}
        title={hostname ?? url}
      >
        {hostname ?? url}
      </span>
    </div>
  );
}

/** The original lined-paper decoration, used for empty slots. */
function BlankLines({ fill }: { fill: string }) {
  const rows = [61, 75.1, 89.2, 103.3, 117.5, 131.6, 145.7, 159.8, 173.9];
  return (
    <>
      <rect
        x="14.1"
        y="31.2"
        width="134.8"
        height="11.9"
        rx="5.9"
        fill={fill}
      />
      {rows.map((y) => (
        <g key={y}>
          <rect x="14.8" y={y} width="64.5" height="5.9" rx="2.9" fill={fill} />
          <rect x="84.4" y={y} width="64.5" height="5.9" rx="2.9" fill={fill} />
        </g>
      ))}
    </>
  );
}
