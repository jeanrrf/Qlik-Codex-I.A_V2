/**
 * Authentication & Authorization Types
 * Sistema de autenticação com Google OAuth e controle de acesso por roles
 */

export enum UserRole {
  OWNER = "owner",  // Acesso total irrestrito (proprietário)
  USER = "user",    // Acesso limitado (outros/terceiros)
  GUEST = "guest"   // Acesso sem login (público)
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
  ],
  [UserRole.GUEST]: [
    "optimize:read"
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
  nvidiaFastExecutionsPerDay: number; // -1 = ilimitado, 0 = desabilitado
}

export const RoleUsageLimits: Record<UserRole, UsageLimits> = {
  [UserRole.OWNER]: {
    optimizationsPerDay: -1, // Ilimitado
    maxScriptSizeKB: -1,
    maxScriptLines: -1, // Ilimitado
    maxConcurrentSessions: -1,
    enabledModes: ["ultra-expert", "nvidia-fast"],
    canUseMultipleFiles: true,
    ultraExpertExecutionsPerDay: -1, // Ilimitado
    nvidiaFastExecutionsPerDay: -1 // Ilimitado
  },
  [UserRole.USER]: {
    optimizationsPerDay: 10, // FREE TIER: Aumentado para 10 otimizações/dia
    maxScriptSizeKB: 2000,
    maxScriptLines: 500, // FREE TIER: Aumentado para 500 linhas
    maxConcurrentSessions: 5,
    enabledModes: ["ultra-expert", "nvidia-fast"], // Permite modo rápido NVIDIA
    canUseMultipleFiles: false, // Apenas 1 arquivo
    ultraExpertExecutionsPerDay: 3, // Aumentado para 3 execuções Ultra Expert
    nvidiaFastExecutionsPerDay: 10 // Aumentado para 10 execuções NVIDIA Fast
  },
  [UserRole.GUEST]: {
    optimizationsPerDay: 3, // GUEST: 3 otimizações/dia
    maxScriptSizeKB: 500,
    maxScriptLines: 100, // GUEST: 100 linhas para teste
    maxConcurrentSessions: 1,
    enabledModes: ["nvidia-fast"], // Apenas modo rápido para guests
    canUseMultipleFiles: false,
    ultraExpertExecutionsPerDay: 0, // Sem acesso a ultra-expert
    nvidiaFastExecutionsPerDay: 3
  }
};
