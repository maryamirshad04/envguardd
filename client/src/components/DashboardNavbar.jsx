'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDashboard } from '@/lib/DashboardContext';
import Modal from './Modal';
import Spinner from './Spinner';

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export default function DashboardNavbar() {
  const router = useRouter();
  const { companyId } = useParams();
  const { user, companies, refreshCompanies, logout } = useDashboard();

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeCompany = companies.find((c) => c.id === companyId);

  async function handleCreateCompany(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const { company } = await api.companies.create(newName.trim());
      await refreshCompanies();
      setCreatingCompany(false);
      setNewName('');
      router.push(`/dashboard/${company.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-2 font-mono text-sm text-signal"
            >
              <img
                src="/lock.svg"
                alt="Envguard icon"
                className="inline-block h-5 w-5 text-signal align-middle"
              />
              <span className="align-middle">envguard</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setCompanyMenuOpen((v) => !v)}
                className="flex max-w-[160px] items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-xs text-paper hover:border-signal/40 sm:max-w-[220px] sm:px-3 sm:text-sm"
              >
                <span className="truncate">{activeCompany?.name || 'Teams'}</span>
                <Chevron />
              </button>
              {companyMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setCompanyMenuOpen(false)} />
                  <div className="absolute left-0 z-20 mt-2 w-56 rounded-sm border border-line bg-surface py-1 shadow-lg">
                    {companies.map((c) => (
                      <Link
                        key={c.id}
                        href={`/dashboard/${c.id}`}
                        onClick={() => setCompanyMenuOpen(false)}
                        className={`block truncate px-3 py-2 text-sm hover:bg-ink ${
                          c.id === companyId ? 'text-signal' : 'text-paper'
                        }`}
                      >
                        {c.name}
                        <span className="ml-2 font-mono text-[10px] uppercase text-mist">{c.role}</span>
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        setCompanyMenuOpen(false);
                        setError('');
                        setNewName('');
                        setCreatingCompany(true);
                      }}
                      className="block w-full border-t border-line px-3 py-2 text-left text-sm text-mist hover:bg-ink hover:text-paper"
                    >
                      + New Team
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-1.5 hover:border-signal/40"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[11px] text-mist">
                {user?.email?.[0]?.toUpperCase()}
              </span>
              <Chevron />
            </button>
            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-64 rounded-sm border border-line bg-surface py-1 shadow-lg">
                  <p className="truncate border-b border-line px-3 py-2 text-sm text-paper">
                    {user?.email}
                  </p>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="block w-full px-3 py-2 text-left text-sm text-mist hover:bg-ink hover:text-paper"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full border-t border-line px-3 py-2 text-left text-sm text-mist hover:bg-ink hover:text-paper"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal open={creatingCompany} onClose={() => setCreatingCompany(false)} title="New Team">
        <form onSubmit={handleCreateCompany} className="space-y-3" autoComplete="off">
          <input
            autoFocus
            autoComplete="off"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Team name"
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? 'Creating' : 'Create'}
          </button>
        </form>
      </Modal>
    </header>
  );
}