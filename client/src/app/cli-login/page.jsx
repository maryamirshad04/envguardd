'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Alert from '@/components/Alert';

export default function CliLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink">
          <p className="font-mono text-sm text-mist">Loading</p>
        </main>
      }
    >
      <CliLoginContent />
    </Suspense>
  );
}

function CliLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .me()
      .then(() => setIsLoggedIn(true))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setCheckingAuth(false));
  }, []);

  async function handleApprove() {
    setError('');
    setApproving(true);
    try {
      await api.cli.approve(code);
      setApproved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  }

  const redirectParam = encodeURIComponent(`/cli-login?code=${code}`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm rounded-sm border border-line bg-surface p-8">
        <Link href="/" className="font-mono text-sm text-signal">
          <img
            src="/lock.svg"
            alt="Envguard icon"
            className="inline-block h-5 w-5 text-signal align-middle"
          />
          <span className="align-middle">envguard</span>
        </Link>

        {!code ? (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">Missing code</h1>
            <p className="mt-2 text-sm text-mist">
              This page is meant to be opened by the{' '}
              <span className="font-mono">envguard login</span> CLI command, which includes a
              pairing code in the link.
            </p>
          </>
        ) : approved ? (
          <>
            <div className="mt-6 flex items-center justify-center">
              <svg
                className="h-12 w-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-semibold text-paper">You&apos;re all set</h1>
            <p className="mt-2 text-sm text-mist">
              Your CLI is now connected. You can close this tab and return to your terminal.
            </p>
          </>
        ) : checkingAuth ? (
          <p className="mt-6 font-mono text-sm text-mist">Checking your session…</p>
        ) : !isLoggedIn ? (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">Log in to connect your CLI</h1>
            <p className="mt-2 text-sm text-mist">
              Pairing code: <span className="font-mono text-signal">{code}</span>
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href={`/login?redirect=${redirectParam}`}
                className="block w-full rounded-sm bg-signal px-4 py-2 text-center text-sm font-medium text-ink hover:bg-signal/90"
              >
                Log in
              </Link>
              <Link
                href={`/signup?redirect=${redirectParam}`}
                className="block w-full rounded-sm border border-line px-4 py-2 text-center text-sm text-mist hover:border-signal/40 hover:text-paper"
              >
                Sign up
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">Connect this device</h1>
            <p className="mt-2 text-sm text-mist">
              A command‑line tool on your machine wants to sign in to your EnvGuard account.
            </p>
            <div className="mt-4 rounded-sm border border-line bg-ink px-4 py-3 text-center">
              <span className="font-mono text-2xl tracking-widest text-signal">{code}</span>
            </div>
            <p className="mt-2 text-xs text-mist">
              Only approve this if you just ran <span className="font-mono">envguard login</span>{' '}
              yourself.
            </p>
            {error && (
              <div className="mt-3">
                <Alert variant="error">{error}</Alert>
              </div>
            )}
            <button
              onClick={handleApprove}
              disabled={approving}
              className="mt-6 w-full rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}