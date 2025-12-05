/**
 * AuthCallback - Página de callback do Google OAuth
 * Processa redirecionamento após autenticação e redireciona para app
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthCallback() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extrair parâmetros da URL
        const params = new URLSearchParams(window.location.search);
        const success = params.get("success");
        const error = params.get("error");
        const token = params.get("token");

        if (error) {
          setStatus("error");
          setErrorMessage(error === "auth_failed" ? "Falha na autenticação" : "Erro desconhecido");
          // Redirecionar para login após 3 segundos
          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
          return;
        }

        if (success === "true") {
          // Salvar token se fornecido (fallback para cookies cross-domain)
          if (token) {
            localStorage.setItem("qlik-codex-access-token", token);
          }

          // Autenticação bem-sucedida, recarregar dados do usuário
          await refreshUser();
          setStatus("success");

          // Redirecionar para app após breve delay
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else {
          // Parâmetros inválidos
          setStatus("error");
          setErrorMessage("Parâmetros de callback inválidos");
          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
        }
      } catch (err) {
        console.error("Callback processing error:", err);
        setStatus("error");
        setErrorMessage("Erro ao processar autenticação");
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      }
    };

    processCallback();
  }, [refreshUser]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "400px", padding: "2rem" }}>
        {status === "processing" && (
          <>
            <div
              style={{
                width: "60px",
                height: "60px",
                border: "4px solid rgba(0, 242, 255, 0.2)",
                borderTopColor: "#00f2ff",
                borderRadius: "50%",
                margin: "0 auto 2rem",
                animation: "spin 1s linear infinite"
              }}
            ></div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#00f2ff" }}>
              Processando autenticação...
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
              Aguarde enquanto configuramos sua conta
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(0, 255, 157, 0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem",
                border: "3px solid #00ff9d"
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00ff9d"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#00ff9d" }}>
              Autenticação bem-sucedida!
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
              Redirecionando para a aplicação...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "rgba(255, 107, 107, 0.15)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 2rem",
                border: "3px solid #ff6b6b"
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ff6b6b"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#ff6b6b" }}>
              Erro na autenticação
            </h2>
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
              {errorMessage || "Erro desconhecido"}
            </p>
            <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.85rem", marginTop: "1rem" }}>
              Redirecionando para login...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
