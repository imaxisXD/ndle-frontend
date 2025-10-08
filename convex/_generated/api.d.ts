/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as redisAction from "../redisAction.js";
import type * as triggerFuctions from "../triggerFuctions.js";
import type * as urlAnalytics from "../urlAnalytics.js";
import type * as urlMainFuction from "../urlMainFuction.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  redisAction: typeof redisAction;
  triggerFuctions: typeof triggerFuctions;
  urlAnalytics: typeof urlAnalytics;
  urlMainFuction: typeof urlMainFuction;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
