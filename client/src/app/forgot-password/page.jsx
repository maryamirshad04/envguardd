'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Alert from '@/components/Alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm rounded-sm border border-line bg-surface p-8">
        <Link href="/" className="font-mono text-sm text-signal">
          <img
            src="/lock.svg"
            alt="Envguard icon"
            className="inline-block h-5 w-5 text-signal align-middle"
          />{' '}
          <span className="align-middle">envguard</span>
        </Link>

        {sent ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-paper">Check your email</h1>
            <div className="mt-2">
              <Alert variant="success">
                If an account exists for <span className="font-medium text-paper">{email}</span>, a password
                reset link is on its way. The link expires in 1 hour.
              </Alert>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-paper">Reset your password</h1>
            <p className="mt-1 text-sm text-mist">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setError('')}
                className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                placeholder="you@company.com"
              />

              {error && <Alert variant="error">{error}</Alert>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-mist">
          <Link href="/login" className="text-signal hover:underline">
            &larr; Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}