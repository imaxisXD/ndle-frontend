import { describe, expect, test } from "vitest";
import {
  COLLECTION_COLORS,
  getCollectionFallbackColor,
} from "@/components/collection/colors";

describe("getCollectionFallbackColor", () => {
  test("keeps each collection color stable when another collection is deleted", () => {
    const collectionIds = ["collection-a", "collection-b", "collection-c"];
    const colorsBeforeDelete = new Map(
      collectionIds.map((id) => [id, getCollectionFallbackColor(id)]),
    );

    for (const id of collectionIds.slice(1)) {
      expect(getCollectionFallbackColor(id)).toBe(colorsBeforeDelete.get(id));
    }
  });

  test("always returns a color from the collection palette", () => {
    expect(COLLECTION_COLORS).toContain(
      getCollectionFallbackColor("collection-without-a-saved-color"),
    );
  });
});
