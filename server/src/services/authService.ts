/**
 * Authentication Service
 * Gerencia autenticação Google OAuth, JWT tokens e sessões de usuário
 */

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";

import { getSqliteDb } from "../lib/sqliteDb";
import { logger } from "../lib/logger";
import { config } from "../lib/config";
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

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }
    googleClient = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );
  }
  return googleClient;
}

/**
 * Gera JWT token de acesso
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  } as jwt.SignOptions);
}

/**
 * Gera refresh token
 */
export function generateRefreshToken(): string {
  return jwt.sign({ type: "refresh", jti: uuidv4() }, config.jwtSecret, {
    expiresIn: "30d"
  });
}

/**
 * Verifica e decodifica JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    return decoded;
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Cria ou atualiza usuário a partir de perfil Google
 */
export async function createOrUpdateUserFromGoogle(
  profile: GoogleProfile
): Promise<User> {
  const db = getSqliteDb();
  const now = new Date().toISOString();

  try {
    // Verificar se usuário já existe
    const existing = db
      .prepare("SELECT * FROM users WHERE google_id = ? OR email = ?")
      .get(profile.id, profile.email) as User | undefined;

    if (existing) {
      // Atualizar last_login e informações do perfil
      db.prepare(`
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

    // Criar novo usuário
    const userId = uuidv4();

    // Verificar se é email do owner (auto-promoção)
    const role = profile.email === config.ownerEmail
      ? UserRole.OWNER
      : UserRole.USER;

    db.prepare(`
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
  const db = getSqliteDb();
  const now = new Date().toISOString();
  const sessionId = uuidv4();

  // Gerar tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId
  });

  const refreshToken = generateRefreshToken();

  // Calcular expiração (15 dias para sessão)
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

  try {
    db.prepare(`
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
      expiresIn: 15 * 24 * 60 * 60 // 15 dias em segundos
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
export function getUserById(userId: string): User | null {
  const db = getSqliteDb();

  try {
    const user = db
      .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
      .get(userId) as any;

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      googleId: user.google_id,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLogin: user.last_login,
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
export function getSessionByToken(token: string): AuthSession | null {
  const db = getSqliteDb();

  try {
    const session = db
      .prepare("SELECT * FROM auth_sessions WHERE token = ? AND expires_at > datetime('now')")
      .get(token) as any;

    if (!session) return null;

    return {
      id: session.id,
      userId: session.user_id,
      token: session.token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      ipAddress: session.ip_address,
      userAgent: session.user_agent
    };
  } catch (err) {
    logger.error("Error fetching session", err);
    return null;
  }
}

/**
 * Atualiza last_activity da sessão
 */
export function updateSessionActivity(sessionId: string): void {
  const db = getSqliteDb();
  const now = new Date().toISOString();

  try {
    db.prepare("UPDATE auth_sessions SET last_activity = ? WHERE id = ?").run(now, sessionId);
  } catch (err) {
    logger.error("Error updating session activity", err);
  }
}

/**
 * Revoga sessão (logout)
 */
export function revokeSession(sessionId: string): void {
  const db = getSqliteDb();

  try {
    db.prepare("DELETE FROM auth_sessions WHERE id = ?").run(sessionId);
    logger.info("Session revoked", { sessionId });
  } catch (err) {
    logger.error("Error revoking session", err);
  }
}

/**
 * Revoga todas as sessões de um usuário
 */
export function revokeAllUserSessions(userId: string): void {
  const db = getSqliteDb();

  try {
    db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").run(userId);
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
export function ensureOwnerUser(): User {
  const db = getSqliteDb();
  const ownerEmail = config.ownerEmail || "owner@qlikcodex.local";
  const now = new Date().toISOString();

  try {
    // Verificar se owner já existe
    let owner = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(ownerEmail) as any;

    if (owner) {
      // Garantir que role seja owner
      if (owner.role !== UserRole.OWNER) {
        db.prepare("UPDATE users SET role = ? WHERE email = ?").run(UserRole.OWNER, ownerEmail);
        owner.role = UserRole.OWNER;
      }

      return {
        id: owner.id,
        email: owner.email,
        name: owner.name || "Owner",
        role: UserRole.OWNER,
        googleId: owner.google_id,
        avatarUrl: owner.avatar_url,
        createdAt: owner.created_at,
        lastLogin: owner.last_login,
        isActive: owner.is_active === 1
      };
    }

    // Criar owner
    const ownerId = uuidv4();

    db.prepare(`
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
export function cleanupExpiredSessions(): number {
  const db = getSqliteDb();

  try {
    const result = db.prepare("DELETE FROM auth_sessions WHERE expires_at <= datetime('now')").run();
    const deletedCount = result.changes;

    if (deletedCount > 0) {
      logger.info("Expired sessions cleaned up", { count: deletedCount });
    }

    return deletedCount;
  } catch (err) {
    logger.error("Error cleaning up expired sessions", err);
    return 0;
  }
}
