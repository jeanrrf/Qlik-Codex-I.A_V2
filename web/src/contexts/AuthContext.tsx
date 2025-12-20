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
   * Agora com tratamento de timeout para não bloquear a renderização
   */
  const revalidate = async () => {
    const startTime = Date.now();
    try {
      let storedToken: string | undefined;
      try {
        storedToken = localStorage.getItem(ACCESS_TOKEN_KEY) || undefined;
      } catch {
        storedToken = undefined;
      }

      const status = await checkAuthStatus(storedToken);

      if (status.authenticated && status.user) {
        try {
          const userData = await getCurrentUser(storedToken);
          setState({
            user: userData.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            accessToken: storedToken || "cookie"
          });
        } catch (userErr) {
          // Se falhar ao buscar dados do usuário, ainda assim libera a UI
          console.warn("[AuthContext] Falha ao buscar dados do usuário:", userErr);
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            accessToken: null
          });
        }
      } else {
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
      const elapsed = Date.now() - startTime;
      // Só loga erro se não for timeout (timeout é esperado quando backend offline)
      if (elapsed < 4500) {
        console.warn("[AuthContext] Erro na inicialização:", err);
      }
      try {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch {
        // ignore storage errors
      }
      // Libera a UI mesmo com erro - não bloqueia renderização
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null, // Não mostra erro para não assustar o usuário guest
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
