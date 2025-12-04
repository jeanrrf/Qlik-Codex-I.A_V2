/**
 * AuthModal - Modal de Login/Registro
 */
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import "./AuthModal.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "login" | "register" | "token";

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, loginWithEmail, register, isLoading, error } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    token: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      if (mode === "token") {
        await login(formData.token);
      } else if (mode === "login") {
        await loginWithEmail(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          setLocalError("Nome é obrigatório");
          return;
        }
        await register(formData.email, formData.password, formData.name);
      }
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Erro ao autenticar");
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="url(#auth-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="url(#auth-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="url(#auth-gradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="auth-gradient" x1="2" y1="2" x2="22" y2="22">
                  <stop stopColor="#00f2ff" />
                  <stop offset="1" stopColor="#00ff88" />
                </linearGradient>
              </defs>
            </svg>
            <span className="auth-title">QLIK CODEX I.A</span>
          </div>
          <button className="auth-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
          >
            Entrar
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
          >
            Criar Conta
          </button>
          <button
            className={`auth-tab ${mode === "token" ? "active" : ""}`}
            onClick={() => setMode("token")}
          >
            Token
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "token" ? (
            <div className="auth-field">
              <label htmlFor="token">Token de Acesso</label>
              <input
                type="password"
                id="token"
                name="token"
                value={formData.token}
                onChange={handleChange}
                placeholder="Digite seu token de proprietário"
                autoComplete="off"
                required
              />
              <span className="auth-hint">
                Use o token configurado no servidor para acesso de proprietário.
              </span>
            </div>
          ) : (
            <>
              {mode === "register" && (
                <div className="auth-field">
                  <label htmlFor="name">Nome</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Senha</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••••"}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                />
              </div>
            </>
          )}

          {(localError || error) && (
            <div className="auth-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {localError || error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="auth-loading">
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
                </svg>
                Processando...
              </span>
            ) : mode === "register" ? (
              "Criar Conta"
            ) : mode === "token" ? (
              "Acessar como Proprietário"
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <div className="auth-quota-info">
            <div className="quota-tier">
              <span className="tier-badge free">Free</span>
              <span>5 otimizações/dia • 500 linhas</span>
            </div>
            <div className="quota-tier">
              <span className="tier-badge premium">Premium</span>
              <span>50 otimizações/dia • 5000 linhas</span>
            </div>
            <div className="quota-tier">
              <span className="tier-badge owner">Owner</span>
              <span>Ilimitado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
