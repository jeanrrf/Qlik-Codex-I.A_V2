import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthCallback() {
  const { revalidate } = useAuth();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const success = params.get("success");
        const error = params.get("error");

        if (error) {
          console.error("Auth error:", error);
          // Redirecionar para home com erro
          window.location.href = "/";
          return;
        }

        if (token) {
          try {
            localStorage.setItem("qlik-codex-access-token", token);
          } catch (err) {
            console.warn("Could not save token to localStorage:", err);
          }
        }

        if (success === "true" || token) {
          // Aguardar revalidação antes de redirecionar
          await revalidate();
        }
      } catch (err) {
        console.error("Auth callback error:", err);
      } finally {
        // Usar replace para evitar loop de navegação
        window.location.replace("/");
      }
    };

    handleAuth();
  }, [revalidate]);

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
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#00f2ff" }}>
          Processando autenticação...
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
          Redirecionando para a plataforma
        </p>
      </div>
    </div>
  );
}
