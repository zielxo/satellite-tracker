"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { CurrentPosition } from "../lib/api";

////////////////////////////////////////////////////////////////////////////////////////////////
// position: provides the current satellite data
// setPosition: function to update the satellite data
////////////////////////////////////////////////////////////////////////////////////////////////
type LivePositionContextValue = {
  position: CurrentPosition | null;
  setPosition: (pos: CurrentPosition | null) => void;
};

// Container setup
const LivePositionContext = createContext<LivePositionContextValue | undefined>(undefined);

////////////////////////////////////////////////////////////////////////////////////////////////
// Provider makes state accessible to any component within it. 
//
// position stored in state with setPosition to update
// "value = useMemo()..." reduces chances of React unnecessarily re-rendering all children
////////////////////////////////////////////////////////////////////////////////////////////////
export function LivePositionProvider({ children }: { children: React.ReactNode }) {
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const value = useMemo(() => ({ position, setPosition }), [position]);

  return <LivePositionContext.Provider value={value}>{children}</LivePositionContext.Provider>;
}

// Retrieves context value, error thrown if component not wrapped in provider.
export function useLivePosition() {
  const ctx = useContext(LivePositionContext);
  if (!ctx) {
    throw new Error("useLivePosition must be used within LivePositionProvider");
  }
  return ctx;
}
