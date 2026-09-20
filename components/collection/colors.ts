export const COLLECTION_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#ef4444", // Red
] as const;

/**
 * Returns a stable fallback for legacy collections that have no saved color.
 * The collection ID is used instead of its list position so deleting or
 * reordering another collection cannot change the displayed color.
 */
export function getCollectionFallbackColor(collectionId: string): string {
  let hash = 0;

  for (let index = 0; index < collectionId.length; index += 1) {
    hash = Math.imul(hash, 31) + collectionId.charCodeAt(index);
  }

  return COLLECTION_COLORS[(hash >>> 0) % COLLECTION_COLORS.length];
}
