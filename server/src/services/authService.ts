/**
 * Authentication Service
 * Gerencia autenticação Google OAuth, JWT tokens e sessões de usuário
 * Adaptado para Firestore
 */

import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { OAuth2Client } from "google-auth-library";

import { getFirestore } from "../lib/firestoreDb";
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
  const db = getFirestore();
  const now = new Date().toISOString();

  try {
    // Verificar se usuário já existe por google_id
    let userSnapshot = await db.collection("users").where("google_id", "==", profile.id).limit(1).get();

    // Se não achou por google_id, tenta por email
    if (userSnapshot.empty) {
      userSnapshot = await db.collection("users").where("email", "==", profile.email).limit(1).get();
    }

    if (!userSnapshot.empty) {
      const userDoc = userSnapshot.docs[0];
      const existing = userDoc.data() as any;

      // Atualizar last_login e informações do perfil
      await userDoc.ref.update({
        last_login: now,
        name: profile.name,
        avatar_url: profile.picture || null
      });

      logger.info("User logged in", { userId: existing.id, email: profile.email });

      return {
        id: existing.id,
        email: existing.email,
        name: profile.name,
        role: existing.role as UserRole,
        googleId: existing.google_id,
        avatarUrl: profile.picture || null,
        createdAt: existing.created_at,
        lastLogin: now,
        isActive: existing.is_active
      };
    }

    // Criar novo usuário
    const userId = uuidv4();

    // Verificar se é email do owner (auto-promoção)
    const role = profile.email === config.ownerEmail
      ? UserRole.OWNER
      : UserRole.USER;

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

    await db.collection("users").doc(userId).set({
      id: userId,
      email: profile.email,
      name: profile.name,
      role,
      google_id: profile.id,
      avatar_url: profile.picture || null,
      created_at: now,
      last_login: now,
      is_active: true
    });

    logger.info("New user created", { userId, email: profile.email, role });

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
  const db = getFirestore();
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
    const sessionData = {
      id: sessionId,
      user_id: user.id,
      token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      created_at: now,
      last_activity: now,
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    };

    await db.collection("auth_sessions").doc(sessionId).set(sessionData);

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
export async function getUserById(userId: string): Promise<User | null> {
  const db = getFirestore();

  try {
    const doc = await db.collection("users").doc(userId).get();

    if (!doc.exists) return null;

    const user = doc.data() as any;
    if (!user.is_active) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      googleId: user.google_id,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      isActive: user.is_active
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
  const db = getFirestore();

  try {
    const snapshot = await db.collection("auth_sessions")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const session = snapshot.docs[0].data() as any;

    // Verificar expiração
    if (new Date(session.expires_at) <= new Date()) {
      return null;
    }

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
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const db = getFirestore();
  const now = new Date().toISOString();

  try {
    await db.collection("auth_sessions").doc(sessionId).update({
      last_activity: now
    });
  } catch (err) {
    logger.error("Error updating session activity", err);
  }
}

/**
 * Revoga sessão (logout)
 */
export async function revokeSession(sessionId: string): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection("auth_sessions").doc(sessionId).delete();
    logger.info("Session revoked", { sessionId });
  } catch (err) {
    logger.error("Error revoking session", err);
  }
}

/**
 * Revoga todas as sessões de um usuário
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = getFirestore();

  try {
    const snapshot = await db.collection("auth_sessions").where("user_id", "==", userId).get();

    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

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
  const db = getFirestore();
  const ownerEmail = config.ownerEmail || "owner@qlikcodex.local";
  const now = new Date().toISOString();

  try {
    // Verificar se owner já existe
    const snapshot = await db.collection("users").where("email", "==", ownerEmail).limit(1).get();

    if (!snapshot.empty) {
      const ownerDoc = snapshot.docs[0];
      const owner = ownerDoc.data() as any;

      // Garantir que role seja owner
      if (owner.role !== UserRole.OWNER) {
        await ownerDoc.ref.update({ role: UserRole.OWNER });
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
        isActive: owner.is_active
      };
    }

    // Criar owner
    const ownerId = uuidv4();

    await db.collection("users").doc(ownerId).set({
      id: ownerId,
      email: ownerEmail,
      name: "Owner",
      role: UserRole.OWNER,
      google_id: null,
      avatar_url: null,
      created_at: now,
      last_login: now,
      is_active: true
    });

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
export async function cleanupExpiredSessions(): Promise<number> {
  const db = getFirestore();

  try {
    const now = new Date().toISOString();
    const snapshot = await db.collection("auth_sessions")
      .where("expires_at", "<=", now)
      .limit(100)
      .get();

    if (snapshot.empty) return 0;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const deletedCount = snapshot.size;
    logger.info("Expired sessions cleaned up", { count: deletedCount });

    return deletedCount;
  } catch (err) {
    logger.error("Error cleaning up expired sessions", err);
    return 0;
  }
}
