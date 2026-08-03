'use client';

import { envDotColor } from '@/lib/projectUtils';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';

export default function EnvironmentSection({
  environments,
  activeEnvId,
  onSwitchEnv,
  addEnvOpen,
  setAddEnvOpen,
  newEnvName,
  setNewEnvName,
  addEnvSubmitting,
  handleAddEnvironment,
  error,
  setError,
}) {
  return (
    <>
      <div data-tour="proj-environments" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {environments.map((env) => (
          <button
            key={env.id}
            onClick={() => onSwitchEnv(env.id)}
            className={`flex items-center gap-2 rounded-sm border p-3 text-left transition-colors ${
              activeEnvId === env.id
                ? 'border-signal bg-signal/10'
                : 'border-line bg-surface hover:border-signal/40'
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${envDotColor(env.name)}`} />
            <span className="truncate font-mono text-xs uppercase tracking-wide text-paper">
              {env.name}
            </span>
          </button>
        ))}
        <button
          onClick={() => {
            setError('');
            setAddEnvOpen(true);
          }}
          className="rounded-sm border border-dashed border-line p-3 text-left text-xs text-mist hover:border-signal/40 hover:text-paper"
        >
          + environment
        </button>
      </div>

      <Modal open={addEnvOpen} onClose={() => setAddEnvOpen(false)} title="New environment">
        <form onSubmit={handleAddEnvironment} className="space-y-3" autoComplete="off">
          <input
            autoFocus
            autoComplete="off"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            onFocus={() => setError('')}
            placeholder="e.g. qa"
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          <button
            disabled={addEnvSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {addEnvSubmitting && <Spinner className="h-4 w-4" />}
            {addEnvSubmitting ? 'Creating…' : 'Create'}
          </button>
        </form>
      </Modal>
    </>
  );
}