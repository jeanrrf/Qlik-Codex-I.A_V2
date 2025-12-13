import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthCallback() {
  const { revalidate } = useAuth();
  const [status, setStatus] = useState("Processando autenticação...");

  useEffect(() => {
    let redirectTimeout: ReturnType<typeof setTimeout> | undefined;
    let hasRedirected = false;

    const safeRedirect = () => {
      if (hasRedirected) return;
      hasRedirected = true;
      window.location.replace("/");
    };

    const handleAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const success = params.get("success");
        const error = params.get("error");

        if (error) {
          setStatus("Erro na autenticação");
          setTimeout(safeRedirect, 800);
          return;
        }

        if (token) {
          try {
            localStorage.setItem("qlik-codex-access-token", token);
          } catch {
            // ignore storage errors
          }
        }

        if (success === "true" || token) {
          setStatus("Validando sessão...");

          redirectTimeout = setTimeout(() => {
            safeRedirect();
          }, 5000);

          try {
            await Promise.race([
              revalidate(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Revalidate timeout")), 4000))
            ]);
          } catch {
            // ignore revalidate errors and proceed
          }
        }

        setStatus("Redirecionando...");
      } catch {
        setStatus("Erro - redirecionando...");
      } finally {
        if (!hasRedirected) {
          setTimeout(safeRedirect, 500);
        }
      }
    };

    handleAuth();

    return () => {
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
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
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "3px solid rgba(0, 242, 255, 0.3)",
            borderTopColor: "#00f2ff",
            borderRadius: "50%",
            margin: "0 auto 1.5rem",
            animation: "spin 1s linear infinite"
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "#00f2ff" }}>
          {status}
        </h2>
        <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.95rem" }}>
          Aguarde alguns segundos...
        </p>
        <p style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "0.8rem", marginTop: "1rem" }}>
          Se não redirecionar automaticamente, <a href="/" style={{ color: "#00f2ff", textDecoration: "underline" }}>clique aqui</a>
        </p>
      </div>
    </div>
  );
}
