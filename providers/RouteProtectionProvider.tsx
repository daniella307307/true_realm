import React, { createContext, useContext } from "react";
import { protectedBasePaths } from "~/types";

interface ProtectionContextType {
  // Check if a route needs PIN verification
  requiresVerification: (route: string) => boolean;
}

const RouteProtectionContext = createContext<ProtectionContextType>({
  requiresVerification: () => true,
});

export const useRouteProtection = () => useContext(RouteProtectionContext);

export const RouteProtectionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Check if a route needs PIN verification based on its path
  const requiresVerification = (route: string): boolean => {
    // Check if route matches any protected base path
    return protectedBasePaths.some((basePath) => route.startsWith(basePath));
  };

  return (
    <RouteProtectionContext.Provider
      value={{
        requiresVerification,
      }}
    >
      {children}
    </RouteProtectionContext.Provider>
  );
};
