'use client';

import { EyeIcon, EyeOffIcon } from '@/lib/projectUtils';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import Pagination from '@/components/Pagination';
import Alert from '@/components/Alert';
import SearchInput from '@/components/SearchInput';

export default function VariableSection({
  variables,
  varsLoading,
  filteredVariables,
  paginatedVariables,
  varPageSafe,
  varTotalPages,
  onVarPageChange,
  varSearch,
  onVarSearchChange,
  varFilter,
  onVarFilterChange,
  onCopyAll,
  onDownloadEnv,
  onDownloadCsv,
  onGenerateLink,
  hasVariables,
  addVarOpen,
  setAddVarOpen,
  addVarError,
  setAddVarError,
  newKey,
  setNewKey,
  newValue,
  setNewValue,
  showNewValue,
  setShowNewValue,
  newIsSecret,
  setNewIsSecret,
  addVarSubmitting,
  handleAddVariable,
  importOpen,
  setImportOpen,
  importError,
  setImportError,
  importText,
  setImportText,
  importIsSecret,
  setImportIsSecret,
  importSubmitting,
  handleImport,
  handleFileSelect,
  deletingVar,
  setDeletingVar,
  deleteSubmitting,
  handleConfirmDelete,
  revealed,
  copiedId,
  toggleReveal,
  handleCopy,
}) {
  return (
    <>
      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          data-tour="var-add"
          onClick={() => {
            setAddVarError('');
            setShowNewValue(false);
            setAddVarOpen(true);
          }}
          className="rounded-sm bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:bg-signal/90"
        >
          + Add variable
        </button>
        <button
          data-tour="var-import"
          onClick={() => {
            setImportError('');
            setImportOpen(true);
          }}
          className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
        >
          Import .env
        </button>

        {hasVariables && (
          <>
            <button
              onClick={onCopyAll}
              className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
            >
              Copy all
            </button>
            <button
              onClick={onDownloadEnv}
              className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
            >
              Download .env
            </button>
            <button
              onClick={onDownloadCsv}
              className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
            >
              Download CSV
            </button>
            <button
              data-tour="var-share"
              onClick={onGenerateLink}
              className="rounded-sm bg-signal px-3 py-1.5 text-xs font-medium text-ink hover:bg-signal/90"
            >
              Generate link
            </button>
          </>
        )}
      </div>

      {/* Search + filter */}
      {hasVariables && (
        <div className="mt-4 flex flex-wrap gap-2">
          <SearchInput
            value={varSearch}
            onChange={onVarSearchChange}
            placeholder="Search by key..."
            className="w-full max-w-xs"
          />
          <select
            value={varFilter}
            onChange={(e) => onVarFilterChange(e.target.value)}
            className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          >
            <option value="all">All</option>
            <option value="protected">Protected only</option>
            <option value="plain">Plain only</option>
          </select>
        </div>
      )}

      {/* Variables list */}
      <div className="mt-4">
        {varsLoading ? (
          <div className="space-y-px overflow-hidden rounded-sm border border-line">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse bg-line/40" />
            ))}
          </div>
        ) : variables.length === 0 ? (
          <div className="rounded-sm border border-dashed border-line p-10 text-center">
            <p className="font-mono text-sm text-mist">No variables in this environment yet.</p>
          </div>
        ) : filteredVariables.length === 0 ? (
          <div className="rounded-sm border border-dashed border-line p-10 text-center">
            <p className="font-mono text-sm text-mist">No variables match your search/filter.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line rounded-sm border border-line bg-surface">
              {paginatedVariables.map((v) => {
                const isSecret = v.is_secret !== false;
                return (
                  <li
                    key={v.id}
                    className="flex flex-col gap-2 p-4 overflow-hidden w-full sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-sm text-paper truncate max-w-[120px] sm:max-w-none">
                          {v.key}
                        </p>
                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                            isSecret ? 'border border-line text-mist' : 'bg-signal/15 text-signal'
                          }`}
                        >
                          {isSecret ? 'protected' : 'plain'}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-mono text-sm text-mist">
                        {!isSecret || revealed[v.id]
                          ? v.value
                          : '\u2022'.repeat(Math.min(v.value.length, 24))}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 mt-2 sm:mt-0">
                      {isSecret && (
                        <button
                          onClick={() => toggleReveal(v.id)}
                          className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
                        >
                          {revealed[v.id] ? 'Hide' : 'Reveal'}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(v.id, v.value)}
                        className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
                      >
                        {copiedId === v.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => setDeletingVar(v)}
                        className="rounded-sm border border-line px-3 py-1.5 text-xs text-alert hover:border-alert/60"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination page={varPageSafe} totalPages={varTotalPages} onChange={onVarPageChange} />
          </>
        )}
      </div>

      {/* Add variable modal */}
      <Modal open={addVarOpen} onClose={() => setAddVarOpen(false)} title="Add variable">
        <form onSubmit={handleAddVariable} className="space-y-3" autoComplete="off">
          {addVarError && <Alert variant="error">{addVarError}</Alert>}
          <div>
            <label className="mb-1 block text-xs text-mist">Key</label>
            <input
              autoFocus
              autoComplete="off"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onFocus={() => setAddVarError('')}
              placeholder="DATABASE_URL"
              className="w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-sm text-paper outline-none focus:border-signal"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-mist">Value</label>
            <div className="relative">
              <input
                type="text"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onFocus={() => setAddVarError('')}
                placeholder="postgres://..."
                style={showNewValue ? undefined : { WebkitTextSecurity: 'disc' }}
                className="w-full rounded-sm border border-line bg-ink px-3 py-2 pr-10 font-mono text-sm text-paper outline-none focus:border-signal"
              />
              <button
                type="button"
                onClick={() => setShowNewValue((v) => !v)}
                aria-label={showNewValue ? 'Hide value' : 'Show value'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-mist hover:text-paper"
              >
                {showNewValue ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-mist">
            <input
              type="checkbox"
              checked={newIsSecret}
              onChange={(e) => setNewIsSecret(e.target.checked)}
              className="accent-signal"
            />
            Protected (masked by default, click to reveal)
          </label>
          <button
            disabled={addVarSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {addVarSubmitting && <Spinner className="h-4 w-4" />}
            {addVarSubmitting ? 'Adding…' : 'Add variable'}
          </button>
        </form>
      </Modal>

      {/* Import modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import .env">
        <form onSubmit={handleImport} className="space-y-3" autoComplete="off">
          {importError && <Alert variant="error">{importError}</Alert>}
          <div>
            <label className="mb-1 block text-xs text-mist">Upload a file (optional)</label>
            <input
              type="file"
              accept=".env,.txt,text/plain"
              onChange={handleFileSelect}
              className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-xs text-mist file:mr-3 file:rounded-sm file:border-0 file:bg-signal file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
            />
          </div>
          <p className="text-xs text-mist">Or paste KEY=VALUE lines below.</p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            onFocus={() => setImportError('')}
            rows={8}
            placeholder={'DATABASE_URL=postgres://...\nAPI_KEY=sk-...'}
            className="w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-xs text-paper outline-none focus:border-signal"
          />
          <label className="flex items-center gap-2 text-xs text-mist">
            <input
              type="checkbox"
              checked={importIsSecret}
              onChange={(e) => setImportIsSecret(e.target.checked)}
              className="accent-signal"
            />
            Protect all imported values (masked by default, click to reveal)
          </label>
          <button
            disabled={importSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {importSubmitting && <Spinner className="h-4 w-4" />}
            {importSubmitting ? 'Importing…' : 'Import'}
          </button>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deletingVar} onClose={() => setDeletingVar(null)} title="Delete variable">
        <Alert variant="warning" title={`Delete "${deletingVar?.key}"?`}>
          This can&apos;t be undone.
        </Alert>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleConfirmDelete}
            disabled={deleteSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-alert px-4 py-2 text-sm font-medium text-ink hover:bg-alert/90 disabled:opacity-60"
          >
            {deleteSubmitting && <Spinner className="h-4 w-4" />}
            Yes, delete
          </button>
          <button
            onClick={() => setDeletingVar(null)}
            className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
          >
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}