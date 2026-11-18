'use client';

import { PRESET_EXPIRY } from '@/lib/projectUtils';
import Modal from '@/components/Modal';
import Spinner from '@/components/Spinner';
import Alert from '@/components/Alert';

export default function ShareModal({
  open,
  onClose,
  step,
  setStep,
  shareAll,
  setShareAll,
  selectedKeys,
  setSelectedKeys,
  variables,
  expiryMinutes,
  setExpiryMinutes,
  isCustomExpiry,
  setIsCustomExpiry,
  customExpiryValue,
  setCustomExpiryValue,
  customExpiryUnit,
  setCustomExpiryUnit,
  generatingLink,
  shareError,
  setShareError,
  handleGenerateLink,
  showResult,
  setShowResult,
  shareLink,
  shareCopied,
  copyShareLink,
}) {
  return (
    <>
      {/* Share link modal */}
      <Modal open={open} onClose={onClose} title="Generate link">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-mist">
              Choose which variables to include in the shareable link.
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-paper">
                <input
                  type="radio"
                  name="shareScope"
                  checked={shareAll}
                  onChange={() => setShareAll(true)}
                  className="accent-signal"
                />
                All variables in this environment
              </label>
              <label className="flex items-center gap-2 text-sm text-paper">
                <input
                  type="radio"
                  name="shareScope"
                  checked={!shareAll}
                  onChange={() => setShareAll(false)}
                  className="accent-signal"
                />
                Select specific variables
              </label>
            </div>

            {!shareAll && (
              <div className="max-h-60 overflow-y-auto rounded-sm border border-line p-2">
                {variables.length === 0 ? (
                  <p className="text-sm text-mist">No variables to select.</p>
                ) : (
                  variables.map((v) => (
                    <label key={v.id} className="flex items-center gap-2 py-1 text-sm text-paper">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(v.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedKeys((prev) => [...prev, v.key]);
                          } else {
                            setSelectedKeys((prev) => prev.filter((k) => k !== v.key));
                          }
                          setShareError('');
                        }}
                        className="accent-signal"
                      />
                      <span className="font-mono">{v.key}</span>
                      <span className="ml-auto text-xs text-mist">
                        {v.is_secret !== false ? 'protected' : 'plain'}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            {shareError && <Alert variant="error">{shareError}</Alert>}

            <button
              onClick={() => {
                if (!shareAll && selectedKeys.length === 0) {
                  setShareError('Please select at least one variable.');
                  return;
                }
                setStep(2);
                setShareError('');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
            >
              Next: Set expiry
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleGenerateLink} className="space-y-3">
            <p className="text-xs text-mist">
              This link will show the selected variables one time, then stop working.
            </p>

            <div className="space-y-2">
              {PRESET_EXPIRY.map((opt) => (
                <label key={opt.minutes} className="flex items-center gap-2 text-sm text-paper">
                  <input
                    type="radio"
                    name="expiry"
                    checked={!isCustomExpiry && expiryMinutes === opt.minutes}
                    onChange={() => {
                      setIsCustomExpiry(false);
                      setExpiryMinutes(opt.minutes);
                      setShareError('');
                    }}
                    className="accent-signal"
                  />
                  {opt.label}
                </label>
              ))}

              <label className="flex items-center gap-2 text-sm text-paper">
                <input
                  type="radio"
                  name="expiry"
                  checked={isCustomExpiry}
                  onChange={() => {
                    setIsCustomExpiry(true);
                    setShareError('');
                  }}
                  className="accent-signal"
                />
                Custom
              </label>

              {isCustomExpiry && (
                <div className="ml-6 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={customExpiryValue}
                    onChange={(e) => {
                      setCustomExpiryValue(parseFloat(e.target.value) || 0);
                      setShareError('');
                    }}
                    onFocus={() => setShareError('')}
                    className="w-20 rounded-sm border border-line bg-ink px-2 py-1 text-sm text-paper outline-none focus:border-signal"
                  />
                  <select
                    value={customExpiryUnit}
                    onChange={(e) => setCustomExpiryUnit(e.target.value)}
                    className="rounded-sm border border-line bg-ink px-2 py-1 text-sm text-paper outline-none focus:border-signal"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                  <span className="text-xs text-mist">(5 min – 7 days)</span>
                </div>
              )}
            </div>

            {shareError && <Alert variant="error">{shareError}</Alert>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setShareError('');
                }}
                className="flex-1 rounded-sm border border-line py-2 text-sm text-mist hover:text-paper"
              >
                Back
              </button>
              <button
                disabled={generatingLink}
                className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
              >
                {generatingLink && <Spinner className="h-4 w-4" />}
                {generatingLink ? 'Generating…' : 'Generate link'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Share link */}
      <Modal open={showResult} onClose={() => setShowResult(false)} title="Shareable link">
        <div className="space-y-4">
          <p className="text-sm text-mist">
            This link is viewable <strong>once</strong>.
          </p>
          <div className="flex items-center gap-2 rounded-sm border border-line bg-ink p-2">
            <input
              readOnly
              value={shareLink}
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm text-paper outline-none"
            />
            <button
              onClick={copyShareLink}
              className="whitespace-nowrap rounded-sm bg-signal px-3 py-1 text-sm font-medium text-ink hover:bg-signal/90"
            >
              Copy
            </button>
          </div>
          {shareCopied && <Alert variant="success" className="mt-2">Copied!</Alert>}
          <button
            onClick={() => setShowResult(false)}
            className="w-full rounded-sm border border-line py-2 text-sm text-mist hover:text-paper"
          >
            Close
          </button>
        </div>
      </Modal>
    </>
  );
}