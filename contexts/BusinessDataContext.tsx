// contexts/BusinessDataContext.tsx
import React, { createContext, useContext } from "react";
import { useBusinessData } from "../hooks/useBusinessData";

type BusinessDataContextType = ReturnType<typeof useBusinessData>;

const BusinessDataContext = createContext<BusinessDataContextType | undefined>(undefined);


export function BusinessDataProvider({ children }: { children: React.ReactNode }) {
    const value = useBusinessData();
    return <BusinessDataContext.Provider value={value}>
        {children}
    </BusinessDataContext.Provider>;
}

export function useBusinessDataContext() {
    const ctx = useContext(BusinessDataContext);
    if (!ctx) throw new Error("useBusinessDataContext must be used within BusinessDataProvider");
    return ctx;
}
