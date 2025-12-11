import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export function AuthCallback() {
  const { revalidate } = useAuth();
  const [status, setStatus] = useState("Processando autenticação...");

  useEffect(() => {
    let redirectTimeout: NodeJS.Timeout;
    let hasRedirected = false;

    const safeRedirect = () => {
      if (!hasRedirected) {
        hasRedirected = true;
        console.log("🔄 Redirecionando para home...");
        window.location.replace("/");
      }
    };

    const handleAuth = async () => {
      try {
        console.log("🔐 AuthCallback: Iniciando processamento...");
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const success = params.get("success");
        const error = params.get("error");

        console.log("📋 Parâmetros:", { token: !!token, success, error });

        if (error) {
          console.error("❌ Auth error:", error);
          setStatus("Erro na autenticação");
          setTimeout(safeRedirect, 1000);
          return;
        }

        if (token) {
          console.log("💾 Salvando token no localStorage...");
          try {
            localStorage.setItem("qlik-codex-access-token", token);
            console.log("✅ Token salvo com sucesso");
          } catch (err) {
            console.warn("⚠️ Could not save token to localStorage:", err);
          }
        }

        if (success === "true" || token) {
          setStatus("Validando sessão...");
          console.log("🔄 Iniciando revalidação...");

          // Timeout de segurança: redirecionar após 5 segundos independente do resultado
          redirectTimeout = setTimeout(() => {
            console.warn("⏰ Timeout na revalidação - redirecionando...");
            safeRedirect();
          }, 5000);

          try {
            await Promise.race([
              revalidate(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Revalidate timeout")), 4000)
              )
            ]);
            console.log("✅ Revalidação concluída");
          } catch (err) {
            console.warn("⚠️ Revalidate error (continuando):", err);
          }
        }

        setStatus("Redirecionando...");
        console.log("✅ Auth processado - redirecionando");
      } catch (err) {
        console.error("❌ Auth callback error:", err);
        setStatus("Erro - redirecionando...");
      } finally {
        // Garantir redirecionamento após pequeno delay
        if (!hasRedirected) {
          setTimeout(safeRedirect, 500);
        }
      }
    };

    handleAuth();

    // Cleanup
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
        <div style={{
          width: "50px",
          height: "50px",
          border: "3px solid rgba(0, 242, 255, 0.3)",
          borderTopColor: "#00f2ff",
          borderRadius: "50%",
          margin: "0 auto 1.5rem",
          animation: "spin 1s linear infinite"
        }}></div>
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
