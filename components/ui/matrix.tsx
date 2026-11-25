"use client";

import * as React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type Frame = number[][];

interface CellPosition {
  x: number;
  y: number;
}

interface MatrixProps extends React.HTMLAttributes<HTMLDivElement> {
  rows: number;
  cols: number;
  pattern?: Frame;
  frames?: Frame[];
  fps?: number;
  autoplay?: boolean;
  loop?: boolean;
  size?: number;
  gap?: number;
  palette?: {
    on: string;
    off: string;
  };
  brightness?: number;
  ariaLabel?: string;
  onFrame?: (index: number) => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ensureFrameSize(frame: Frame, rows: number, cols: number): Frame {
  const result: Frame = [];
  for (let r = 0; r < rows; r++) {
    const row = frame[r] || [];
    result.push([]);
    for (let c = 0; c < cols; c++) {
      result[r][c] = row[c] ?? 0;
    }
  }
  return result;
}

function useAnimation(
  frames: Frame[] | undefined,
  options: {
    fps: number;
    autoplay: boolean;
    loop: boolean;
    onFrame?: (index: number) => void;
  },
): { frameIndex: number; isPlaying: boolean } {
  const { fps, autoplay, loop, onFrame } = options;
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const frameIdRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (!frames || frames.length === 0 || !isPlaying) {
      return;
    }

    const frameInterval = 1000 / fps;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;
      accumulatorRef.current += deltaTime;

      if (accumulatorRef.current >= frameInterval) {
        accumulatorRef.current -= frameInterval;

        setFrameIndex((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            if (loop) {
              onFrame?.(0);
              return 0;
            }
            setIsPlaying(false);
            return prev;
          }
          onFrame?.(next);
          return next;
        });
      }

      frameIdRef.current = requestAnimationFrame(animate);
    };

    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [frames, isPlaying, fps, loop, onFrame]);

  useEffect(() => {
    setFrameIndex(0);
    setIsPlaying(autoplay);
    lastTimeRef.current = 0;
    accumulatorRef.current = 0;
  }, [frames, autoplay]);

  return { frameIndex, isPlaying };
}

export const Matrix = React.forwardRef<HTMLDivElement, MatrixProps>(
  (
    {
      rows,
      cols,
      pattern,
      frames,
      fps = 12,
      autoplay = true,
      loop = true,
      size = 10,
      gap = 2,
      palette = {
        on: "currentColor",
        off: "var(--muted-foreground)",
      },
      brightness = 1,
      ariaLabel,
      onFrame,
      className,
      ...props
    },
    ref,
  ) => {
    const instanceId = useId();
    const pixelOnId = `matrix-pixel-on-${instanceId}`;
    const pixelOffId = `matrix-pixel-off-${instanceId}`;
    const glowId = `matrix-glow-${instanceId}`;

    const { frameIndex } = useAnimation(frames, {
      fps,
      autoplay: autoplay && !pattern,
      loop,
      onFrame,
    });

    const currentFrame = useMemo(() => {
      if (pattern) {
        return ensureFrameSize(pattern, rows, cols);
      }
      if (frames && frames.length > 0) {
        return ensureFrameSize(frames[frameIndex] || frames[0], rows, cols);
      }
      return ensureFrameSize([], rows, cols);
    }, [pattern, frames, frameIndex, rows, cols]);

    const cellPositions = useMemo(() => {
      const positions: CellPosition[][] = [];
      for (let row = 0; row < rows; row++) {
        positions[row] = [];
        for (let col = 0; col < cols; col++) {
          positions[row][col] = {
            x: col * (size + gap),
            y: row * (size + gap),
          };
        }
      }
      return positions;
    }, [rows, cols, size, gap]);

    const svgDimensions = useMemo(
      () => ({
        width: cols * (size + gap) - gap,
        height: rows * (size + gap) - gap,
      }),
      [rows, cols, size, gap],
    );

    const isAnimating = !pattern && frames && frames.length > 0;

    return (
      <div
        ref={ref}
        // One picture drawn from many cells, so role="img" on the container.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={ariaLabel ?? "matrix display"}
        aria-live={isAnimating ? "polite" : undefined}
        className={cn("relative inline-block", className)}
        style={
          {
            "--matrix-on": palette.on,
            "--matrix-off": palette.off,
            "--matrix-gap": `${gap}px`,
            "--matrix-size": `${size}px`,
          } as React.CSSProperties
        }
        {...props}
      >
        <svg
          width={svgDimensions.width}
          height={svgDimensions.height}
          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
          xmlns="http://www.w3.org/2000/svg"
          className="block"
          style={{ overflow: "visible" }}
        >
          <defs>
            <radialGradient id={pixelOnId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--matrix-on)" stopOpacity="1" />
              <stop
                offset="70%"
                stopColor="var(--matrix-on)"
                stopOpacity="0.85"
              />
              <stop
                offset="100%"
                stopColor="var(--matrix-on)"
                stopOpacity="0.6"
              />
            </radialGradient>

            <radialGradient id={pixelOffId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--matrix-off)" stopOpacity="1" />
              <stop
                offset="100%"
                stopColor="var(--matrix-off)"
                stopOpacity="0.7"
              />
            </radialGradient>

            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <style>
            {`
              .matrix-pixel {
                transition: opacity 300ms ease-out, transform 150ms ease-out;
                transform-origin: center;
                transform-box: fill-box;
              }
              .matrix-pixel-active-${instanceId} {
                filter: url(#${glowId});
              }
            `}
          </style>

          {currentFrame.map((row, rowIndex) =>
            row.map((value, colIndex) => {
              const pos = cellPositions[rowIndex]?.[colIndex];
              if (!pos) return null;

              const opacity = clamp(brightness * value);
              const isActive = opacity > 0.5;
              const isOn = opacity > 0.05;
              const fill = isOn ? `url(#${pixelOnId})` : `url(#${pixelOffId})`;
              const scale = isActive ? 1.1 : 1;
              const radius = (size / 2) * 0.9;

              return (
                <circle
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "matrix-pixel",
                    isActive && `matrix-pixel-active-${instanceId}`,
                    !isOn && "opacity-20",
                  )}
                  cx={pos.x + size / 2}
                  cy={pos.y + size / 2}
                  r={radius}
                  fill={fill}
                  opacity={isOn ? opacity : 0.1}
                  style={{ transform: `scale(${scale})` }}
                />
              );
            }),
          )}
        </svg>
      </div>
    );
  },
);

Matrix.displayName = "Matrix";
