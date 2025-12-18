import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NavigationProvider } from "./contexts/NavigationContext";
import { useEssentialMetrics } from "./hooks/useEssentialMetrics";

// Lazy loading pages for better performance
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const OptimizerPageV2 = lazy(() => import("./pages/OptimizerPageV2"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AnalyticsDashboard = lazy(() => import("./pages/Analytics/AnalyticsDashboard"));

type View = "landing" | "optimizer" | "profile" | "analytics";

const ALLOWED_VIEWS: View[] = ["landing", "optimizer", "profile", "analytics"];

const getInitialView = (): View => {
  try {
    const stored = localStorage.getItem("codex-last-view") as View | null;
    if (stored && ALLOWED_VIEWS.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return "landing";
};

const AppContent: React.FC = () => {
  const [view, setView] = useState<View>(getInitialView);
  const [history, setHistory] = useState<View[]>(() => [getInitialView()]);
  const { isAuthenticated, isLoading } = useAuth();

  // Hook de Métricas Essenciais (minimalista)
  useEssentialMetrics();

  // Verificar se estamos na rota de callback
  useEffect(() => {
    const path = window.location.pathname;
    if (path === "/auth/callback") {
      // Renderizar componente de callback
      return;
    }
  }, []);

  // Persist view so refresh keeps current section
  useEffect(() => {
    try {
      localStorage.setItem("codex-last-view", view);
    } catch {
      // ignore storage errors
    }
  }, [view]);

  const navigateTo = useCallback((next: View) => {
    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (last === next) return prev;
      const updated = [...prev, next];
      return updated.slice(-10);
    });
    setView(next);
  }, []);

  const navigateBack = useCallback((fallback: View = "landing") => {
    setHistory(prev => {
      if (prev.length > 1) {
        const updated = prev.slice(0, -1);
        const target = updated[updated.length - 1];
        setView(target);
        return updated;
      }
      setView(fallback);
      return [fallback];
    });
  }, []);

  const ViewContainer: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => (
    <div style={{ display: active ? "block" : "none", width: "100%" }}>
      {children}
    </div>
  );

  const loadingFallback = (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#ffffff"
    }}>
      <div className="loading-spinner" style={{
        width: "40px",
        height: "40px",
        border: "3px solid rgba(0, 242, 255, 0.2)",
        borderTopColor: "#00f2ff",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
    </div>
  );

  // Se estamos na rota de callback, renderizar AuthCallback
  if (window.location.pathname === "/auth/callback") {
    return (
      <Suspense fallback={loadingFallback}>
        <AuthCallback />
      </Suspense>
    );
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

  // GUEST ACCESS: Não bloqueia mais se não autenticado.
  // O usuário pode navegar como guest.
  // if (!isAuthenticated) {
  //   return <LoginPage />;
  // }

  // Usuário autenticado ou Guest - mostrar aplicação normal
  return (
    <NavigationProvider
      navigateTo={navigateTo}
      navigateBack={navigateBack}
      currentView={view}
      lastView={history.length > 1 ? history[history.length - 2] : null}
    >
      <Suspense fallback={loadingFallback}>
        <ViewContainer active={view === "landing"}>
          <LandingPage onStart={() => navigateTo("optimizer")} />
        </ViewContainer>

        <ViewContainer active={view === "profile"}>
          {/* Profile requer autenticação real */}
          {isAuthenticated ? <ProfilePage /> : <LoginPage />}
        </ViewContainer>

        <ViewContainer active={view === "optimizer"}>
          <OptimizerPageV2 />
        </ViewContainer>

        <ViewContainer active={view === "analytics"}>
          {/* Analytics requer autenticação real */}
          {isAuthenticated ? <AnalyticsDashboard /> : <LoginPage />}
        </ViewContainer>
      </Suspense>
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
