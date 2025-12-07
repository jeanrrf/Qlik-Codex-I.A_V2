import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function AuthCallback() {
  const { revalidate } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      await revalidate();
      navigate("/optimize");
    };

    handleAuth();
  }, [revalidate, navigate]);

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
