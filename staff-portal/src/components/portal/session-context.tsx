"use client";

import { createContext, useContext } from "react";
import { canAccess, type ModuleKey } from "@/lib/modules";
import type { StaffSession } from "@/lib/session";

const SessionContext = createContext<StaffSession | null>(null);

export function SessionProvider({ session, children }: { session: StaffSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function usePortalSession() {
  return useContext(SessionContext);
}

export function useCan(module: ModuleKey, action: "view" | "edit" | "publish" | "delete") {
  const session = useContext(SessionContext);
  if (!session) return false;
  return canAccess(session.permissions, module, action, session.isSuperAdmin);
}
