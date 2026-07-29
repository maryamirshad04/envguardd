'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Alert from '@/components/Alert';
import SearchInput from '@/components/SearchInput';
import Pagination from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';

const PAGE_SIZE = 15;

const ACTION_GROUPS = {
  all: 'All actions',
  SECRET: 'Secrets',
  SHARE: 'Sharing',
  INVITE: 'Invites',
  LOGIN: 'Auth',
  COMPANY: 'Company',
  PROJECT: 'Projects',
  TWO_FACTOR: '2FA',
};

function actionGroup(action = '') {
  const key = Object.keys(ACTION_GROUPS).find((k) => k !== 'all' && action.startsWith(k));
  return key || 'other';
}

function actionTone(action = '') {
  if (action.includes('DELETED') || action.includes('FAILED') || action.includes('REVOKED')) return 'alert';
  if (action.includes('CREATED') || action.includes('SUCCESS') || action.includes('ACCEPTED') || action.includes('ENABLED')) return 'signal';
  return 'mist';
}

const toneClasses = {
  alert: 'bg-alert/15 text-alert',
  signal: 'bg-signal/15 text-signal',
  mist: 'border border-line text-mist',
};

export default function AuditPage() {
  const router = useRouter();
  const { companySlug } = useParams();

  const [company, setCompany] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { company: c } = await api.companies.get(companySlug);
        if (cancelled) return;
        if (c.role !== 'admin') {
          router.push(`/dashboard/${companySlug}`);
          return;
        }
        setCompany(c);
        const { logs: l } = await api.audit.list(companySlug);
        if (cancelled) return;
        setLogs(l || []);
      } catch (err) {
        if (!cancelled) {
          if (err.message?.toLowerCase().includes('not found')) {
            router.push('/dashboard');
          } else {
            setError(err.message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [companySlug, router]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (groupFilter !== 'all' && actionGroup(log.action) !== groupFilter) return false;
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        (log.actor?.email || '').toLowerCase().includes(q) ||
        (log.resource_type || '').toLowerCase().includes(q)
      );
    });
  }, [logs, search, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filteredLogs.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleSearchChange(v) { setSearch(v); setPage(1); }
  function handleGroupChange(v) { setGroupFilter(v); setPage(1); }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href={`/dashboard/${companySlug}`} className="text-sm text-mist hover:text-paper">
        &larr; {company?.name}
      </Link>

      <p className="mt-4 font-mono text-xs uppercase tracking-wider text-signal">Security</p>
      <h1 className="mt-2 text-2xl font-semibold text-paper">Audit Logs</h1>
      <p className="mt-1 text-sm text-mist">Immutable record of security-relevant activity for this team.</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by actor, action, resource…"
          className="w-full sm:max-w-xs"
        />
        <select
          value={groupFilter}
          onChange={(e) => handleGroupChange(e.target.value)}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-signal"
        >
          {Object.entries(ACTION_GROUPS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="mt-6 rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">
            {logs.length === 0 ? 'No audit events yet.' : `No results for "${search}".`}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-sm border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="border-b border-line">
                  <th className="p-3 text-left font-mono text-xs uppercase tracking-wide text-mist">Timestamp</th>
                  <th className="p-3 text-left font-mono text-xs uppercase tracking-wide text-mist">Actor</th>
                  <th className="p-3 text-left font-mono text-xs uppercase tracking-wide text-mist">Action</th>
                  <th className="p-3 text-left font-mono text-xs uppercase tracking-wide text-mist">Resource</th>
                  <th className="p-3 text-left font-mono text-xs uppercase tracking-wide text-mist">IP</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <tr key={log.id} className="border-b border-line last:border-b-0 hover:bg-surface/30">
                    <td className="whitespace-nowrap p-3 text-paper">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="p-3 text-paper">{log.actor?.email || 'System'}</td>
                    <td className="p-3">
                      <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${toneClasses[actionTone(log.action)]}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-mist">
                      {log.resource_type && <span className="mr-1 text-xs">{log.resource_type}:</span>}
                      {log.resource_id ? log.resource_id.slice(0, 8) : '—'}
                    </td>
                    <td className="p-3 text-mist">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {paginated.map((log) => (
              <li key={log.id} className="rounded-sm border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${toneClasses[actionTone(log.action)]}`}>
                    {log.action}
                  </span>
                  <span className="text-xs text-mist">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 text-sm text-paper">{log.actor?.email || 'System'}</p>
                <p className="mt-1 text-xs text-mist">
                  {log.resource_type ? `${log.resource_type}: ${log.resource_id?.slice(0, 8) || '—'}` : '—'}
                  {log.ip_address ? ` · ${log.ip_address}` : ''}
                </p>
              </li>
            ))}
          </ul>

          <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}