/**
 * Authentication Context
 * Gerencia estado de autenticação globalmente no frontend
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { User, AuthContextValue, AuthState, UserRole } from "../types/auth";
import {
  checkAuthStatus,
  getCurrentUser,
  getGoogleAuthUrl,
  loginWithToken,
  logout as logoutApi
} from "../api/authClient";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const ACCESS_TOKEN_KEY = "qlik-codex-access-token";

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    accessToken: null
  });

  /**
   * Função utilitária para validar sessão usando cookies HttpOnly
   */
  const revalidate = async () => {
    // console.log(" [AuthContext] Revalidate: Iniciando...");
    try {
      let storedToken: string | undefined;
      try {
        storedToken = localStorage.getItem(ACCESS_TOKEN_KEY) || undefined;
        // console.log(" [AuthContext] Token do localStorage:", !!storedToken);
      } catch {
        // console.warn(" [AuthContext] Erro ao acessar localStorage");
        storedToken = undefined;
      }

      // console.log(" [AuthContext] Verificando status de autenticação...");
      const status = await checkAuthStatus(storedToken);
      // console.log(" [AuthContext] Status recebido:", status);

      if (status.authenticated && status.user) {
        // console.log(" [AuthContext] Usuário autenticado, buscando dados completos...");
        const userData = await getCurrentUser(storedToken);
        // console.log(" [AuthContext] Dados do usuário recebidos:", userData.user?.email);
        setState({
          user: userData.user as User,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          accessToken: storedToken || "cookie"
        });
        // console.log(" [AuthContext] Estado atualizado - usuário autenticado");
      } else {
        // console.log(" [AuthContext] Usuário não autenticado");
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch {
          // ignore storage errors
        }
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          accessToken: null
        });
      }
    } catch (err) {
      console.error(" [AuthContext] Erro na inicialização:", err);
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch {
        // ignore storage errors
      }
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Failed to check authentication status",
        accessToken: null
      });
    }
  };

  /**
   * Verifica autenticação ao carregar a aplicação
   */
  useEffect(() => {
    revalidate();
  }, []);

  /**
   * Login com owner token (bypass OAuth)
   */
  const login = async (token: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await loginWithToken(token);
      try {
        localStorage.setItem(ACCESS_TOKEN_KEY, response.tokens.accessToken);
      } catch {
        // ignore storage failures
      }
      // No need to save token in localStorage for HttpOnly cookies
      // localStorage.setItem(ACCESS_TOKEN_KEY, response.tokens.accessToken);

      setState({
        user: response.user as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        accessToken: response.tokens.accessToken
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
        accessToken: null
      });
      throw err;
    }
  };

  /**
   * Login com Google OAuth
   */
  const loginWithGoogle = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const authUrl = await getGoogleAuthUrl(state.accessToken || undefined);

      // Redirecionar para URL de autenticação do Google
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Google login failed";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      throw err;
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await logoutApi();
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch {
        // ignore storage errors
      }

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null
      });
    } catch (err) {
      console.error("[AuthContext] Logout error:", err);
      // Forçar logout local mesmo se API falhar
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        accessToken: null
      });
    }
  };

  /**
   * Recarregar dados do usuário
   */
  const refreshUser = async () => {
    try {
      const token = state.accessToken || undefined;
      const userData = await getCurrentUser(token);
      setState((prev) => ({
        ...prev,
        user: userData.user as User,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        accessToken: token || "cookie"
      }));
    } catch (err) {
      console.error("Refresh user error:", err);
      // Se falhar ao recarregar, pode ser que sessão expirou
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Session expired",
        accessToken: null
      });
    }
  };

  const value: AuthContextValue = {
    ...state,
    login,
    loginWithGoogle,
    logout,
    revalidate,
    refreshUser,
    isOwner: () => state.user?.role === UserRole.OWNER
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
