/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountCounters from "../accountCounters.js";
import type * as architectureMigration from "../architectureMigration.js";
import type * as backfill from "../backfill.js";
import type * as clickEvents from "../clickEvents.js";
import type * as collectionMangament from "../collectionMangament.js";
import type * as crons from "../crons.js";
import type * as customDomains from "../customDomains.js";
import type * as domainSync from "../domainSync.js";
import type * as guestSessions from "../guestSessions.js";
import type * as guestTokens from "../guestTokens.js";
import type * as linkHealth from "../linkHealth.js";
import type * as ownership from "../ownership.js";
import type * as redisAction from "../redisAction.js";
import type * as redisProjection from "../redisProjection.js";
import type * as serviceSync from "../serviceSync.js";
import type * as serviceSyncTypes from "../serviceSyncTypes.js";
import type * as urlAnalytics from "../urlAnalytics.js";
import type * as urlLists from "../urlLists.js";
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
  accountCounters: typeof accountCounters;
  architectureMigration: typeof architectureMigration;
  backfill: typeof backfill;
  clickEvents: typeof clickEvents;
  collectionMangament: typeof collectionMangament;
  crons: typeof crons;
  customDomains: typeof customDomains;
  domainSync: typeof domainSync;
  guestSessions: typeof guestSessions;
  guestTokens: typeof guestTokens;
  linkHealth: typeof linkHealth;
  ownership: typeof ownership;
  redisAction: typeof redisAction;
  redisProjection: typeof redisProjection;
  serviceSync: typeof serviceSync;
  serviceSyncTypes: typeof serviceSyncTypes;
  urlAnalytics: typeof urlAnalytics;
  urlLists: typeof urlLists;
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
  shardedCounter: import("@convex-dev/sharded-counter/_generated/component.js").ComponentApi<"shardedCounter">;
};
