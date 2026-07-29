'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/Pagination';
import { CardGridSkeleton, Skeleton } from '@/components/Skeleton';
import Alert from '@/components/Alert';
import SearchInput from '@/components/SearchInput';

const PROJECTS_PAGE_SIZE = 9;

export default function CompanyDetailPage() {
  const { companySlug } = useParams();
  const router = useRouter();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('projects');
  const [error, setError] = useState('');

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectPage, setProjectPage] = useState(1);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingSubmitting, setCreatingSubmitting] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [invites, setInvites] = useState([]);
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteRoleFilter, setInviteRoleFilter] = useState('all');
  const [inviteWarning, setInviteWarning] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Load company – redirect if not found
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.companies.get(companySlug);
        if (cancelled) return;
        setCompany(res.company);
        setError('');
      } catch (err) {
        if (err.message?.toLowerCase().includes('not found')) {
          router.push('/dashboard');
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [companySlug, router]);

  // Load projects only if company exists
  useEffect(() => {
    if (!company) return;
    if (tab !== 'projects' || projectsLoaded) return;
    setProjectsLoading(true);
    api.companies.projects
      .list(companySlug)
      .then((res) => {
        setProjects(res.projects || []);
        setProjectsLoaded(true);
      })
      .catch((err) => {
        if (err.message?.toLowerCase().includes('not found')) {
          router.push('/dashboard');
        } else {
          setError(err.message);
        }
      })
      .finally(() => setProjectsLoading(false));
  }, [tab, projectsLoaded, companySlug, company, router]);

  useEffect(() => {
    if (!company) return;
    if (tab !== 'team' || teamLoaded) return;
    Promise.all([
      api.companies.members(companySlug),
      company?.role === 'admin' ? api.companies.invites.list(companySlug) : Promise.resolve({ invites: [] }),
    ])
      .then(([membersRes, invitesRes]) => {
        setMembers(membersRes.members || []);
        setInvites(invitesRes.invites || []);
        setTeamLoaded(true);
      })
      .catch((err) => {
        if (err.message?.toLowerCase().includes('not found')) {
          router.push('/dashboard');
        } else {
          setError(err.message);
        }
      });
  }, [tab, teamLoaded, companySlug, company, router]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const projectTotalPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PAGE_SIZE));
  const projectPageSafe = Math.min(projectPage, projectTotalPages);
  const paginatedProjects = filteredProjects.slice(
    (projectPageSafe - 1) * PROJECTS_PAGE_SIZE,
    projectPageSafe * PROJECTS_PAGE_SIZE
  );

  function handleProjectSearchChange(value) {
    setProjectSearch(value);
    setProjectPage(1);
  }

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.email.toLowerCase().includes(q));
  }, [members, memberSearch]);

  const filteredInvites = useMemo(() => {
    if (inviteRoleFilter === 'all') return invites;
    return invites.filter((inv) => inv.role === inviteRoleFilter);
  }, [invites, inviteRoleFilter]);

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setError('');
    setCreatingSubmitting(true);
    try {
      const { project } = await api.companies.projects.create(companySlug, newProjectName.trim());
      setProjects((prev) => [project, ...prev]);
      setNewProjectName('');
      setCreatingProject(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingSubmitting(false);
    }
  }

  function openEdit(e, project) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(project);
    setEditName(project.name);
    setConfirmingDelete(false);
    setEditError('');
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditError('');
    setEditSubmitting(true);
    try {
      const { project } = await api.companies.projects.update(
        companySlug,
        editing.slug,
        editName.trim()
      );
      setProjects((prev) => prev.map((p) => (p.id === project.id ? project : p)));
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
      await api.companies.projects.remove(companySlug, editing.slug);
      setProjects((prev) => prev.filter((p) => p.id !== editing.id));
      setEditing(null);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      setInviteWarning('Please enter a valid email address.');
      return;
    }
    setError('');
    setInviteWarning('');
    setInviteSuccess('');
    setInviteSubmitting(true);
    try {
      const res = await api.companies.invites.create(companySlug, trimmedEmail, inviteRole);
      setInvites((prev) => [res.invite, ...prev]);
      if (res.warning) setInviteWarning(res.warning);
      setInviteSuccess(`Invite sent to ${trimmedEmail}`);
      setInviteEmail('');
      setTimeout(() => setInviteSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRevoke(inviteId) {
    try {
      await api.companies.invites.revoke(companySlug, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-3 w-16" />
        <Skeleton className="mt-3 h-8 w-48" />
        <CardGridSkeleton />
      </div>
    );
  }

  const isAdmin = company?.role === 'admin';

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-mist hover:text-paper">
        &larr; All Teams
      </Link>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <p className="font-mono text-xs uppercase tracking-wider text-signal">Team</p>
        <span
          className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
            isAdmin ? 'bg-signal/15 text-signal' : 'border border-line text-mist'
          }`}
        >
          {company?.role}
        </span>

        {isAdmin && (
  <Link
    href={`/dashboard/${companySlug}/audit`}
    className="ml-2 rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
  >
    Audit Logs
  </Link>
)}
      </div>

      <h1 className="mt-2 text-2xl font-semibold text-paper">{company?.name}</h1>

      <div className="mt-8 flex gap-2 border-b border-line">
        <button
          onClick={() => setTab('projects')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium ${
            tab === 'projects' ? 'border-signal text-paper' : 'border-transparent text-mist hover:text-paper'
          }`}
        >
          Projects
        </button>
        <button
          onClick={() => setTab('team')}
          className={`border-b-2 px-1 pb-3 text-sm font-medium ${
            tab === 'team' ? 'border-signal text-paper' : 'border-transparent text-mist hover:text-paper'
          }`}
        >
          Invite
        </button>
      </div>

      {error && <Alert variant="error" className="mt-4">{error}</Alert>}

      {tab === 'projects' && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {projects.length > 0 ? (
              <SearchInput
                value={projectSearch}
                onChange={handleProjectSearchChange}
                placeholder="Search projects..."
                className="w-full max-w-xs"
              />
            ) : (
              <div />
            )}
            <button
              onClick={() => {
                setError('');
                setNewProjectName('');
                setCreatingProject(true);
              }}
              className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
            >
              + New project
            </button>
          </div>

          {projectsLoading ? (
            <CardGridSkeleton />
          ) : projects.length === 0 ? (
            <div className="mt-6 rounded-sm border border-dashed border-line p-10 text-center">
              <p className="font-mono text-sm text-mist">No projects yet.</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="mt-6 rounded-sm border border-dashed border-line p-10 text-center">
              <p className="font-mono text-sm text-mist">No projects match &ldquo;{projectSearch}&rdquo;.</p>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedProjects.map((p) => (
                  <li key={p.id} className="relative">
                    <Link
                      href={`/dashboard/${companySlug}/projects/${p.slug}`}
                      className="block rounded-sm border border-line bg-surface p-5 transition-colors hover:border-signal/40"
                    >
                      <p className="font-mono text-xs uppercase tracking-wider text-signal">Project</p>
                      <h3 className="mt-2 truncate pr-6 text-lg font-medium text-paper">{p.name}</h3>
                      <p className="mt-1 text-xs text-mist">
                        Created {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </Link>
                    <button
                      onClick={(e) => openEdit(e, p)}
                      aria-label={`Edit ${p.name}`}
                      className="absolute right-4 top-4 text-mist hover:text-paper"
                    >
                      &#9998;
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination page={projectPageSafe} totalPages={projectTotalPages} onChange={setProjectPage} />
            </>
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="mt-6 space-y-8">
          {isAdmin && (
            <div>
              <h2 className="text-sm font-medium text-paper">Invite someone</h2>
              <form
                onSubmit={handleInvite}
                className="mt-3 flex flex-col gap-3 rounded-sm border border-line bg-surface p-4 sm:flex-row sm:items-end"
                autoComplete="off"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs text-mist">Email</label>
                  <input
                    type="email"
                    autoComplete="off"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onFocus={() => { setError(''); setInviteWarning(''); setInviteSuccess(''); }}
                    placeholder="teammate@company.com"
                    className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-mist">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button
                  disabled={inviteSubmitting}
                  className="flex items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
                >
                  {inviteSubmitting && <Spinner className="h-4 w-4" />}
                  {inviteSubmitting ? 'Sending…' : 'Send invite'}
                </button>
              </form>
              {inviteSuccess && <Alert variant="success" className="mt-2">{inviteSuccess}</Alert>}
              {inviteWarning && <Alert variant="warning" className="mt-2">{inviteWarning}</Alert>}
              {error && <Alert variant="error" className="mt-2">{error}</Alert>}
            </div>
          )}

          {isAdmin && invites.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-paper">Pending invites</h2>
                <select
                  value={inviteRoleFilter}
                  onChange={(e) => setInviteRoleFilter(e.target.value)}
                  className="rounded-sm border border-line bg-surface px-2 py-1 text-xs text-paper outline-none focus:border-signal"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              </div>
              {filteredInvites.length === 0 ? (
                <p className="mt-3 font-mono text-xs text-mist">No invites match that filter.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
                  {filteredInvites.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm text-paper">{inv.email}</p>
                        <p className="font-mono text-xs uppercase tracking-wide text-mist">{inv.role}</p>
                      </div>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="rounded-sm border border-line px-3 py-1.5 text-xs text-alert hover:border-alert/60"
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-paper">Members</h2>
              {members.length > 5 && (
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-48 rounded-sm border border-line bg-surface px-2 py-1 text-xs text-paper outline-none focus:border-signal"
                />
              )}
            </div>
            {filteredMembers.length === 0 ? (
              <p className="mt-3 font-mono text-xs text-mist">No members match &ldquo;{memberSearch}&rdquo;.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
                {filteredMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between p-3">
                    <p className="text-sm text-paper">{m.email}</p>
                    <span
                      className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                        m.role === 'admin' ? 'bg-signal/15 text-signal' : 'border border-line text-mist'
                      }`}
                    >
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Modal open={creatingProject} onClose={() => setCreatingProject(false)} title="New project">
        <form onSubmit={handleCreateProject} className="space-y-3" autoComplete="off">
          <input
            autoFocus
            autoComplete="off"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onFocus={() => setError('')}
            placeholder="Project name"
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          {error && <Alert variant="error">{error}</Alert>}
          <button
            disabled={creatingSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {creatingSubmitting && <Spinner className="h-4 w-4" />}
            {creatingSubmitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit project">
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
                This includes all its environments and variables. This can&apos;t be undone.
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
              Delete this project
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}