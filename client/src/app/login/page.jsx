'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2M6.6 6.8C4 8.4 2 12 2 12s4 7 11 7c2 0 3.7-.5 5.1-1.2M17.9 17.4C20.4 15.8 22 12 22 12s-1.6-2.9-4.3-4.9M9.9 5.2C10.6 5.1 11.3 5 12 5c7 0 11 7 11 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 7a4 4 0 10-3.8 4H15l2 2 1.5-1.5L17 10h1l1.5-1.5L18 7h-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4 20l6.5-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink">
          <Spinner className="h-8 w-8 text-signal" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [tempToken, setTempToken] = useState(null);
  const [code, setCode] = useState('');

  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [noPasskeyModalOpen, setNoPasskeyModalOpen] = useState(false);
  const [offerPasskeySetup, setOfferPasskeySetup] = useState(false);
  const [passkeySetupPromptOpen, setPasskeySetupPromptOpen] = useState(false);
  const [passkeySettingUp, setPasskeySettingUp] = useState(false);

  useEffect(() => {
    setPasskeySupported(browserSupportsWebAuthn());
  }, []);

  function completeLogin() {
    if (offerPasskeySetup) {
      setPasskeySetupPromptOpen(true);
    } else {
      router.push(redirect);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email, password);
      if (res.requires2fa) {
        setTempToken(res.tempToken);
      } else {
        completeLogin();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.verifyLogin2fa(tempToken, code);
      completeLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleCredential(credential) {
    setError('');
    setLoading(true);
    try {
      await api.googleLogin(credential);
      completeLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email first, then tap "Sign in with a passkey".');
      return;
    }
    setPasskeyLoading(true);
    try {
      const { hasPasskey } = await api.passkeys.status(email.trim());
      if (!hasPasskey) {
        setOfferPasskeySetup(true);
        setNoPasskeyModalOpen(true);
        return;
      }
      const options = await api.passkeys.loginOptions(email.trim());
      const authResponse = await startAuthentication({ optionsJSON: options });
      await api.passkeys.loginVerify(authResponse);
      router.push(redirect);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Passkey sign-in failed. Please try again.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleSetupPasskeyNow() {
    setError('');
    setPasskeySettingUp(true);
    try {
      const options = await api.passkeys.registerOptions();
      const regResponse = await startRegistration({ optionsJSON: options });
      await api.passkeys.registerVerify(regResponse);
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Could not set up passkey. Please try again.');
      }
    } finally {
      setPasskeySettingUp(false);
      setPasskeySetupPromptOpen(false);
      router.push(redirect);
    }
  }

  function handleSkipPasskeySetup() {
    setPasskeySetupPromptOpen(false);
    router.push(redirect);
  }

  // Shared button styles for consistency
  const buttonClasses =
    'flex w-full items-center justify-center gap-2 rounded-sm border border-line bg-ink px-4 py-2 text-sm font-medium text-paper hover:border-signal disabled:opacity-50';

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

        {!tempToken ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-paper">Welcome back</h1>
            <p className="mt-1 text-sm text-mist">Log in to access your projects.</p>

            <div className="mt-6 space-y-2">
              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                onError={setError}
                className={buttonClasses}
              />
              {passkeySupported && (
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={passkeyLoading}
                  className={buttonClasses}
                >
                  {passkeyLoading ? <Spinner className="h-4 w-4" /> : <KeyIcon />}
                  {passkeyLoading ? 'Checking...' : 'Sign in with a passkey'}
                </button>
              )}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-line" />
              <span className="text-xs text-mist">or</span>
              <div className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-mist">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setError('')}
                  className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm text-mist">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-signal hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setError('')}
                    className="w-full rounded-sm border border-line bg-ink px-3 py-2 pr-10 text-sm text-paper outline-none focus:border-signal"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-mist hover:text-paper"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && <Alert variant="error">{error}</Alert>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
              >
                {loading && <Spinner className="h-4 w-4" />}
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-mist">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-signal hover:underline">
                Sign up
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-paper">Enter your code</h1>
            <p className="mt-1 text-sm text-mist">
              Open your authenticator app and enter the 6‑digit code for EnvGuard.
            </p>

            <form onSubmit={handleVerifyCode} className="mt-8 space-y-4">
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onFocus={() => setError('')}
                placeholder="123456"
                className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-paper outline-none focus:border-signal"
              />

              {error && <Alert variant="error">{error}</Alert>}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
              >
                {loading && <Spinner className="h-4 w-4" />}
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempToken(null);
                  setCode('');
                  setError('');
                }}
                className="w-full text-sm text-mist hover:text-paper"
              >
                &larr; Back
              </button>
            </form>
          </>
        )}
      </div>

      {/* Modal shown when a user tries passkey login but doesn't have a passkey yet */}
      <Modal
        open={noPasskeyModalOpen}
        onClose={() => setNoPasskeyModalOpen(false)}
        title="Passkey not set up"
      >
        <div className="space-y-4">
          <p className="text-sm text-mist">
            This account doesn&apos;t have a passkey yet. To set one up, please log in with your password first.
            After logging in, you&apos;ll be offered to create a passkey for faster sign‑in next time.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={() => setNoPasskeyModalOpen(false)}
              className="flex-1 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
            >
              Log in with password
            </button>
            <button
              onClick={() => setNoPasskeyModalOpen(false)}
              className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal shown after a successful login to offer passkey setup */}
      <Modal
        open={passkeySetupPromptOpen}
        onClose={handleSkipPasskeySetup}
        title="Set up a passkey?"
      >
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Sign in next time with your fingerprint, face, or device PIN — no password needed.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={handleSetupPasskeyNow}
              disabled={passkeySettingUp}
              className="flex-1 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
            >
              {passkeySettingUp ? 'Waiting for your device...' : 'Set up a passkey'}
            </button>
            <button
              onClick={handleSkipPasskeySetup}
              className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
            >
              Skip for now
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}