'use client';

import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import Alert from '@/components/Alert';

export default function SyncConfirmModal({
  open,
  onClose,
  selectedRows,
  sourceEnvName,
  targetEnvName,
  submitting,
  error,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Confirm sync">
      <div className="space-y-4">
        <p className="text-sm text-mist">
          Copy <strong className="text-paper">{selectedRows.length}</strong> variable
          {selectedRows.length === 1 ? '' : 's'} from{' '}
          <span className="font-mono text-signal">{sourceEnvName}</span> to{' '}
          <span className="font-mono text-signal">{targetEnvName}</span>. This overwrites any
          existing values for these keys in the target environment.
        </p>

        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-sm border border-line p-2">
          {selectedRows.map((row) => (
            <li key={row.key} className="flex items-center justify-between text-sm">
              <span className="font-mono text-paper">{row.key}</span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-mist">
                {row.target ? 'overwrite' : 'create'}
              </span>
            </li>
          ))}
        </ul>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-line py-2 text-sm text-mist hover:text-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting || selectedRows.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {submitting && <Spinner className="h-4 w-4" />}
            {submitting ? 'Syncing…' : 'Yes, sync'}
          </button>
        </div>
      </div>
    </Modal>
  );
}