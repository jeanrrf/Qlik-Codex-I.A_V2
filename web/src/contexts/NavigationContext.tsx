import React, { createContext, useContext, ReactNode } from "react";

export type View = "landing" | "optimizer" | "profile" | "analytics";

interface NavigationContextType {
  navigateTo: (view: View) => void;
  navigateBack: (fallback?: View) => void;
  currentView: View;
  lastView: View | null;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  navigateTo: (view: View) => void;
  navigateBack: (fallback?: View) => void;
  currentView: View;
  lastView: View | null;
}

export function NavigationProvider({
  children,
  navigateTo,
  navigateBack,
  currentView,
  lastView
}: NavigationProviderProps) {
  return (
    <NavigationContext.Provider
      value={{
        navigateTo,
        navigateBack,
        currentView,
        lastView,
      }}
    >
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
