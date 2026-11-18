'use client';

import { createContext, useContext } from 'react';

export const DashboardContext = createContext(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within the dashboard layout');
  return ctx;
}