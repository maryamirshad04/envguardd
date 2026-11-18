'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const hasCalled = useRef(false);

  const verify = async () => {
    try {
      console.log('[Verify] Sending request with token:', token);
      const res = await api.verifyEmail(token);
      console.log('[Verify] Response received:', res);
      setStatus('success');
      setMessage(res.message || 'Email verified successfully.');
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/signup?show2fa=1');
      }, 2000);
    } catch (err) {
      console.error('[Verify] Error:', err);
      setStatus('error');
      setMessage(err.message || 'Verification failed. Please try again.');
    }
  };

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;
    verify();
  }, [token, router]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setStatus('loading');
    setMessage('');
    verify();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm rounded-sm border border-line bg-surface p-8 text-center">
        <Link href="/" className="font-mono text-sm text-signal">
          <img
            src="/lock.svg"
            alt="Envguard icon"
            className="inline-block h-5 w-5 text-signal align-middle"
          />{' '}
          <span className="align-middle">envguard</span>
        </Link>

        {status === 'loading' && (
          <>
            <div className="mt-6 flex flex-col items-center">
              <Spinner className="h-8 w-8 text-signal" />
              <h1 className="mt-4 text-xl font-semibold text-paper">Verifying your email...</h1>
              <p className="mt-2 text-sm text-mist">Please wait a moment.</p>
            </div>
            {retryCount > 0 && (
              <Alert variant="warning" title={`Retry attempt ${retryCount}`} className="mt-4">
                If this takes too long, click the button below.
              </Alert>
            )}
            <button
              onClick={handleRetry}
              className="mt-4 text-sm text-signal hover:underline"
            >
              Retry verification
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">Email verified!</h1>
            <Alert variant="success" className="mt-2">{message}</Alert>
            <p className="mt-2 text-sm text-mist">Redirecting you to set up 2FA...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="mt-6 text-xl font-semibold text-paper">Verification failed</h1>
             <Alert variant="error" className="mt-2">{message}</Alert>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleRetry}
                className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
              >
                Try again
              </button>
              <Link
                href="/login"
                className="text-sm text-signal hover:underline"
              >
                Go to login
              </Link>
            </div>
            <p className="mt-4 text-sm text-mist">
              If your link expired, you can{' '}
              <Link href="/login" className="text-signal hover:underline">
                log in
              </Link>{' '}
              to request a new verification email.
            </p>
          </>
        )}
      </div>
    </main>
  );
}