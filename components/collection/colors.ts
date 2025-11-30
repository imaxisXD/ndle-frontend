export const COLLECTION_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#ef4444", // Red
] as const;

export function getRandomCollectionColor(): string {
  const index = Math.floor(Math.random() * COLLECTION_COLORS.length);
  return COLLECTION_COLORS[index];
}
