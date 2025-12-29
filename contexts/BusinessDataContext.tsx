// contexts/BusinessDataContext.tsx
import React, { createContext, useContext } from "react";
import { useBusinessData } from "../hooks/useBusinessData";

// שימוש חכם ב-ReturnType מבטיח שהטיפוסים תמיד יהיו מסונכרנים עם ה-Hook
type BusinessDataContextType = ReturnType<typeof useBusinessData>;

const BusinessDataContext = createContext<BusinessDataContextType | undefined>(undefined);

/**
 * ספק מידע עסקי (Provider).
 * מפעיל את ה-useBusinessData Hook פעם אחת ברמה הגלובלית,
 * ומחלק את המידע לכל עץ הקומפוננטות ללא צורך בקריאות שרת מיותרות.
 */
export function BusinessDataProvider({ children }: { children: React.ReactNode }) {
    const value = useBusinessData();

    return (
        <BusinessDataContext.Provider value={value}>
            {children}
        </BusinessDataContext.Provider>
    );
}

/**
 * Hook לצריכת המידע העסקי מתוך ה-Context.
 * זורק שגיאה אם משתמשים בו מחוץ ל-Provider.
 */
export function useBusinessDataContext() {
    const ctx = useContext(BusinessDataContext);
    if (!ctx) {
        throw new Error("useBusinessDataContext must be used within BusinessDataProvider");
    }
    return ctx;
}