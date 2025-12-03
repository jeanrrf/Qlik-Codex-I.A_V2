/**
 * Authentication Context
 * Gerencia estado de autenticação globalmente no frontend (Convex Edition)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

import { User, AuthContextValue, AuthState } from "../types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Chave para persistir auth no localStorage
const AUTH_STORAGE_KEY = "qlik-codex-auth";

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

  const loginWithTokenMutation = useMutation(api.auth.loginWithToken);

  /**
   * Verifica autenticação ao carregar a aplicação (via localStorage)
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const userData = JSON.parse(stored);
          setState({
            user: userData as User,
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
          error: null
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

      const response = await loginWithTokenMutation({ token });

      const user = response.user as User;

      // Persistir no localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      setState({
        user,
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
   * Login com Google OAuth (não suportado no Convex free - usar token)
   */
  const loginWithGoogle = async () => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: "Google OAuth não disponível. Use o token de acesso."
    }));
  };

  /**
   * Logout
   */
  const logout = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  };

  /**
   * Recarregar dados do usuário
   */
  const refreshUser = async () => {
    // No Convex, dados vêm do localStorage
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      setState((prev) => ({
        ...prev,
        user: JSON.parse(stored) as User
      }));
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
