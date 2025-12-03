import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Owner token hardcoded (mesmo do server original)
const OWNER_TOKEN = "2020301jeandasilva";

export const checkAuthStatus = query({
  args: {},
  handler: async () => {
    // No Convex, autenticação é simplificada
    // Retorna não autenticado por padrão (usuário pode fazer login)
    return {
      authenticated: false,
      user: null,
    };
  },
});

export const loginWithToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.token !== OWNER_TOKEN) {
      throw new Error("Token inválido");
    }

    const now = new Date().toISOString();

    // Buscar ou criar usuário owner
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "owner@qlik-codex.local"))
      .first();

    let userId;
    if (existingUser) {
      userId = existingUser._id;
      await ctx.db.patch(userId, { lastLogin: now });
    } else {
      userId = await ctx.db.insert("users", {
        email: "owner@qlik-codex.local",
        name: "Owner",
        role: "owner",
        lastLogin: now,
        isActive: true,
      });
    }

    const user = await ctx.db.get(userId);

    return {
      success: true,
      user: {
        id: userId,
        email: user!.email,
        name: user!.name,
        role: user!.role,
      },
    };
  },
});

export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
    };
  },
});

export const logout = mutation({
  args: {},
  handler: async () => {
    // No Convex, logout é client-side (limpar estado local)
    return { success: true };
  },
});
