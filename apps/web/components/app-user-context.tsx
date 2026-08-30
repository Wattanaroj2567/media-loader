"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface AppUser {
  name: string;
  email: string;
  avatar_url?: string;
}

const AppUserContext = createContext<AppUser | null>(null);

export function AppUserProvider({
  children,
  user,
}: {
  children: ReactNode;
  user: AppUser;
}) {
  return (
    <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>
  );
}

export function useAppUser() {
  const user = useContext(AppUserContext);
  if (!user) {
    throw new Error("useAppUser must be used within AppUserProvider");
  }
  return user;
}
