import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a timestamp relative to the current time.
 *
 * @param ts - The timestamp to format.
 * @returns A string representing the relative time.
 */

export function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;

  // Seconds
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    if (seconds < 10) return "just now";
    return `${seconds} sec ago`;
  }

  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // Days
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  // Months (approximate)
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  // Years
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
