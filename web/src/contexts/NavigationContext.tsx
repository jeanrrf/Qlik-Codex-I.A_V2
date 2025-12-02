import React, { createContext, useContext, ReactNode } from "react";

type View = "landing" | "optimizer" | "profile";

interface NavigationContextType {
  navigateTo: (view: View) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({
  children,
  onNavigate
}: {
  children: ReactNode;
  onNavigate: (view: View) => void;
}) {
  return (
    <NavigationContext.Provider value={{ navigateTo: onNavigate }}>
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
