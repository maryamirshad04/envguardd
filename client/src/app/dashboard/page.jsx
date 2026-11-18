'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useDashboard } from '@/lib/DashboardContext';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import SearchInput from '@/components/SearchInput';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import { getDashboardSteps } from '@/lib/tourSteps';

const PAGE_SIZE = 9;

export default function DashboardPage() {
  const router = useRouter();
  const { companies, refreshCompanies } = useDashboard();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paginated = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const { company } = await api.companies.create(newName.trim());
      await refreshCompanies();
      setCreating(false);
      setNewName('');
      router.push(`/dashboard/${company.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(e, company) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(company);
    setEditName(company.name);
    setConfirmingDelete(false);
    setEditError('');
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      await api.companies.update(editing.slug, editName.trim());
      await refreshCompanies();
      setEditing(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    setEditError('');
    setEditSubmitting(true);
    try {
      await api.companies.remove(editing.slug);
      await refreshCompanies();
      setEditing(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 data-tour="dash-heading" className="text-2xl font-semibold text-paper">Your Teams</h1>
          <p className="mt-1 text-md text-mist">
            Each workspace has its own team, projects, and encrypted variables.
          </p>
        </div>
        <button
          data-tour="dash-new-team"
          onClick={() => {
            setError('');
            setNewName('');
            setCreating(true);
          }}
          className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
        >
          + New Team
        </button>
      </div>

      {companies.length > 0 && (
        <div data-tour="dash-search">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search teams..."
          className="mt-6 w-full max-w-sm"
          data-tour="dash-search"
        />
        </div>
      )}

      {companies.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">No Team yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">No teams match &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((c, i) => (
              <li
                key={c.slug}
                className="group relative"
                style={{ perspective: '800px' }}
                data-tour={i === 0 ? 'dash-team-card' : undefined}
              >
                <Link
                  href={`/dashboard/${c.slug}`}
                  className="relative block overflow-hidden rounded-lg border border-line bg-surface/70 p-5 shadow-md backdrop-blur-sm transition-all duration-300 ease-out hover:border-signal/50 hover:shadow-[0_20px_45px_-18px_rgba(182,255,60,0.3)]"
                  style={{ transformStyle: 'preserve-3d' }}
                  onMouseMove={(e) => {
                    const el = e.currentTarget;
                    const rect = el.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    el.style.transform = `rotateX(${y * -6}deg) rotateY(${x * 6}deg) translateY(-3px)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'rotateX(0deg) rotateY(0deg) translateY(0px)';
                  }}
                >
                  {/* gradient wash, brightens on hover */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-signal/[0.04] via-transparent to-transparent transition-opacity duration-300 group-hover:from-signal/[0.1]" />
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-signal/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-wider text-signal">Team</p>
                    <span
                      className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                        c.role === 'admin' ? 'bg-signal/15 text-signal' : 'border border-line text-mist'
                      }`}
                    >
                      {c.role}
                    </span>
                  </div>

                  <div className="relative mt-2 flex items-center justify-between gap-2">
                    <h3 className="truncate text-lg font-medium text-paper">{c.name}</h3>
                    {c.role === 'admin' && (
                      <button
                        onClick={(e) => openEdit(e, c)}
                        aria-label={`Edit ${c.name}`}
                        className="flex-shrink-0 text-mist hover:text-paper"
                      >
                        &#9998;
                      </button>
                    )}
                  </div>

                  <p className="relative mt-1 text-xs text-mist">
                    Created {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={pageSafe} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New company">
        <form onSubmit={handleCreate} className="space-y-3" autoComplete="off">
          <input
            autoFocus
            autoComplete="off"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onFocus={() => setError('')}
            placeholder="Company name"
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          {error && <Alert variant="error">{error}</Alert>}
          <button
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? 'Creating\u2026' : 'Create'}
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Team">
        <form onSubmit={handleRename} className="space-y-3" autoComplete="off">
          <input
            autoFocus
            autoComplete="off"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onFocus={() => setEditError('')}
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          {editError && <Alert variant="error">{editError}</Alert>}
          <button
            disabled={editSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {editSubmitting && <Spinner className="h-4 w-4" />}
            Save name
          </button>
        </form>

        <div className="mt-6 border-t border-line pt-4">
          {confirmingDelete ? (
            <div className="space-y-3">
              <Alert variant="warning" title={`Delete "${editing?.name}"?`}>
                This includes all its projects, environments, and variables. This can&apos;t be undone.
              </Alert>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={editSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-alert px-4 py-2 text-sm font-medium text-ink hover:bg-alert/90 disabled:opacity-60"
                >
                  {editSubmitting && <Spinner className="h-4 w-4" />}
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-sm text-alert hover:underline"
            >
              Delete this team
            </button>
          )}
        </div>
      </Modal>
      <OnboardingTour tourKey="dashboard" steps={getDashboardSteps(companies.length > 0)} />
    </div>
  );
}