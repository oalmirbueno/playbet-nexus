import React, { createContext, useContext, useState, useEffect } from "react";

type DemoMode = "all" | "real" | "demo";

interface DemoModeContextType {
  demoMode: DemoMode;
  setDemoMode: (mode: DemoMode) => void;
  /** true when showing only real data (demo hidden) */
  hidingDemo: boolean;
  /** true when showing only demo data */
  showingOnlyDemo: boolean;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoModeState] = useState<DemoMode>(() => {
    return (localStorage.getItem("playbet_demo_mode") as DemoMode) || "real";
  });

  const setDemoMode = (mode: DemoMode) => {
    setDemoModeState(mode);
    localStorage.setItem("playbet_demo_mode", mode);
  };

  return (
    <DemoModeContext.Provider
      value={{
        demoMode,
        setDemoMode,
        hidingDemo: demoMode === "real",
        showingOnlyDemo: demoMode === "demo",
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
