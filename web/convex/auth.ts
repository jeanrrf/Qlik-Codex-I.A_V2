/**
 * Convex Auth - Autenticação e Controle de Cotas
 * 
 * Suporta:
 * - Login com token de owner
 * - Login com email/senha
 * - Login com Google OAuth
 * - Controle de cotas por tier
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============ CONFIGURAÇÕES ============

// Owner token (mesmo do .env do server)
const OWNER_TOKEN = "2020301jeandasilva";
const OWNER_EMAIL = "rosso.jeandasilva@gmail.com";

// Limites de cota por tier (OFICIAL)
const RoleUsageLimits = {
  owner: {
    optimizationsPerDay: -1, // Ilimitado
    maxScriptSizeKB: -1,
    maxScriptLines: -1, // Ilimitado
    maxConcurrentSessions: -1,
    enabledModes: ["ultra-expert"],
    canUseMultipleFiles: true,
    ultraExpertExecutionsPerDay: -1 // Ilimitado
  },
  user: {
    optimizationsPerDay: 4, // FREE TIER: 4 otimizações/dia
    maxScriptSizeKB: 1000,
    maxScriptLines: 200, // FREE TIER: 200 linhas base
    maxConcurrentSessions: 2,
    enabledModes: ["ultra-expert"], // Apenas ultra-expert
    canUseMultipleFiles: false, // Apenas 1 arquivo
    ultraExpertExecutionsPerDay: 1 // 1 execução Ultra Expert POR DIA
  }
};

// ============ HELPERS ============

function hashPassword(password: string): string {
  // Hash simples para demo (em produção usar bcrypt)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

function getQuotaResetDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function shouldResetQuota(resetAt: string | undefined): boolean {
  if (!resetAt) return true;
  return new Date(resetAt) <= new Date();
}

// ============ QUERIES ============

export const checkAuthStatus = query({
  args: {},
  handler: async () => {
    return {
      authenticated: false,
      user: null,
    };
  },
});

export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Map legacy roles or ensure valid role
    const roleKey = (user.role === "owner" ? "owner" : "user") as keyof typeof RoleUsageLimits;
    const limits = RoleUsageLimits[roleKey];

    // Calculate remaining quotas
    // If limit is -1, it's unlimited (Infinity for frontend)
    const optLimit = limits.optimizationsPerDay === -1 ? Infinity : limits.optimizationsPerDay;
    const ultraLimit = limits.ultraExpertExecutionsPerDay === -1 ? Infinity : limits.ultraExpertExecutionsPerDay;

    // Current remaining (default to limit if not set)
    const currentOpt = user.quotaOptimizations ?? (optLimit === Infinity ? 999999 : optLimit);
    const currentUltra = user.quotaUltraExpert ?? (ultraLimit === Infinity ? 999999 : ultraLimit);

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      quota: {
        optimizations: {
          used: (optLimit === Infinity ? 0 : optLimit - currentOpt),
          remaining: currentOpt,
          limit: optLimit,
        },
        ultraExpert: {
          used: (ultraLimit === Infinity ? 0 : ultraLimit - currentUltra),
          remaining: currentUltra,
          limit: ultraLimit
        },
        maxLines: limits.maxScriptLines === -1 ? Infinity : limits.maxScriptLines,
        resetAt: user.quotaResetAt,
      },
    };
  },
});

export const getUserQuota = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const roleKey = (user.role === "owner" ? "owner" : "user") as keyof typeof RoleUsageLimits;
    const limits = RoleUsageLimits[roleKey];

    // Verificar se precisa resetar a cota
    const needsReset = shouldResetQuota(user.quotaResetAt);

    const optLimit = limits.optimizationsPerDay === -1 ? Infinity : limits.optimizationsPerDay;
    const ultraLimit = limits.ultraExpertExecutionsPerDay === -1 ? Infinity : limits.ultraExpertExecutionsPerDay;

    return {
      role: user.role,
      optimizations: {
        remaining: needsReset ? optLimit : (user.quotaOptimizations ?? optLimit),
        limit: optLimit,
      },
      ultraExpert: {
        remaining: needsReset ? ultraLimit : (user.quotaUltraExpert ?? ultraLimit),
        limit: ultraLimit,
      },
      maxLines: limits.maxScriptLines === -1 ? Infinity : limits.maxScriptLines,
      resetAt: needsReset ? getQuotaResetDate() : user.quotaResetAt,
      isUnlimited: user.role === "owner",
    };
  },
});

// ============ MUTATIONS ============

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
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", OWNER_EMAIL))
      .first();

    if (user) {
      await ctx.db.patch(user._id, { lastLogin: now });
    } else {
      const userId = await ctx.db.insert("users", {
        email: OWNER_EMAIL,
        name: "Owner",
        role: "owner",
        lastLogin: now,
        isActive: true,
        quotaOptimizations: undefined,
        quotaFormats: undefined,
      });
      user = await ctx.db.get(userId);
    }

    return {
      success: true,
      user: {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
      },
    };
  },
});

export const loginWithEmail = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const passwordHash = hashPassword(args.password);

    // Buscar usuário
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("Email ou senha incorretos");
    }

    // Verificar senha (armazenada em campo opcional)
    const storedHash = (user as any).passwordHash;
    if (storedHash && storedHash !== passwordHash) {
      throw new Error("Email ou senha incorretos");
    }

    // Atualizar último login
    await ctx.db.patch(user._id, { lastLogin: new Date().toISOString() });

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  },
});

export const registerWithEmail = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    const passwordHash = hashPassword(args.password);

    // Verificar se email já existe
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      throw new Error("Este email já está cadastrado");
    }

    // Validar email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email inválido");
    }

    // Validar senha
    if (args.password.length < 6) {
      throw new Error("Senha deve ter pelo menos 6 caracteres");
    }

    const now = new Date().toISOString();
    const limits = QUOTA_LIMITS.free;

    // Criar usuário
    const userId = await ctx.db.insert("users", {
      email,
      name,
      role: "free",
      lastLogin: now,
      isActive: true,
      quotaOptimizations: limits.optimizations,
      quotaFormats: limits.formats,
      quotaResetAt: getQuotaResetDate(),
    } as any);

    // Armazenar hash da senha
    await ctx.db.patch(userId, { passwordHash } as any);

    const user = await ctx.db.get(userId);

    return {
      success: true,
      user: {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
      },
    };
  },
});

export const loginWithGoogle = mutation({
  args: {
    googleId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const now = new Date().toISOString();

    // Buscar por googleId ou email
    let user = await ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("googleId", args.googleId))
      .first();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
    }

    if (user) {
      // Atualizar dados do Google
      await ctx.db.patch(user._id, {
        googleId: args.googleId,
        name: args.name,
        avatarUrl: args.avatarUrl,
        lastLogin: now,
      });
    } else {
      // Criar novo usuário
      const limits = QUOTA_LIMITS.free;
      const role = email === OWNER_EMAIL ? "owner" : "free";

      const userId = await ctx.db.insert("users", {
        email,
        name: args.name,
        role,
        googleId: args.googleId,
        avatarUrl: args.avatarUrl,
        lastLogin: now,
        isActive: true,
        quotaOptimizations: role === "owner" ? undefined : limits.optimizations,
        quotaFormats: role === "owner" ? undefined : limits.formats,
        quotaResetAt: role === "owner" ? undefined : getQuotaResetDate(),
      });
      user = await ctx.db.get(userId);
    }

    return {
      success: true,
      user: {
        id: user!._id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        avatarUrl: user!.avatarUrl,
      },
    };
  },
});

export const logout = mutation({
  args: {},
  handler: async () => {
    return { success: true };
  },
});

// ============ QUOTA MANAGEMENT ============

export const checkQuota = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(), // "optimization" | "format" | "ultra-expert"
    linesCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const roleKey = (user.role === "owner" ? "owner" : "user") as keyof typeof RoleUsageLimits;
    const limits = RoleUsageLimits[roleKey];

    // Owner tem cota ilimitada
    if (user.role === "owner") {
      return { allowed: true, remaining: Infinity };
    }

    // Verificar se precisa resetar cotas
    if (shouldResetQuota(user.quotaResetAt)) {
      const optLimit = limits.optimizationsPerDay === -1 ? undefined : limits.optimizationsPerDay;
      const ultraLimit = limits.ultraExpertExecutionsPerDay === -1 ? undefined : limits.ultraExpertExecutionsPerDay;

      await ctx.db.patch(user._id, {
        quotaOptimizations: optLimit,
        quotaUltraExpert: ultraLimit,
        quotaResetAt: getQuotaResetDate(),
      });
      user.quotaOptimizations = optLimit;
      user.quotaUltraExpert = ultraLimit;
    }

    // Verificar limite de linhas
    const maxLines = limits.maxScriptLines === -1 ? Infinity : limits.maxScriptLines;
    if (args.linesCount && args.linesCount > maxLines) {
      return {
        allowed: false,
        remaining: 0,
        reason: `Seu plano permite scripts de até ${maxLines} linhas. Este script tem ${args.linesCount} linhas.`,
        upgrade: true,
      };
    }

    // Verificar cota do tipo de ação
    if (args.action === "optimization") {
      const remaining = user.quotaOptimizations ?? 0;
      if (remaining <= 0) {
        return {
          allowed: false,
          remaining: 0,
          reason: "Você atingiu o limite de otimizações do dia.",
          resetAt: user.quotaResetAt,
        };
      }
      return { allowed: true, remaining };
    }

    if (args.action === "ultra-expert") {
      const remainingOpt = user.quotaOptimizations ?? 0;
      const remainingUltra = user.quotaUltraExpert ?? 0;

      if (remainingOpt <= 0) {
        return { allowed: false, remaining: 0, reason: "Limite de otimizações diárias atingido." };
      }
      if (remainingUltra <= 0) {
        return { allowed: false, remaining: 0, reason: "Limite de execuções Ultra-Expert diárias atingido." };
      }
      return { allowed: true, remaining: remainingUltra };
    }

    return { allowed: true, remaining: Infinity };
  },
});

export const consumeQuota = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    linesProcessed: v.optional(v.number()),
    llmProvider: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Owner não consome cota
    if (user.role !== "owner") {
      if (args.action === "optimization" && user.quotaOptimizations !== undefined) {
        await ctx.db.patch(user._id, {
          quotaOptimizations: Math.max(0, user.quotaOptimizations - 1),
        });
      } else if (args.action === "ultra-expert") {
        const updates: any = {};
        if (user.quotaOptimizations !== undefined) updates.quotaOptimizations = Math.max(0, user.quotaOptimizations - 1);
        if (user.quotaUltraExpert !== undefined) updates.quotaUltraExpert = Math.max(0, user.quotaUltraExpert - 1);
        await ctx.db.patch(user._id, updates);
      }
    }

    // Registrar uso
    await ctx.db.insert("usageLogs", {
      userId: args.userId,
      action: args.action,
      linesProcessed: args.linesProcessed,
      llmProvider: args.llmProvider,
      durationMs: args.durationMs,
      success: args.success,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const getUsageHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("usageLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);

    return logs.map((log) => ({
      id: log._id,
      action: log.action,
      linesProcessed: log.linesProcessed,
      llmProvider: log.llmProvider,
      durationMs: log.durationMs,
      success: log.success,
      createdAt: new Date(log.createdAt).toISOString(),
    }));
  },
});

// ============ ADMIN ============

export const upgradeUserTier = mutation({
  args: {
    adminUserId: v.id("users"),
    targetEmail: v.string(),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    // Verificar se é admin/owner
    const admin = await ctx.db.get(args.adminUserId);
    if (!admin || admin.role !== "owner") {
      throw new Error("Acesso negado");
    }

    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.targetEmail.toLowerCase()))
      .first();

    if (!target) {
      throw new Error("Usuário não encontrado");
    }

    const limits = QUOTA_LIMITS[args.newRole as keyof typeof QUOTA_LIMITS] || QUOTA_LIMITS.free;

    await ctx.db.patch(target._id, {
      role: args.newRole,
      quotaOptimizations: limits.optimizations === Infinity ? undefined : limits.optimizations,
      quotaFormats: limits.formats === Infinity ? undefined : limits.formats,
    });

    return { success: true, userId: target._id };
  },
});
