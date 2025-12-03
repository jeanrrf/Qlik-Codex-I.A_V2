import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveOptimization = mutation({
  args: {
    userId: v.optional(v.id("users")),
    mode: v.string(),
    originalLines: v.number(),
    optimizedLines: v.number(),
    breakingRisk: v.string(),
    changesCount: v.number(),
    durationMs: v.number(),
    llmProvider: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("history", {
      userId: args.userId,
      mode: args.mode,
      originalLines: args.originalLines,
      optimizedLines: args.optimizedLines,
      breakingRisk: args.breakingRisk,
      changesCount: args.changesCount,
      durationMs: args.durationMs,
      llmProvider: args.llmProvider,
      success: args.success,
      createdAt: new Date().toISOString(),
    });
    return id;
  },
});

export const getRecentOptimizations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("history")
      .order("desc")
      .take(limit);
  },
});

export const getStatistics = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("history").collect();

    const totalOptimizations = all.length;
    const totalLinesSaved = all.reduce(
      (sum, h) => sum + (h.originalLines - h.optimizedLines),
      0
    );
    const avgDurationMs = totalOptimizations > 0
      ? Math.round(all.reduce((sum, h) => sum + h.durationMs, 0) / totalOptimizations)
      : 0;

    // Provider mais usado
    const providerCounts: Record<string, number> = {};
    for (const h of all) {
      providerCounts[h.llmProvider] = (providerCounts[h.llmProvider] || 0) + 1;
    }
    const mostUsedProvider = Object.entries(providerCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || "gemini";

    return {
      totalOptimizations,
      totalLinesSaved,
      avgDurationMs,
      mostUsedProvider,
    };
  },
});
