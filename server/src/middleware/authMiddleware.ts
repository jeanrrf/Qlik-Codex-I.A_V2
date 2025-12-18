/**
 * Authentication Middleware
 * Protege rotas e verifica permissões de acesso por role
 */

import { Request, Response, NextFunction } from "express";

import { logger } from "../lib/logger";
import {
  verifyToken,
  getUserById,
  getSessionById,
  updateSessionActivity,
  verifyOwnerToken,
  ensureOwnerUser
} from "../services/authService";
import { checkDailyQuota } from "../services/usageQuotaService";
import { User, UserRole, RolePermissions, RoleUsageLimits } from "../types/auth";
import type { OptimizeMode } from "../types/qlik";

import { asyncHandler } from "./asyncHandler";

/**
 * Request estendido com informações de autenticação
 */
export interface AuthRequest extends Request {
  user?: User;
  sessionId?: string;
  authDebug?: string;
}

/**
 * Extrai token do header Authorization ou cookie
 */
function extractToken(req: Request): string | null {
  // 1. Cookie (browser-based auth) — prioriza HttpOnly quando existe
  if (req.cookies && req.cookies.auth_token) {
    return req.cookies.auth_token;
  }

  // 2. Bearer token no header (ignora sentinelas comuns de fallback)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token && !["cookie", "undefined", "null"].includes(token.toLowerCase())) {
      return token;
    }
  }

  // 3. Query parameter (fallback para SSE)
  if (req.query && req.query.token) {
    return req.query.token as string;
  }

  return null;
}

/**
 * Middleware de autenticação obrigatória
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: "Authentication required",
        message: "No authentication token provided"
      });
      return;
    }

    // Verificar se é token de proprietário (bypass)
    if (verifyOwnerToken(token)) {
      const ownerUser = await ensureOwnerUser();
      req.user = ownerUser;
      logger.info("Owner authenticated via bypass token", { userId: ownerUser.id });
      next();
      return;
    }

    // Verificar JWT token normal
    let decoded;
    try {
      decoded = verifyToken(token);
      logger.debug("[AUTH] Token JWT válido", { userId: decoded.userId, sessionId: decoded.sessionId });
    } catch (err) {
      logger.warn("[AUTH] Token JWT inválido ou expirado", { error: err instanceof Error ? err.message : 'Unknown' });
      res.status(401).json({
        error: "Invalid token",
        message: "Authentication token is invalid or expired"
      });
      return;
    }

    // Buscar sessão e verificar validade
    logger.debug("[AUTH] Buscando sessão no banco...", { sessionId: decoded.sessionId });
    const session = await getSessionById(decoded.sessionId);
    if (!session) {
      logger.warn("[AUTH] Sessão não encontrada no banco", {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      });
      res.status(401).json({
        error: "Session expired",
        message: "Your session has expired. Please login again."
      });
      return;
    }

    logger.debug("[AUTH] Sessão válida encontrada", { sessionId: session.id, userId: session.userId });

    // Buscar usuário
    const user = await getUserById(decoded.userId);
    if (!user) {
      res.status(401).json({
        error: "User not found",
        message: "Associated user account no longer exists"
      });
      return;
    }

    // Atualizar atividade da sessão
    await updateSessionActivity(session.id);

    // Anexar informações ao request
    req.user = user;
    req.sessionId = session.id;

    // logger.debug("User authenticated", { userId: user.id, email: user.email, role: user.role });

    next();
  } catch (err) {
    logger.error("Authentication error", err);
    res.status(500).json({
      error: "Authentication error",
      message: "An error occurred during authentication"
    });
  }
}

/**
 * Middleware de autenticação opcional (não bloqueia se não autenticado)
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      req.authDebug = "No token found";
      next();
      return;
    }

    // Tentar autenticar, mas não bloquear se falhar
    if (verifyOwnerToken(token)) {
      req.user = await ensureOwnerUser();
      next();
      return;
    }

    try {
      const decoded = verifyToken(token);
      const session = await getSessionById(decoded.sessionId);

      if (session) {
        const user = await getUserById(decoded.userId);
        if (user) {
          req.user = user;
          req.sessionId = session.id;
          await updateSessionActivity(session.id);
        } else {
          req.authDebug = `User ${decoded.userId} not found`;
        }
      } else {
        req.authDebug = `Session ${decoded.sessionId} not found or expired`;
      }
    } catch (err) {
      req.authDebug = `Auth error: ${err instanceof Error ? err.message : String(err)}`;
    }

    next();
  } catch (err) {
    logger.error("Optional auth error", err);
    req.authDebug = `Middleware error: ${err instanceof Error ? err.message : String(err)}`;
    next();
  }
}

/**
 * Middleware para exigir role específica
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required",
        message: "You must be authenticated to access this resource"
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn("Access denied - insufficient role", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });

      res.status(403).json({
        error: "Access denied",
        message: `This resource requires one of the following roles: ${allowedRoles.join(", ")}`
      });
      return;
    }

    next();
  };
}

/**
 * Verifica se usuário tem permissão específica
 */
function hasPermission(user: User, permission: string): boolean {
  const permissions = RolePermissions[user.role];

  // Owner tem acesso total
  if (permissions.includes("*")) {
    return true;
  }

  // Verificar permissão exata
  if (permissions.includes(permission)) {
    return true;
  }

  // Verificar permissões com sufixo :own (apenas recursos próprios)
  const basePermission = permission.split(":")[0];
  if (permissions.includes(`${basePermission}:read:own`) && permission.endsWith(":read")) {
    return true;
  }

  return false;
}

/**
 * Middleware para exigir permissão específica
 */
export function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Authentication required"
      });
      return;
    }

    if (!hasPermission(req.user, permission)) {
      logger.warn("Access denied - insufficient permissions", {
        userId: req.user.id,
        userRole: req.user.role,
        requiredPermission: permission
      });

      res.status(403).json({
        error: "Access denied",
        message: `You don't have permission to: ${permission}`
      });
      return;
    }

    next();
  };
}

/**
 * Middleware para garantir que existe um usuário (autenticado ou guest)
 */
export const ensureUserOrGuest = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    // Create a temporary guest user based on IP
    const guestIp = req.ip || req.socket.remoteAddress || "unknown_guest";
    const sanitizedIp = guestIp.replace(/[^a-zA-Z0-9]/g, "_");

    authReq.user = {
      id: `guest_${sanitizedIp}`,
      email: "guest@anonymous",
      name: "Guest User",
      role: UserRole.GUEST,
      googleId: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true
    };

    logger.debug("[AUTH] Guest user created", {
      guestId: authReq.user.id,
      ip: guestIp
    });
  }

  next();
};

/**
 * Middleware para verificar limites de uso
 */
export const checkUsageLimits = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;

  // Ensure user exists (Guest fallback)
  if (!authReq.user) {
    ensureUserOrGuest(req, res, () => { });
  }

  const user = authReq.user!; // Guaranteed by ensureUserOrGuest logic above

  const limits = RoleUsageLimits[user.role];

  logger.info("[FREE TIER] checkUsageLimits iniciado", {
    userId: user.id,
    userRole: user.role,
    isGuest: user.role === UserRole.GUEST,
    hasAuthToken: !!extractToken(req),
    requestedMode: req.body.mode,
    limits
  });

  if (user.role === UserRole.OWNER) {
    logger.debug("[FREE TIER] Owner detectado - bypass de limites");
    next();
    return;
  }

  const requestedMode = req.body.mode as OptimizeMode | undefined;

  if (requestedMode && limits.enabledModes && !limits.enabledModes.includes(requestedMode)) {
    logger.warn("[FREE TIER] Mode not allowed for role", {
      userId: user.id,
      userRole: user.role,
      requestedMode,
      allowedModes: limits.enabledModes
    });

    res.status(403).json({
      error: "Access denied",
      message: `Your role (${user.role}) does not have access to mode: ${requestedMode}. ${user.role === UserRole.GUEST ? "Please login to use ultra-expert mode." : ""}`,
      allowedModes: limits.enabledModes,
      currentRole: user.role,
      requiresAuth: user.role === UserRole.GUEST
    });
    return;
  }

  if (req.body.script && limits.maxScriptLines > 0) {
    const scriptLines = req.body.script.split(/\r?\n/).length;

    logger.debug("[FREE TIER] Verificando limite de linhas", {
      scriptLines,
      maxScriptLines: limits.maxScriptLines,
      excedeu: scriptLines > limits.maxScriptLines
    });

    if (scriptLines > limits.maxScriptLines) {
      logger.warn(`FREE TIER: Script excede ${limits.maxScriptLines} linhas (${scriptLines} linhas). Aplicando truncamento inteligente.`, {
        userId: user.id,
        scriptLines,
        limit: limits.maxScriptLines
      });

      req.body.applySmartTruncation = true;
      req.body.lineLimit = limits.maxScriptLines;

      logger.info("[FREE TIER] Campos de truncamento definidos", {
        applySmartTruncation: req.body.applySmartTruncation,
        lineLimit: req.body.lineLimit
      });
    }
  }

  if (req.body.script && limits.maxScriptSizeKB > 0) {
    const scriptSizeKB = Buffer.byteLength(req.body.script, "utf8") / 1024;
    if (scriptSizeKB > limits.maxScriptSizeKB) {
      res.status(413).json({
        error: "Script too large",
        message: `Maximum script size for your role is ${limits.maxScriptSizeKB}KB`,
        currentSize: Math.round(scriptSizeKB),
        maxSize: limits.maxScriptSizeKB
      });
      return;
    }
  }

  const mode: OptimizeMode = requestedMode ?? "ultra-expert";
  const quotaCheck = await checkDailyQuota(user, mode);

  if (!quotaCheck.allowed) {
    logger.warn("[FREE TIER] Quota di?ria excedida", {
      userId: user.id,
      mode,
      usedToday: quotaCheck.usedToday,
      limit: quotaCheck.limit
    });

    res.status(429).json({
      error: "Daily quota exceeded",
      message: `Voc? atingiu o limite FREE TIER de ${quotaCheck.limit} otimiza??es por dia. Limite renova em: ${new Date(quotaCheck.resetAt).toLocaleString("pt-BR")}`,
      quota: {
        used: quotaCheck.usedToday,
        limit: quotaCheck.limit,
        remaining: quotaCheck.remaining,
        resetAt: quotaCheck.resetAt
      }
    });
    return;
  }

  logger.debug("[FREE TIER] Quota OK", {
    userId: user.id,
    mode,
    remaining: quotaCheck.remaining,
    limit: quotaCheck.limit
  });

  next();
});

/**
 * Middleware para verificar acesso a recurso próprio
 */
export function requireOwnership(resourceUserIdField: string = "userId") {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Owner pode acessar tudo
    if (req.user.role === UserRole.OWNER) {
      next();
      return;
    }

    // Verificar se userId do recurso bate com usuário autenticado
    const resourceUserId =
      req.params[resourceUserIdField] ||
      req.body[resourceUserIdField] ||
      req.query[resourceUserIdField];

    if (!resourceUserId || resourceUserId !== req.user.id) {
      logger.warn("Access denied - resource ownership mismatch", {
        userId: req.user.id,
        resourceUserId
      });

      res.status(403).json({
        error: "Access denied",
        message: "You can only access your own resources"
      });
      return;
    }

    next();
  };
}
