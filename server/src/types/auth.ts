/**
 * Authentication & Authorization Types
 * Sistema de autenticação com Google OAuth e controle de acesso por roles
 */

export enum UserRole {
  OWNER = "owner",  // Acesso total irrestrito (proprietário)
  USER = "user"     // Acesso limitado (outros/terceiros)
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  googleId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLogin: string | null;
  isActive: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  expiresAt: string;
  createdAt: string;
  lastActivity: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
  session?: AuthSession;
}

/**
 * Permissões por role
 */
export const RolePermissions: Record<UserRole, string[]> = {
  [UserRole.OWNER]: ["*"], // Acesso total
  [UserRole.USER]: [
    "optimize:read",
    "history:read:own", // Apenas próprio histórico
    "scripts:read:own",
    "sessions:read:own"
  ]
};

/**
 * Limites de uso por role
 */
export interface UsageLimits {
  optimizationsPerDay: number;
  maxScriptSizeKB: number;
  maxScriptLines: number; // -1 = ilimitado
  maxConcurrentSessions: number;
  enabledModes: string[];
  canUseMultipleFiles: boolean;
  ultraExpertExecutionsPerDay: number; // -1 = ilimitado, 0 = desabilitado
}

export const RoleUsageLimits: Record<UserRole, UsageLimits> = {
  [UserRole.OWNER]: {
    optimizationsPerDay: -1, // Ilimitado
    maxScriptSizeKB: -1,
    maxScriptLines: -1, // Ilimitado
    maxConcurrentSessions: -1,
    enabledModes: ["ultra-expert", "nvidia-fast"],
    canUseMultipleFiles: true,
    ultraExpertExecutionsPerDay: -1 // Ilimitado
  },
  [UserRole.USER]: {
    optimizationsPerDay: 4, // FREE TIER: 4 otimizações/dia
    maxScriptSizeKB: 1000,
    maxScriptLines: 200, // FREE TIER: 200 linhas base
    maxConcurrentSessions: 2,
    enabledModes: ["ultra-expert", "nvidia-fast"], // Permite modo rápido NVIDIA
    canUseMultipleFiles: false, // Apenas 1 arquivo
    ultraExpertExecutionsPerDay: 1 // 1 execução Ultra Expert POR DIA
  }
};
