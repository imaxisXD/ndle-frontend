import { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { mutation as rawMutation } from "./_generated/server";

const triggers = new Triggers<DataModel>();

triggers.register("users", async (ctx, change) => {
  if (change.operation === "delete") {
    for await (const url of ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", change.id))) {
      await ctx.db.delete(url._id);
    }
  }
});

export const deleteMutation = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB),
);
