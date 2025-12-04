import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.string(), // "free" | "premium" | "owner"
    googleId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastLogin: v.string(),
    isActive: v.boolean(),
    // Quotas
    quotaOptimizations: v.optional(v.number()), // Otimizações restantes
    quotaFormats: v.optional(v.number()),       // Formatações restantes
    quotaResetAt: v.optional(v.string()),       // Data do próximo reset
  }).index("by_email", ["email"])
    .index("by_google_id", ["googleId"]),

  // Registro de uso para controle de cotas
  usageLogs: defineTable({
    userId: v.id("users"),
    action: v.string(), // "optimization" | "format" | "validation"
    mode: v.optional(v.string()),
    linesProcessed: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    success: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "createdAt"]),

  sessions: defineTable({
    userId: v.optional(v.id("users")),
    mode: v.string(),
    status: v.string(), // "running" | "paused" | "completed" | "error"
    progressData: v.any(), // JSON object
    llmProvider: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    expiresAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_status", ["status"]),

  history: defineTable({
    userId: v.optional(v.id("users")),
    mode: v.string(),
    originalLines: v.number(),
    optimizedLines: v.number(),
    breakingRisk: v.string(),
    changesCount: v.number(),
    durationMs: v.number(),
    llmProvider: v.string(),
    success: v.boolean(),
    createdAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  contacts: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    createdAt: v.number(),
    status: v.string(), // "new" | "read" | "replied"
  }).index("by_email", ["email"])
    .index("by_status", ["status"]),
});
