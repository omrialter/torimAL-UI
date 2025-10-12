import React, { createContext, useContext } from "react";
import { useUserData } from "../hooks/useUserData";

type UserDataContextType = ReturnType<typeof useUserData>;

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const value = useUserData();
  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserDataContext() {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserDataContext must be used within UserDataProvider");
  return ctx;
}
