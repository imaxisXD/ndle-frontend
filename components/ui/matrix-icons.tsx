"use client";

import * as React from "react";
import { Matrix, Frame } from "@/components/ui/matrix";

// ============================================================================
// STATIC PATTERNS
// ============================================================================

// Plus/Cross pattern
const plusPattern: Frame = [
  [0, 0, 0, 0.3, 1, 0.3, 0, 0, 0],
  [0, 0, 0.3, 1, 1, 1, 0.3, 0, 0],
  [0, 0.3, 1, 1, 1, 1, 1, 0.3, 0],
  [0.3, 1, 1, 1, 1, 1, 1, 1, 0.3],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0.3, 1, 1, 1, 1, 1, 1, 1, 0.3],
  [0, 0.3, 1, 1, 1, 1, 1, 0.3, 0],
  [0, 0, 0.3, 1, 1, 1, 0.3, 0, 0],
  [0, 0, 0, 0.3, 1, 0.3, 0, 0, 0],
];

// X/Cross pattern (diagonal)
const xPattern: Frame = [
  [1, 0.5, 0, 0, 0, 0, 0, 0.5, 1],
  [0.5, 1, 0.5, 0, 0, 0, 0.5, 1, 0.5],
  [0, 0.5, 1, 0.5, 0, 0.5, 1, 0.5, 0],
  [0, 0, 0.5, 1, 0.5, 1, 0.5, 0, 0],
  [0, 0, 0, 0.5, 1, 0.5, 0, 0, 0],
  [0, 0, 0.5, 1, 0.5, 1, 0.5, 0, 0],
  [0, 0.5, 1, 0.5, 0, 0.5, 1, 0.5, 0],
  [0.5, 1, 0.5, 0, 0, 0, 0.5, 1, 0.5],
  [1, 0.5, 0, 0, 0, 0, 0, 0.5, 1],
];

// Checkmark pattern (centered in grid)
const checkPattern: Frame = [
  [0, 0, 0, 0, 0, 0, 0, 0.5, 1],
  [0, 0, 0, 0, 0, 0, 0.5, 1, 0.5],
  [0, 0, 0, 0, 0, 0.5, 1, 0.5, 0],
  [0, 0, 0, 0, 0.5, 1, 0.5, 0, 0],
  [0.5, 0.3, 0, 0.5, 1, 0.5, 0, 0, 0],
  [1, 0.5, 0.5, 1, 0.5, 0, 0, 0, 0],
  [0.5, 1, 1, 0.5, 0, 0, 0, 0, 0],
  [0, 0.5, 0.5, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// ============================================================================
// ANIMATED FRAMES
// ============================================================================

// Pulsing Plus animation
function createPulsingFrames(basePattern: Frame): Frame[] {
  const frames: Frame[] = [];
  const steps = 12;

  for (let i = 0; i < steps; i++) {
    const phase = (i / steps) * Math.PI * 2;
    const intensity = (Math.sin(phase) + 1) / 2; // 0 to 1
    const brightness = 0.6 + intensity * 0.4; // 0.6 to 1.0

    const frame = basePattern.map((row) =>
      row.map((cell) => (cell > 0 ? cell * brightness : 0)),
    );
    frames.push(frame);
  }

  return frames;
}

// Checkmark drawing animation
function createCheckmarkFrames(): Frame[] {
  const frames: Frame[] = [];
  const size = 9;

  // Define the checkmark path points (natural drawing order, centered)
  // Start from left, go down to bottom valley, then sweep up to top-right
  const path = [
    [5, 0], // Start left
    [6, 1], // Down
    [7, 2], // Down to valley bottom
    [6, 3], // Up
    [5, 4], // Up
    [4, 5], // Up
    [3, 6], // Up
    [2, 7], // Up
    [1, 8], // Finish at top-right
  ];

  for (let step = 1; step <= path.length; step++) {
    const frame: Frame = Array.from({ length: size }, () =>
      Array(size).fill(0),
    );

    for (let i = 0; i < step; i++) {
      const [row, col] = path[i];
      if (row >= 0 && row < size && col >= 0 && col < size) {
        frame[row][col] = 1;
        // Add glow to neighbors
        if (row > 0) frame[row - 1][col] = Math.max(frame[row - 1][col], 0.3);
        if (col > 0) frame[row][col - 1] = Math.max(frame[row][col - 1], 0.3);
        if (col < size - 1)
          frame[row][col + 1] = Math.max(frame[row][col + 1], 0.3);
      }
    }

    frames.push(frame);
  }

  // Hold the final frame for a bit
  for (let i = 0; i < 4; i++) {
    frames.push(frames[frames.length - 1]);
  }

  return frames;
}

// Pre-generate animated frames
const pulsingPlusFrames = createPulsingFrames(plusPattern);
const pulsingXFrames = createPulsingFrames(xPattern);
const checkmarkDrawFrames = createCheckmarkFrames();

// ============================================================================
// ICON COMPONENTS
// ============================================================================

interface MatrixIconProps {
  /** Size of each pixel in the matrix */
  size?: number;
  /** Gap between pixels */
  gap?: number;
  /** Enable animation */
  animated?: boolean;
  /** Frames per second for animation */
  fps?: number;
  /** Additional CSS classes */
  className?: string;
}

const defaultIconProps = {
  size: 6,
  gap: 1,
  animated: false,
  fps: 12,
};

// Plus Icon (Gray)
export function PlusIcon({
  size = defaultIconProps.size,
  gap = defaultIconProps.gap,
  animated = defaultIconProps.animated,
  fps = defaultIconProps.fps,
  className,
}: MatrixIconProps) {
  return (
    <Matrix
      rows={9}
      cols={9}
      {...(animated
        ? { frames: pulsingPlusFrames, fps, loop: true }
        : { pattern: plusPattern })}
      size={size}
      gap={gap}
      palette={{
        on: "hsl(0 0% 55%)",
        off: "hsl(0 0% 92%)",
      }}
      ariaLabel="Plus icon"
      className={className}
    />
  );
}

// Info Icon (Blue Plus)
export function InfoIcon({
  size = defaultIconProps.size,
  gap = defaultIconProps.gap,
  animated = defaultIconProps.animated,
  fps = defaultIconProps.fps,
  className,
}: MatrixIconProps) {
  return (
    <Matrix
      rows={9}
      cols={9}
      {...(animated
        ? { frames: pulsingPlusFrames, fps, loop: true }
        : { pattern: plusPattern })}
      size={size}
      gap={gap}
      palette={{
        on: "hsl(210 100% 55%)",
        off: "hsl(210 100% 92%)",
      }}
      ariaLabel="Info icon"
      className={className}
    />
  );
}

// Close/Error Icon (Red X)
export function CloseIcon({
  size = defaultIconProps.size,
  gap = defaultIconProps.gap,
  animated = defaultIconProps.animated,
  fps = defaultIconProps.fps,
  className,
}: MatrixIconProps) {
  return (
    <Matrix
      rows={9}
      cols={9}
      {...(animated
        ? { frames: pulsingXFrames, fps, loop: true }
        : { pattern: xPattern })}
      size={size}
      gap={gap}
      palette={{
        on: "hsl(5 75% 55%)",
        off: "hsl(5 75% 92%)",
      }}
      ariaLabel="Close icon"
      className={className}
    />
  );
}

// Success/Check Icon (Green Checkmark)
export function CheckIcon({
  size = defaultIconProps.size,
  gap = defaultIconProps.gap,
  animated = defaultIconProps.animated,
  fps = defaultIconProps.fps,
  className,
}: MatrixIconProps) {
  return (
    <Matrix
      rows={9}
      cols={9}
      {...(animated
        ? { frames: checkmarkDrawFrames, fps, loop: true }
        : { pattern: checkPattern })}
      size={size}
      gap={gap}
      palette={{
        on: "hsl(150 65% 40%)",
        off: "hsl(150 65% 92%)",
      }}
      ariaLabel="Check icon"
      className={className}
    />
  );
}

// Export all patterns for custom use
export const matrixPatterns = {
  plus: plusPattern,
  x: xPattern,
  check: checkPattern,
};

export const matrixFrames = {
  pulsingPlus: pulsingPlusFrames,
  pulsingX: pulsingXFrames,
  checkmarkDraw: checkmarkDrawFrames,
};
