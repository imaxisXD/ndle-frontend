"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type MetricNumberAnimation = {
  direction: "down" | "up";
  fromValue: number;
  key: number;
  toValue: number;
};

type AnimatedMetricNumberProps = {
  animationKey?: string;
  ariaLabel?: string;
  className?: string;
  formatValue?: (value: number) => string;
  minWidthCh?: number;
  value: number;
};

const metricNumberFormatter = new Intl.NumberFormat("en-US");
const lastSeenMetricValues = new Map<string, number>();

function formatDefaultMetricValue(value: number) {
  return metricNumberFormatter.format(value);
}

export function AnimatedMetricNumber({
  animationKey,
  ariaLabel,
  className,
  formatValue = formatDefaultMetricValue,
  minWidthCh = 2,
  value,
}: AnimatedMetricNumberProps) {
  const previousValueRef = useRef(value);
  const animationKeyRef = useRef(0);
  const [animation, setAnimation] = useState<MetricNumberAnimation | null>(
    null,
  );

  useLayoutEffect(() => {
    const previousValue =
      animationKey && lastSeenMetricValues.has(animationKey)
        ? lastSeenMetricValues.get(animationKey)!
        : previousValueRef.current;

    previousValueRef.current = value;
    if (animationKey) {
      lastSeenMetricValues.set(animationKey, value);
    }

    if (previousValue === value) {
      return;
    }

    animationKeyRef.current += 1;
    setAnimation({
      direction: value > previousValue ? "up" : "down",
      fromValue: previousValue,
      key: animationKeyRef.current,
      toValue: value,
    });
  }, [animationKey, value]);

  const activeAnimation =
    animation && animation.toValue === value ? animation : null;
  const formattedValue = formatValue(value);
  const rollStyle = {
    "--animated-metric-min-width": `${minWidthCh}ch`,
  } as CSSProperties;

  if (!activeAnimation) {
    return (
      <span
        aria-label={ariaLabel ?? formattedValue}
        className={cn("animated-metric-roll", className)}
        style={rollStyle}
      >
        <span aria-hidden="true" className="animated-metric-roll-value">
          {formattedValue}
        </span>
      </span>
    );
  }

  const oldValueClass =
    activeAnimation.direction === "up"
      ? "animated-metric-roll-old-up"
      : "animated-metric-roll-old-down";
  const newValueClass =
    activeAnimation.direction === "up"
      ? "animated-metric-roll-new-up"
      : "animated-metric-roll-new-down";

  return (
    <span
      aria-label={ariaLabel ?? formattedValue}
      className={cn("animated-metric-roll", className)}
      style={rollStyle}
    >
      <span
        key={`old-${activeAnimation.key}`}
        aria-hidden="true"
        className={cn("animated-metric-roll-value", oldValueClass)}
      >
        {formatValue(activeAnimation.fromValue)}
      </span>
      <span
        key={`new-${activeAnimation.key}`}
        aria-hidden="true"
        className={cn("animated-metric-roll-value", newValueClass)}
      >
        {formatValue(activeAnimation.toValue)}
      </span>
    </span>
  );
}
