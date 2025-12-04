/**
 * Authentication Context
 * Gerencia estado de autenticação e cotas globalmente (Convex Edition)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// ============ TYPES ============

interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "user";
  avatarUrl?: string;
}

interface Quota {
  optimizations: { remaining: number; limit: number };
  ultraExpert: { remaining: number; limit: number };
  maxLines: number;
  resetAt?: string;
  isUnlimited?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  quota: Quota | null;
}

interface AuthContextValue extends AuthState {
  // Ações de login
  login: (token: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (googleData?: { googleId: string; email: string; name: string; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Helpers de quota
  canOptimize: (linesCount?: number) => boolean;
  canFormat: () => boolean;
  isOwner: boolean;
  consumeOptimization: () => Promise<void>;
  consumeFormat: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Storage key
const AUTH_STORAGE_KEY = "qlik-codex-auth";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    quota: null,
  });

  // Convex mutations
  const loginWithTokenMutation = useMutation(api.auth.loginWithToken);
  const loginEmailMutation = useMutation(api.auth.loginWithEmail);
  const registerMutation = useMutation(api.auth.registerWithEmail);
  const loginGoogleMutation = useMutation(api.auth.loginWithGoogle);
  const consumeQuotaMutation = useMutation(api.auth.consumeQuota);

  // Query para quota (executa quando tem userId)
  const userId = state.user?.id as Id<"users"> | undefined;
  const quotaData = useQuery(
    api.auth.getUserQuota,
    userId ? { userId } : "skip"
  );

  // Atualizar quota quando dados chegarem
  useEffect(() => {
    if (quotaData) {
      setState((prev) => ({
        ...prev,
        quota: {
          optimizations: quotaData.optimizations,
          ultraExpert: quotaData.ultraExpert,
          maxLines: quotaData.maxLines,
          resetAt: quotaData.resetAt,
          isUnlimited: quotaData.isUnlimited,
        },
      }));
    }
  }, [quotaData]);

  // Inicializar do localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const userData = JSON.parse(stored) as User;
          setState({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            quota: null,
          });
        } else {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            quota: null,
          });
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          quota: null,
        });
      }
    };
    initAuth();
  }, []);

  // ============ LOGIN METHODS ============

  const login = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await loginWithTokenMutation({ token });
      const user: User = {
        id: response.user.id as string,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as "free" | "premium" | "owner",
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        quota: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, [loginWithTokenMutation]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await loginEmailMutation({ email, password });
      const user: User = {
        id: response.user.id as string,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as "free" | "premium" | "owner",
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        quota: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, [loginEmailMutation]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await registerMutation({ email, password, name });
      const user: User = {
        id: response.user.id as string,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as "free" | "premium" | "owner",
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        quota: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Registration failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, [registerMutation]);

  const loginWithGoogle = useCallback(async (googleData?: { googleId: string; email: string; name: string; avatarUrl?: string }) => {
    if (!googleData) {
      setState((prev) => ({
        ...prev,
        error: "Dados do Google não fornecidos",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await loginGoogleMutation(googleData);
      const user: User = {
        id: response.user.id as string,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as "free" | "premium" | "owner",
        avatarUrl: response.user.avatarUrl,
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        quota: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Google login failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, [loginGoogleMutation]);

  const logout = useCallback(async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      quota: null,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      setState((prev) => ({
        ...prev,
        user: JSON.parse(stored) as User,
      }));
    }
  }, []);

  // ============ QUOTA HELPERS ============

  const canOptimize = useCallback((linesCount?: number): boolean => {
    if (!state.user) return false;
    if (state.user.role === "owner") return true;
    if (!state.quota) return false;

    // Check general optimization limit
    if (state.quota.optimizations.remaining <= 0) return false;

    // Check line limit
    if (linesCount && linesCount > state.quota.maxLines) return false;

    return true;
  }, [state.user, state.quota]);

  const canFormat = useCallback((): boolean => {
    if (!state.user) return false;
    // Formatting is unlimited in official rules
    return true;
  }, [state.user]);

  const consumeOptimization = useCallback(async () => {
    if (!state.user) return;
    try {
      await consumeQuotaMutation({
        userId: state.user.id as Id<"users">,
        action: "optimization",
        success: true,
      });
    } catch (err) {
      console.error("Failed to consume optimization quota:", err);
    }
  }, [state.user, consumeQuotaMutation]);

  const consumeFormat = useCallback(async () => {
    // No quota consumption for formatting in official rules
  }, []);

  const isOwner = state.user?.role === "owner";

  // ============ VALUE ============

  const value: AuthContextValue = {
    ...state,
    login,
    loginWithEmail,
    register,
    loginWithGoogle,
    logout,
    refreshUser,
    canOptimize,
    canFormat,
    isOwner,
    consumeOptimization,
    consumeFormat,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar contexto de autenticação
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
