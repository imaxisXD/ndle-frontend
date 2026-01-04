/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as collectionMangament from "../collectionMangament.js";
import type * as crons from "../crons.js";
import type * as customDomains from "../customDomains.js";
import type * as linkHealth from "../linkHealth.js";
import type * as redisAction from "../redisAction.js";
import type * as triggerFuctions from "../triggerFuctions.js";
import type * as urlAnalytics from "../urlAnalytics.js";
import type * as urlMainFuction from "../urlMainFuction.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";
import type * as utmTemplates from "../utmTemplates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  collectionMangament: typeof collectionMangament;
  crons: typeof crons;
  customDomains: typeof customDomains;
  linkHealth: typeof linkHealth;
  redisAction: typeof redisAction;
  triggerFuctions: typeof triggerFuctions;
  urlAnalytics: typeof urlAnalytics;
  urlMainFuction: typeof urlMainFuction;
  users: typeof users;
  utils: typeof utils;
  utmTemplates: typeof utmTemplates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  shardedCounter: {
    public: {
      add: FunctionReference<
        "mutation",
        "internal",
        { count: number; name: string; shard?: number; shards?: number },
        number
      >;
      count: FunctionReference<"query", "internal", { name: string }, number>;
      estimateCount: FunctionReference<
        "query",
        "internal",
        { name: string; readFromShards?: number; shards?: number },
        any
      >;
      rebalance: FunctionReference<
        "mutation",
        "internal",
        { name: string; shards?: number },
        any
      >;
      reset: FunctionReference<"mutation", "internal", { name: string }, any>;
    };
  };
};
