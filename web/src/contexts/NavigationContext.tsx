import React, { createContext, useContext, ReactNode } from "react";

type View = "landing" | "optimizer" | "profile" | "analytics";

interface NavigationContextType {
  navigateTo: (view: View) => void;
  navigateBack: (fallback?: View) => void;
  currentView: View;
  lastView: View | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({
  children,
  navigateTo,
  navigateBack,
  currentView,
  lastView
}: {
  children: ReactNode;
  navigateTo: (view: View) => void;
  navigateBack: (fallback?: View) => void;
  currentView: View;
  lastView: View | null;
}) {
  return (
    <NavigationContext.Provider value={{ navigateTo, navigateBack, currentView, lastView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
