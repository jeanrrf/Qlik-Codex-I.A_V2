import React, { useState, useEffect } from "react";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { LoginPage } from "./pages/LoginPage";
import { AuthCallback } from "./pages/AuthCallback";
import LandingPage from "./pages/LandingPage";
import OptimizerPageV2 from "./pages/OptimizerPageV2";
import OptimizerPageConvex from "./pages/OptimizerPageConvex";
import { ProfilePage } from "./pages/ProfilePage";
import { USE_CONVEX } from "./lib/config";

type View = "landing" | "optimizer" | "profile";

// Escolhe a página de otimização baseado na configuração
const OptimizerPage = USE_CONVEX ? OptimizerPageConvex : OptimizerPageV2;

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>("landing");
  const { isAuthenticated, isLoading } = useAuth();

  // Verificar se estamos na rota de callback
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/auth/callback") {
      // Renderizar componente de callback
      return;
    }
  }, []);

  // Se estamos na rota de callback, renderizar AuthCallback
  if (window.location.pathname === "/auth/callback") {
    return <AuthCallback />;
  }

  // Mostrar loading durante verificação de autenticação
  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#ffffff",
        fontSize: "1.2rem"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid rgba(0, 242, 255, 0.3)",
            borderTopColor: "#00f2ff",
            borderRadius: "50%",
            margin: "0 auto 1rem",
            animation: "spin 1s linear infinite"
          }}></div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          Carregando...
        </div>
      </div>
    );
  }

  // Redirecionar para login se não autenticado
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Usuário autenticado - mostrar aplicação normal
  return (
    <NavigationProvider onNavigate={setView}>
      {view === "landing" && <LandingPage onStart={() => setView("optimizer")} />}
      {view === "profile" && <ProfilePage />}
      {view === "optimizer" && <OptimizerPage onBackToLanding={() => setView("landing")} />}
    </NavigationProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
