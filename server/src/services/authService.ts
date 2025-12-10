/**
 * Authentication Service
 * Gerencia autenticação Google OAuth, JWT tokens e sessões de usuário
 */

// import type { InValue } from '@libsql/client'; // Unused
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { initTursoDb, getTursoDb, TursoSqliteWrapper } from "../lib/tursoDb";
// REFACTORED: Turso Only
import {
  User,
  AuthSession,
  GoogleProfile,
  JWTPayload,
  AuthTokens,
  UserRole
} from "../types/auth";

/**
 * Cliente OAuth2 do Google
 */
let googleClient: OAuth2Client | null = null;

// Removed local AuthDb type definition in favor of using TursoSqliteWrapper directly or implicit.
// But standard interface expected by prepare/run suggests we should keep the interface or ensure TursoSqliteWrapper matches.
// TursoSqliteWrapper matches simplified structure.

async function getAuthDb() {
  await initTursoDb();
  return new TursoSqliteWrapper(getTursoDb());
}

function getGoogleClient(): OAuth2Client {
  // Sempre recriar o cliente para garantir que pegue as credenciais mais recentes
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  googleClient = new OAuth2Client(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );

  return googleClient;
}

/**
 * Gera JWT token de acesso
 */
export function generateAccessToken(
  payload: JWTPayload,
  expiresInOverride?: string | number
): string {
  const expiresIn = expiresInOverride ?? config.jwtExpiresIn;

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn
  } as jwt.SignOptions);
}

/**
 * Gera refresh token
 */
export function generateRefreshToken(): string {
  // Alinhar refresh token com a longevidade configurada das sessões (limitada ao máximo que navegadores suportam)
  const refreshExpiresIn = Number.isFinite(config.effectiveAuthDurationDays)
    ? `${config.effectiveAuthDurationDays}d`
    : "400d";

  return jwt.sign({ type: "refresh", jti: uuidv4() }, config.jwtSecret, {
    expiresIn: refreshExpiresIn
  } as jwt.SignOptions);
}

/**
 * Verifica e decodifica JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as unknown as JWTPayload;
    return decoded;
  } catch (_err) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Cria ou atualiza usuário a partir de perfil Google
 */
export async function createOrUpdateUserFromGoogle(
  profile: GoogleProfile
): Promise<User> {
  const db = await getAuthDb();
  const now = new Date().toISOString();

  try {
    // Verificar se usuário já existe
    const existing = await db
      .prepare("SELECT * FROM users WHERE google_id = ? OR email = ?")
      .get(profile.id, profile.email) as unknown as User | undefined;

    if (existing) {
      await db.prepare(`
        UPDATE users 
        SET last_login = ?, name = ?, avatar_url = ?
        WHERE id = ?
      `).run(now, profile.name, profile.picture || null, existing.id);

      logger.info("User logged in", { userId: existing.id, email: profile.email });

      return {
        ...existing,
        lastLogin: now,
        name: profile.name,
        avatarUrl: profile.picture || null
      };
    }

    const userId = uuidv4();
    const role = profile.email === config.ownerEmail
      ? UserRole.OWNER
      : UserRole.USER;

    await db.prepare(`
      INSERT INTO users (id, email, name, role, google_id, avatar_url, created_at, last_login, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(userId, profile.email, profile.name, role, profile.id, profile.picture || null, now, now);

    logger.info("New user created", { userId, email: profile.email, role });

    const newUser: User = {
      id: userId,
      email: profile.email,
      name: profile.name,
      role,
      googleId: profile.id,
      avatarUrl: profile.picture || null,
      createdAt: now,
      lastLogin: now,
      isActive: true
    };

    return newUser;
  } catch (err) {
    logger.error("Error creating/updating user", err);
    throw err;
  }
}

/**
 * Cria sessão de autenticação
 */
export async function createAuthSession(
  user: User,
  ipAddress?: string,
  userAgent?: string
): Promise<{ session: AuthSession; tokens: AuthTokens }> {
  const db = await getAuthDb();
  const now = new Date().toISOString();
  const sessionId = uuidv4();

  const sessionDurationDays = Number.isFinite(config.effectiveAuthDurationDays)
    ? config.effectiveAuthDurationDays
    : 400;
  const sessionDurationMs = sessionDurationDays * 24 * 60 * 60 * 1000;

  const accessToken = generateAccessToken(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    },
    `${sessionDurationDays}d`
  );

  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();

  try {
    await db.prepare(`
      INSERT INTO auth_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_activity, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      user.id,
      accessToken,
      refreshToken,
      expiresAt,
      now,
      now,
      ipAddress || null,
      userAgent || null
    );

    const session: AuthSession = {
      id: sessionId,
      userId: user.id,
      token: accessToken,
      refreshToken,
      expiresAt,
      createdAt: now,
      lastActivity: now,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null
    };

    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(sessionDurationMs / 1000)
    };

    logger.info("Auth session created", { sessionId, userId: user.id });

    return { session, tokens };
  } catch (err) {
    logger.error("Error creating auth session", err);
    throw err;
  }
}

/**
 * Busca usuário por ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = await getAuthDb();

  try {
    const user = await db
      .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
      .get(userId) as Record<string, unknown> | undefined;

    if (!user) return null;

    return {
      id: String(user.id),
      email: String(user.email),
      name: user.name as string | null,
      role: user.role as UserRole,
      googleId: user.google_id as string | null,
      avatarUrl: user.avatar_url as string | null,
      createdAt: String(user.created_at),
      lastLogin: user.last_login as string | null,
      isActive: user.is_active === 1
    };
  } catch (err) {
    logger.error("Error fetching user", err);
    return null;
  }
}

/**
 * Busca sessão por token
 */
export async function getSessionByToken(token: string): Promise<AuthSession | null> {
  const db = await getAuthDb();

  try {
    const session = await db
      .prepare("SELECT * FROM auth_sessions WHERE token = ? AND expires_at > datetime('now')")
      .get(token) as Record<string, unknown> | undefined;

    if (!session) return null;

    return {
      id: String(session.id),
      userId: String(session.user_id),
      token: String(session.token),
      refreshToken: session.refresh_token as string | null,
      expiresAt: String(session.expires_at),
      createdAt: String(session.created_at),
      lastActivity: String(session.last_activity ?? ''),
      ipAddress: session.ip_address as string | null,
      userAgent: session.user_agent as string | null
    };
  } catch (err) {
    logger.error("Error fetching session", err);
    return null;
  }
}

/**
 * Atualiza last_activity da sessão
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = await getAuthDb();
  const now = new Date().toISOString();

  try {
    await db.prepare("UPDATE auth_sessions SET last_activity = ? WHERE id = ?").run(now, sessionId);
  } catch (err) {
    logger.error("Error updating session activity", err);
  }
}

/**
 * Revoga sessão (logout)
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const db = await getAuthDb();

  try {
    await db.prepare("DELETE FROM auth_sessions WHERE id = ?").run(sessionId);
    logger.info("Session revoked", { sessionId });
  } catch (err) {
    logger.error("Error revoking session", err);
  }
}

/**
 * Revoga todas as sessões de um usuário
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = await getAuthDb();

  try {
    await db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(userId);
    logger.info("All user sessions revoked", { userId });
  } catch (err) {
    logger.error("Error revoking user sessions", err);
  }
}

/**
 * Verifica token de proprietário (bypass OAuth)
 */
export function verifyOwnerToken(token: string): boolean {
  return Boolean(config.ownerAccessToken && token === config.ownerAccessToken);
}

/**
 * Cria usuário proprietário (se não existir)
 */
export async function ensureOwnerUser(): Promise<User> {
  const db = await getAuthDb();
  const ownerEmail = config.ownerEmail || "owner@qlikcodex.local";
  const now = new Date().toISOString();

  try {
    let owner = await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(ownerEmail) as Record<string, unknown> | undefined;

    if (owner) {
      if (owner.role !== UserRole.OWNER) {
        await db.prepare("UPDATE users SET role = ? WHERE email = ?").run(UserRole.OWNER, ownerEmail);
        owner.role = UserRole.OWNER;
      }

      return {
        id: String(owner.id),
        email: String(owner.email),
        name: (owner.name as string | null) || "Owner",
        role: UserRole.OWNER,
        googleId: owner.google_id as string | null,
        avatarUrl: owner.avatar_url as string | null,
        createdAt: String(owner.created_at),
        lastLogin: owner.last_login as string | null,
        isActive: owner.is_active === 1
      };
    }

    const ownerId = uuidv4();

    await db.prepare(`
      INSERT INTO users (id, email, name, role, google_id, avatar_url, created_at, last_login, is_active)
      VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 1)
    `).run(ownerId, ownerEmail, "Owner", UserRole.OWNER, now, now);

    logger.info("Owner user created", { ownerId, email: ownerEmail });

    return {
      id: ownerId,
      email: ownerEmail,
      name: "Owner",
      role: UserRole.OWNER,
      googleId: null,
      avatarUrl: null,
      createdAt: now,
      lastLogin: now,
      isActive: true
    };
  } catch (err) {
    logger.error("Error ensuring owner user", err);
    throw err;
  }
}

/**
 * Gera URL de autenticação Google OAuth
 */
export function getGoogleAuthUrl(): string {
  const client = getGoogleClient();

  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ];

  logger.info("[AUTH] Gerando URL de autenticação Google", {
    clientId: config.googleClientId,
    redirectUri: config.googleRedirectUri
  });

  return client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent"
  });
}

/**
 * Troca código de autorização por tokens e perfil
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const client = getGoogleClient();

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.googleClientId
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Invalid Google token payload");
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture
    };
  } catch (err) {
    logger.error("Error exchanging Google code", err);
    throw new Error("Failed to authenticate with Google");
  }
}

/**
 * Limpa sessões expiradas (job de limpeza)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getAuthDb();

  try {
    const result = await db.prepare("DELETE FROM auth_sessions WHERE expires_at <= datetime('now')").run();
    const deletedCount = (result as unknown as { changes?: number }).changes ?? 0;

    if (deletedCount > 0) {
      logger.info("Expired sessions cleaned up", { count: deletedCount });
    }

    return deletedCount;
  } catch (err) {
    logger.error("Error cleaning up expired sessions", err);
    return 0;
  }
}
