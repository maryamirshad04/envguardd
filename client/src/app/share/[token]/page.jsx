'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Spinner from '@/components/Spinner';
import Alert from '@/components/Alert';

export default function SharedViewPage() {
  const { token } = useParams();
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [revealed, setRevealed] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);
  const fetchedRef = useRef(false);
  const successTimeout = useRef(null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchShared() {
      try {
        const data = await api.share.get(token);
        setVariables(data.variables || []);
      } catch (err) {
        setError(err.message || 'Failed to load shared data');
      } finally {
        setLoading(false);
      }
    }
    fetchShared();
  }, [token]);

  useEffect(() => {
    return () => {
      if (successTimeout.current) clearTimeout(successTimeout.current);
    };
  }, []);

  function toggleReveal(idx) {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  async function handleCopy(idx, value) {
    await navigator.clipboard.writeText(value);
    setCopiedIdx(idx);
    setSuccess('Copied to clipboard');
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => {
      setSuccess('');
      setCopiedIdx(null);
    }, 2000);
  }

  async function handleCopyAll() {
    const text = variables.map((v) => `${v.key}=${v.value}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedIdx('all');
    setSuccess('All variables copied');
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => {
      setSuccess('');
      setCopiedIdx(null);
    }, 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-paper">Shared environment variables</h1>
      <p className="mt-1 text-sm text-mist">This link was viewed once and cannot be viewed again.</p>

      {success && (
        <div className="mt-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      {variables.length === 0 ? (
        <div className="mt-8 rounded-sm border border-dashed border-line p-10 text-center">
          <p className="font-mono text-sm text-mist">No variables shared.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCopyAll}
              className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
            >
              {copiedIdx === 'all' ? 'Copied' : 'Copy all'}
            </button>
          </div>

          <ul className="mt-3 divide-y divide-line rounded-sm border border-line bg-surface">
            {variables.map((v, idx) => {
              const isSecret = v.is_secret !== false;
              return (
                <li
                  key={idx}
                  className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-paper">{v.key}</p>
                      <span
                        className={`rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide ${
                          isSecret ? 'border border-line text-mist' : 'bg-signal/15 text-signal'
                        }`}
                      >
                        {isSecret ? 'protected' : 'plain'}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-sm text-mist">
                      {!isSecret || revealed[idx] ? v.value : '\u2022'.repeat(Math.min(v.value.length, 24))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {isSecret && (
                      <button
                        onClick={() => toggleReveal(idx)}
                        className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
                      >
                        {revealed[idx] ? 'Hide' : 'Reveal'}
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(idx, v.value)}
                      className="rounded-sm border border-line px-3 py-1.5 text-xs text-mist hover:border-signal/40 hover:text-paper"
                    >
                      {copiedIdx === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}