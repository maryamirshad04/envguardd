'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DashboardContext } from '@/lib/DashboardContext';
import DashboardNavbar from '@/components/DashboardNavbar';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshCompanies = useCallback(async () => {
    const res = await api.companies.list();
    setCompanies(res.companies || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const meRes = await api.me();
        if (cancelled) return;
        setUser(meRes.user);
        await refreshCompanies();
      } catch {
        router.push('/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [router, refreshCompanies]);

  async function logout() {
    await api.logout();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <div className="border-b border-line px-6 py-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="h-5 w-24 animate-pulse rounded-sm bg-line/60" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-line/60" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="h-7 w-48 animate-pulse rounded-sm bg-line/60" />
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ user, companies, refreshCompanies, logout }}>
      <div className="min-h-screen bg-ink">
        <DashboardNavbar />
        {children}
      </div>
    </DashboardContext.Provider>
  );
}
