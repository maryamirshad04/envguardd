'use client';

import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';

const STATUS_LABELS = {
  same: 'Same',
  missing_from_target: 'Missing in target',
  missing_from_source: 'Missing in source',
  different_value: 'Different value',
  different_protection: 'Different protection',
};

const STATUS_TONE = {
  same: 'border border-line text-mist',
  missing_from_target: 'bg-signal/15 text-signal',
  missing_from_source: 'border border-line text-mist',
  different_value: 'bg-alert/15 text-alert',
  different_protection: 'bg-alert/15 text-alert',
};

function ValueCell({ side, row, revealedValues, revealing, onReveal }) {
  const entry = side === 'source' ? row.source : row.target;
  if (!entry) {
    return <span className="font-mono text-xs text-mist">— not set —</span>;
  }
  const isSecret = entry.is_secret !== false;
  if (!isSecret) {
    return (
      <span className="block truncate font-mono text-xs text-paper" title={entry.value}>
        {entry.value}
      </span>
    );
  }
  const revealedValue = revealedValues[row.key]?.[side];
  const isRevealing = revealing[`${side}:${row.key}`];
  if (revealedValue !== undefined) {
    return (
      <span className="block truncate font-mono text-xs text-paper" title={revealedValue}>
        {revealedValue}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onReveal(side, row)}
      disabled={isRevealing}
      className="inline-flex items-center gap-1 rounded-sm border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mist hover:border-signal/40 hover:text-paper disabled:opacity-60"
    >
      {isRevealing && <Spinner className="h-3 w-3" />}
      {isRevealing ? 'Revealing…' : 'Reveal'}
    </button>
  );
}

export default function CompareList({
  rows,
  fetching,
  total,
  totalPages,
  page,
  onPageChange,
  selectedKeys,
  onToggleKey,
  onToggleAll,
  syncableRows,
  revealedValues,
  revealing,
  revealError,
  onReveal,
}) {
  const allOnPageSelected = syncableRows.length > 0 && syncableRows.every((r) => selectedKeys.has(r.key));

  return (
    <div className={fetching ? 'mt-6 opacity-50 transition-opacity' : 'mt-6 transition-opacity'}>
      {revealError && <Alert variant="error" className="mb-3">{revealError}</Alert>}

      {rows.length === 0 ? (
        <div className="rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">No variables match your filters.</p>
        </div>
      ) : (
        <>
          {syncableRows.length > 0 && (
            <label className="mb-3 flex w-fit items-center gap-2 text-xs text-mist hover:text-paper">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={onToggleAll}
                className="accent-signal"
              />
              Select all copyable on this page
            </label>
          )}

          <ul data-tour="cmp-rows" className="divide-y divide-line rounded-sm border border-line bg-surface">
            {rows.map((row) => {
              const canSync = row.source && row.status !== 'same';
              return (
                <li key={row.key} className="p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(row.key)}
                      onChange={() => onToggleKey(row.key)}
                      disabled={!canSync}
                      className="shrink-0 accent-signal disabled:opacity-30"
                      aria-label={`Select ${row.key}`}
                    />
                    <p className="min-w-0 flex-1 truncate font-mono text-sm text-paper">{row.key}</p>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${STATUS_TONE[row.status]}`}
                    >
                      {STATUS_LABELS[row.status]}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pl-6 pt-3">
                    <div className="min-w-0">
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-wide text-mist">Source</p>
                      <ValueCell side="source" row={row} revealedValues={revealedValues} revealing={revealing} onReveal={onReveal} />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 font-mono text-[9px] uppercase tracking-wide text-mist">Target</p>
                      <ValueCell side="target" row={row} revealedValues={revealedValues} revealing={revealing} onReveal={onReveal} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-mist">{total} total</p>
        </>
      )}
    </div>
  );
}