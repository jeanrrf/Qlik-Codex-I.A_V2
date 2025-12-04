/**
 * LoginPage - Página de autenticação
 */

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

import "./LoginPage.css";

export function LoginPage() {
  const { loginWithGoogle, login, isLoading, error } = useAuth();
  const [ownerToken, setOwnerToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const processGoogleCredential = async (credentialResponse: any) => {
    setGoogleError(null);
    if (!credentialResponse?.credential) {
      setGoogleError("Falha ao obter credenciais do Google");
      return;
    }

    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      await loginWithGoogle({
        googleId: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        avatarUrl: decoded.picture,
      });
    } catch (err) {
      console.error("Google login error:", err);
      setGoogleError("Falha ao autenticar com o Google");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: processGoogleCredential,
    onError: () => setGoogleError("Falha no login com Google"),
    flow: "implicit",
  });

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTokenError(null);

    if (!ownerToken.trim()) {
      setTokenError("Token is required");
      return;
    }

    try {
      await login(ownerToken);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Invalid token");
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-gradient">
              <span className="logo-text">QLIK CODEX I.A</span>
            </div>
          </div>
          <h1 className="login-title">Bem-vindo</h1>
          <p className="login-subtitle">
            Faça login para acessar a plataforma de otimização Qlik
          </p>
        </div>

        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="login-methods">
          {/* Google Login */}
          <button
            className="login-button login-button-google"
            onClick={() => googleLogin()}
            disabled={isLoading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? "Autenticando..." : "Entrar com Google"}
          </button>

          {/* Divider */}
          <div className="login-divider">
            <span>ou</span>
          </div>

          {/* Owner Token Login */}
          {!showTokenInput ? (
            <button
              className="login-button login-button-token"
              onClick={() => setShowTokenInput(true)}
            >
              <span className="token-icon">🔑</span>
              Acesso Proprietário
            </button>
          ) : (
            <form className="token-form" onSubmit={handleTokenLogin}>
              <input
                type="password"
                className="token-input"
                placeholder="Cole seu token de acesso"
                value={ownerToken}
                onChange={(e) => setOwnerToken(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              {tokenError && <div className="token-error">{tokenError}</div>}
              <div className="token-actions">
                <button
                  type="button"
                  className="token-cancel"
                  onClick={() => {
                    setShowTokenInput(false);
                    setOwnerToken("");
                    setTokenError(null);
                  }}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button type="submit" className="token-submit" disabled={isLoading}>
                  {isLoading ? "Verificando..." : "Entrar"}
                </button>
              </div>
            </form>
          )}

          {googleError && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              {googleError}
            </div>
          )}
        </div>

        <div className="login-footer">
          <p className="footer-text">
            Ao fazer login, você concorda com os{" "}
            <a href="/terms" className="footer-link">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="/privacy" className="footer-link">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>

      {/* Background Effect */}
      <div className="login-background">
        <div className="bg-gradient bg-gradient-1"></div>
        <div className="bg-gradient bg-gradient-2"></div>
        <div className="bg-gradient bg-gradient-3"></div>
      </div>
    </div>
  );
}
