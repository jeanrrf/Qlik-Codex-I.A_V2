/**
 * Authentication Context
 * Gerencia estado de autenticação globalmente no frontend
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { User, AuthContextValue, AuthState } from "../types/auth";
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  /**
   * Verifica autenticação ao carregar a aplicação
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const status = await checkAuthStatus();

        if (status.authenticated && status.user) {
          const userData = await getCurrentUser();
          setState({
            user: userData.user as User,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } else {
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: "Failed to check authentication status"
        });
      }
    };

    initAuth();
  }, []);

  /**
   * Login com owner token (bypass OAuth)
   */
  const login = async (token: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await loginWithToken(token);

      setState({
        user: response.user as User,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
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

      const authUrl = await getGoogleAuthUrl();

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

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (err) {
      console.error("Logout error:", err);
      // Forçar logout local mesmo se API falhar
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  };

  /**
   * Recarregar dados do usuário
   */
  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      setState((prev) => ({
        ...prev,
        user: userData.user as User
      }));
    } catch (err) {
      console.error("Refresh user error:", err);
      // Se falhar ao recarregar, pode ser que sessão expirou
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Session expired"
      });
    }
  };

  const value: AuthContextValue = {
    ...state,
    login,
    loginWithGoogle,
    logout,
    refreshUser
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
