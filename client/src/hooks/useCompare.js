import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

export function useCompare(companySlug, projectSlug) {
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [environments, setEnvironments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sourceEnvId, setSourceEnvId] = useState('');
  const [targetEnvId, setTargetEnvId] = useState('');

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [revealedValues, setRevealedValues] = useState({});
  const [revealing, setRevealing] = useState({});
  const [revealError, setRevealError] = useState('');

  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncSubmitting, setSyncSubmitting] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncNotice, setSyncNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const [projectRes, companyRes] = await Promise.all([
          api.companies.projects.get(companySlug, projectSlug),
          api.companies.get(companySlug),
        ]);
        if (cancelled) return;
        setProject(projectRes.project);
        setCompanyName(companyRes.company?.name || '');
        const envs = projectRes.environments || [];
        setEnvironments(envs);
        if (envs.length >= 2) {
          setSourceEnvId(envs[0].id);
          setTargetEnvId(envs[1].id);
        } else if (envs.length === 1) {
          setSourceEnvId(envs[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          router.push(
            err.message?.toLowerCase().includes('not found') ? `/dashboard/${companySlug}` : '/login'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [companySlug, projectSlug, router]);

  // Debounce free-text search
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchComparison = useCallback(async () => {
    if (!sourceEnvId || !targetEnvId || sourceEnvId === targetEnvId) {
      setRows([]);
      setSummary(null);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    setFetching(true);
    setError('');
    try {
      const res = await api.compare.get(companySlug, projectSlug, {
        source: sourceEnvId,
        target: targetEnvId,
        page,
        pageSize: PAGE_SIZE,
        q,
        status: statusFilter,
      });
      setRows(res.rows || []);
      setSummary(res.summary || null);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }, [companySlug, projectSlug, sourceEnvId, targetEnvId, page, q, statusFilter]);

  useEffect(() => {
    if (loading) return;
    fetchComparison();
  }, [loading, fetchComparison]);

  useEffect(() => {
    setSelectedKeys(new Set());
    setRevealedValues({});
    setRevealError('');
  }, [sourceEnvId, targetEnvId]);

  function swapEnvs() {
    setSourceEnvId(targetEnvId);
    setTargetEnvId(sourceEnvId);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function toggleSelectKey(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const syncableRows = useMemo(
    () => rows.filter((r) => r.source && r.status !== 'same'),
    [rows]
  );

  function toggleSelectAllOnPage() {
    setSelectedKeys((prev) => {
      const allSelected = syncableRows.length > 0 && syncableRows.every((r) => prev.has(r.key));
      const next = new Set(prev);
      if (allSelected) syncableRows.forEach((r) => next.delete(r.key));
      else syncableRows.forEach((r) => next.add(r.key));
      return next;
    });
  }

  async function revealValue(side, row) {
    const entry = side === 'source' ? row.source : row.target;
    if (!entry) return;
    const envId = side === 'source' ? sourceEnvId : targetEnvId;
    const cacheKey = `${side}:${row.key}`;
    setRevealing((prev) => ({ ...prev, [cacheKey]: true }));
    setRevealError('');
    try {
      const res = await api.compare.reveal(companySlug, projectSlug, envId, entry.id);
      setRevealedValues((prev) => ({ ...prev, [row.key]: { ...prev[row.key], [side]: res.value } }));
    } catch (err) {
      setRevealError(err.message);
    } finally {
      setRevealing((prev) => ({ ...prev, [cacheKey]: false }));
    }
  }

  function openSyncModal() {
    setSyncError('');
    setSyncModalOpen(true);
  }

  const selectedRowsPreview = useMemo(
    () => rows.filter((r) => selectedKeys.has(r.key)),
    [rows, selectedKeys]
  );

  async function confirmSync() {
    setSyncSubmitting(true);
    setSyncError('');
    try {
      await api.compare.sync(companySlug, projectSlug, sourceEnvId, targetEnvId, Array.from(selectedKeys));
      setSyncModalOpen(false);
      const count = selectedKeys.size;
      setSelectedKeys(new Set());
      setSyncNotice(`Synced ${count} variable${count === 1 ? '' : 's'} to target`);
      setTimeout(() => setSyncNotice(''), 3000);
      await fetchComparison();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setSyncSubmitting(false);
    }
  }

  return {
    project, companyName, environments, loading, error, setError,
    sourceEnvId, setSourceEnvId, targetEnvId, setTargetEnvId, swapEnvs,
    rows, summary, total, totalPages, page, setPage, fetching,
    searchInput, setSearchInput, statusFilter, handleStatusFilterChange,
    selectedKeys, toggleSelectKey, toggleSelectAllOnPage, syncableRows,
    revealedValues, revealing, revealError, revealValue,
    syncModalOpen, setSyncModalOpen, openSyncModal,
    syncSubmitting, syncError, syncNotice, confirmSync, selectedRowsPreview,
  };
}