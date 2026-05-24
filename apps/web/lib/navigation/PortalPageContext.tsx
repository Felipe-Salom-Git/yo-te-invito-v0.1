'use client';

import { createContext, useContext, type ReactNode } from 'react';

const PortalPageContext = createContext(false);

export function PortalPageProvider({ children }: { children: ReactNode }) {
  return <PortalPageContext.Provider value>{children}</PortalPageContext.Provider>;
}

export function useIsPortalPage(): boolean {
  return useContext(PortalPageContext);
}
