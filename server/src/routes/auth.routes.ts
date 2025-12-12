/**
 * Authentication Routes
 * Rotas para Google OAuth, login, logout e gerenciamento de sessões
 */

import { Router, Request, Response, CookieOptions } from "express";

import { logger } from "../lib/logger";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, optionalAuth, AuthRequest, requireRole } from "../middleware/authMiddleware";
import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  createOrUpdateUserFromGoogle,
  createAuthSession,
  revokeSession,
  revokeAllUserSessions,
  cleanupExpiredSessions
} from "../services/authService";
import { UserRole } from "../types/auth";

const router = Router();

function resolveFrontendUrl(req: Request): string {
  const fromEnv = process.env.FRONTEND_URL;
  if (fromEnv) return fromEnv;

  // Prefer host information from the incoming request to avoid leaking tokens to third-party referers
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.get("host");
  if (host) {
    const protocol = forwardedProto || req.protocol || "http";
    const inferred = `${protocol}://${host}`;
    logger.warn("[AUTH] FRONTEND_URL não configurado - usando host da requisição", { inferred });
    return inferred;
  }

  // Fallback: tentar deduzir do cabeçalho Origin (mas nunca Referer, que pode apontar para o IdP)
  const originHeader = req.get("origin");
  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      const inferred = `${originUrl.protocol}//${originUrl.host}`;
      logger.warn("[AUTH] FRONTEND_URL não configurado - usando origem inferida", { inferred });
      return inferred;
    } catch {
      logger.warn("[AUTH] Não foi possível inferir FRONTEND_URL a partir do cabeçalho", {
        origin: originHeader
      });
    }
  }

  // Último recurso: manter fallback de desenvolvimento
  return "http://localhost:5173";
}

function getAuthCookieOptions(expiresInSeconds: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  // Cross-site frontends need SameSite=None + Secure for cookies to flow with fetch credentials
  const sameSiteEnv = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();
  const sameSite: CookieOptions["sameSite"] =
    sameSiteEnv === "none" || sameSiteEnv === "lax" || sameSiteEnv === "strict"
      ? (sameSiteEnv as CookieOptions["sameSite"])
      : isProduction
        ? "none"
        : "lax";

  // Allow overriding cookie domain when frontend/backends live on different hosts
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  const secure = sameSite === "none" ? true : isProduction;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    maxAge: expiresInSeconds * 1000
  };
}

/**
 * GET /api/auth/google
 * Inicia fluxo de autenticação Google OAuth
 */
router.get(
  "/google",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const authUrl = getGoogleAuthUrl();
      logger.info("[AUTH] Google OAuth URL gerada", {
        redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
      });
      res.json({ authUrl });
    } catch (err) {
      logger.error("Error generating Google auth URL", err);
      res.status(500).json({
        error: "Authentication error",
        message: "Could not initialize Google authentication"
      });
    }
  })
);

/**
 * GET /api/auth/google/callback
 * Callback do Google OAuth (recebe código de autorização)
 */
router.get(
  "/google/callback",
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.query;

    if (!code || typeof code !== "string") {
      res.status(400).json({
        error: "Invalid request",
        message: "Authorization code is required"
      });
      return;
    }

    try {
      // Trocar código por perfil do usuário
      const googleProfile = await exchangeGoogleCode(code);

      // Criar ou atualizar usuário
      const user = await createOrUpdateUserFromGoogle(googleProfile);

      // Criar sessão de autenticação
      const { session: _session, tokens } = await createAuthSession(
        user,
        req.ip,
        req.get("user-agent")
      );

      // Definir cookie httpOnly com token (ajustado para cenários cross-site em produção)
      res.cookie("auth_token", tokens.accessToken, getAuthCookieOptions(tokens.expiresIn));

      // Redirecionar para frontend com sucesso (incluindo token para fallback de localStorage)
      const frontendUrl = resolveFrontendUrl(req);
      res.redirect(`${frontendUrl}/auth/callback?success=true&token=${tokens.accessToken}`);
    } catch (err) {
      logger.error("Google OAuth callback error", err);

      const frontendUrl = resolveFrontendUrl(req);
      res.redirect(`${frontendUrl}/auth/callback?error=auth_failed`);
    }
  })
);

/**
 * POST /api/auth/token
 * Autentica com owner token (bypass OAuth)
 */
router.post(
  "/token",
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        error: "Invalid request",
        message: "Token is required"
      });
      return;
    }

    // Importar função de verificação
    const { verifyOwnerToken, ensureOwnerUser } = await import("../services/authService.js");

    if (!verifyOwnerToken(token)) {
      res.status(401).json({
        error: "Invalid token",
        message: "Owner token is invalid"
      });
      return;
    }

    try {
      const ownerUser = await ensureOwnerUser();

      // Criar sessão para owner
      const { session: _session, tokens } = await createAuthSession(
        ownerUser,
        req.ip,
        req.get("user-agent")
      );

      // Definir cookie
      res.cookie("auth_token", tokens.accessToken, getAuthCookieOptions(tokens.expiresIn));

      res.json({
        success: true,
        user: {
          id: ownerUser.id,
          email: ownerUser.email,
          name: ownerUser.name,
          role: ownerUser.role
        },
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: tokens.expiresIn
        }
      });
    } catch (err) {
      logger.error("Owner token authentication error", err);
      res.status(500).json({
        error: "Authentication error",
        message: "Could not authenticate with owner token"
      });
    }
  })
);

/**
 * GET /api/auth/me
 * Retorna informações do usuário autenticado
 */
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    });
  })
);

/**
 * POST /api/auth/logout
 * Encerra sessão atual
 */
router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.sessionId) {
      res.status(400).json({ error: "No active session" });
      return;
    }

    try {
      revokeSession(req.sessionId);

      // Limpar cookie
      res.clearCookie("auth_token");

      res.json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (err) {
      logger.error("Logout error", err);
      res.status(500).json({
        error: "Logout error",
        message: "Could not log out"
      });
    }
  })
);

/**
 * POST /api/auth/logout-all
 * Encerra todas as sessões do usuário
 */
router.post(
  "/logout-all",
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      revokeAllUserSessions(req.user.id);

      // Limpar cookie
      res.clearCookie("auth_token");

      res.json({
        success: true,
        message: "All sessions terminated"
      });
    } catch (err) {
      logger.error("Logout all error", err);
      res.status(500).json({
        error: "Logout error",
        message: "Could not terminate sessions"
      });
    }
  })
);

/**
 * GET /api/auth/status
 * Verifica status de autenticação (público)
 */
router.get(
  "/status",
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.json({
        authenticated: false,
        debug: req.authDebug
      });
      return;
    }

    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  })
);

/**
 * POST /api/auth/cleanup
 * Limpa sessões expiradas (apenas OWNER)
 */
router.post(
  "/cleanup",
  requireAuth,
  requireRole(UserRole.OWNER),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const deletedCount = cleanupExpiredSessions();

    res.json({
      success: true,
      deletedSessions: deletedCount
    });
  })
);

export default router;
