'use client';

import SearchInput from '@/components/SearchInput';

const STATUS_OPTIONS = {
  all: 'All',
  same: 'Same',
  missing_from_target: 'Missing from target',
  missing_from_source: 'Missing from source',
  different_value: 'Different value',
  different_protection: 'Different protection',
};

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 7h11m0 0l-4-4m4 4l-4 4M17 17H6m0 0l4 4m-4-4l4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CompareToolbar({
  environments,
  sourceEnvId,
  setSourceEnvId,
  targetEnvId,
  setTargetEnvId,
  onSwap,
  summary,
  searchInput,
  setSearchInput,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  onOpenSync,
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-3 rounded-sm border border-line bg-surface p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-mist">Source</label>
          <select
            value={sourceEnvId}
            onChange={(e) => setSourceEnvId(e.target.value)}
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onSwap}
          aria-label="Swap source and target"
          className="flex shrink-0 items-center justify-center self-center rounded-sm border border-line p-2 text-mist hover:border-signal/40 hover:text-paper sm:self-auto"
        >
          <SwapIcon />
        </button>

        <div className="flex-1">
          <label className="mb-1 block text-xs text-mist">Target</label>
          <select
            value={targetEnvId}
            onChange={(e) => setTargetEnvId(e.target.value)}
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
        </div>
      </div>

      {sourceEnvId === targetEnvId && (
        <p className="font-mono text-xs text-alert">Choose two different environments to compare.</p>
      )}

      {summary && (
        <div className="flex flex-wrap gap-2">
          <span className="whitespace-nowrap rounded-sm border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-mist">
            {summary.same} same
          </span>
          <span className="whitespace-nowrap rounded-sm bg-signal/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-signal">
            {summary.missing_from_target} missing in target
          </span>
          <span className="whitespace-nowrap rounded-sm border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-mist">
            {summary.missing_from_source} missing in source
          </span>
          <span className="whitespace-nowrap rounded-sm bg-alert/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-alert">
            {summary.different_value} different value
          </span>
          <span className="whitespace-nowrap rounded-sm bg-alert/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-alert">
            {summary.different_protection} different protection
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by key..."
            className="w-full sm:max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-signal sm:w-auto"
          >
            {Object.entries(STATUS_OPTIONS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenSync}
          disabled={selectedCount === 0}
          className="rounded-sm bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Copy {selectedCount > 0 ? `${selectedCount} ` : ''}to target
        </button>
      </div>
    </div>
  );
}