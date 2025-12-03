import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.string(), // "user" | "owner"
    googleId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    lastLogin: v.string(),
    isActive: v.boolean(),
  }).index("by_email", ["email"])
    .index("by_google_id", ["googleId"]),

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
});
