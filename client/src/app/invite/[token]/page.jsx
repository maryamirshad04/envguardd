'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Alert from '@/components/Alert';

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);

  function validateEmail(email) {
    if (!email || email.trim() === '') {
      return 'Invite email is missing. Please contact the person who invited you.';
    }
    if (!email.includes('@')) {
      return 'Email must contain @ symbol';
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      return 'Invalid email format';
    }

    if (parts[0].length === 0 || parts[1].length === 0) {
      return 'Email must have content before and after @';
    }
    
    return null;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.invites.get(token);
        if (cancelled) return;
        setInvite(res.invite);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
      }

      try {
        await api.me();
        if (!cancelled) setIsLoggedIn(true);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError('');

    if (!invite || !invite.email || invite.email.trim() === '') {
      setError('Invite email is missing. Please contact the person who invited you.');
      setAccepting(false);
      return;
    }

    const validationError = validateEmail(invite.email);
    if (validationError) {
      setError(validationError);
      setAccepting(false);
      return;
    }

    try {
      const res = await api.invites.accept(token);
      router.push(`/dashboard/${res.companyId}`);
    } catch (err) {
      setError(err.message);
      setAccepting(false);
    }
  }

  const redirectParam = encodeURIComponent(`/invite/${token}`);
  const emailError = invite?.email ? validateEmail(invite.email) : 'Invite email is missing. Please contact the person who invited you.';
  const isEmailInvalid = !invite?.email?.trim() || !!validateEmail(invite.email);

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

        {loading ? (
          <p className="mt-6 font-mono text-sm text-mist">Checking invite</p>
        ) : error && !invite ? (
          // If error occurs and we don't have invite data, show as error alert
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">This invite isn&apos;t available</h1>
            <div className="mt-2">
              <Alert variant="error">{error}</Alert>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">You&apos;ve been invited</h1>
            <p className="mt-2 text-sm text-mist">
              Join <span className="text-paper">{invite.companyName}</span> as{' '}
              <span className="font-mono text-signal">{invite.role}</span>.
            </p>
            <p className="mt-1 text-xs text-mist">Sent to {invite.email || 'unknown email'}</p>
            
            {/* Show warning if email is missing or invalid */}
            {isEmailInvalid && (
              <div className="mt-2">
                <Alert variant="warning">
                  {emailError}
                </Alert>
              </div>
            )}

            {/* Show any other error (e.g., from accept attempt) */}
            {error && (
              <div className="mt-2">
                <Alert variant="error">{error}</Alert>
              </div>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleAccept}
                disabled={accepting || isEmailInvalid}
                className="mt-6 w-full rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
              >
                {accepting ? 'Joining...' : 'Accept invite'}
              </button>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-xs text-mist">
                  Log in or create an account with <span className="text-paper">{invite.email || 'the invited email'}</span> to accept.
                </p>
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
            )}
          </>
        )}
      </div>
    </main>
  );
}