/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as consultancy from "../consultancy.js";
import type * as contact from "../contact.js";
import type * as documentation from "../documentation.js";
import type * as explanation from "../explanation.js";
import type * as formatter from "../formatter.js";
import type * as history from "../history.js";
import type * as lib_llm from "../lib/llm.js";
import type * as optimizer from "../optimizer.js";
import type * as review from "../review.js";
import type * as sessions from "../sessions.js";
import type * as validation from "../validation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  consultancy: typeof consultancy;
  contact: typeof contact;
  documentation: typeof documentation;
  explanation: typeof explanation;
  formatter: typeof formatter;
  history: typeof history;
  "lib/llm": typeof lib_llm;
  optimizer: typeof optimizer;
  review: typeof review;
  sessions: typeof sessions;
  validation: typeof validation;
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

export declare const components: {};
