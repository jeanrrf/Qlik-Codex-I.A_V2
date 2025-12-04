import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createSession = mutation({
  args: {
    userId: v.optional(v.id("users")),
    mode: v.string(),
    llmProvider: v.optional(v.string()),
    llmModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      mode: args.mode,
      status: "running",
      progressData: { percent: 0, message: "Iniciando..." },
      llmProvider: args.llmProvider,
      llmModel: args.llmModel,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt,
    });

    return sessionId;
  },
});

export const updateProgress = mutation({
  args: {
    sessionId: v.id("sessions"),
    percent: v.number(),
    message: v.string(),
    status: v.optional(v.string()),
    stages: v.optional(v.any()),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const updateData: any = {
      progressData: { percent: args.percent, message: args.message },
      updatedAt: now,
    };

    if (args.status) {
      updateData.status = args.status;
    }

    if (args.stages) {
      updateData.progressData.stages = args.stages;
    }

    // Se tiver resultado final, poderíamos salvar em outro lugar ou no próprio progressData
    if (args.result) {
      updateData.progressData.result = args.result;
    }

    await ctx.db.patch(args.sessionId, updateData);
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});
