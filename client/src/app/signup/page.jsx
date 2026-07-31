'use client';

import { Suspense, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import Modal from '@/components/Modal';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import Alert from '@/components/Alert';
import Spinner from '@/components/Spinner';
import { startRegistration } from '@simplewebauthn/browser';

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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink">
          <Spinner className="h-8 w-8 text-signal" />
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const show2faParam = searchParams.get('show2fa');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [show2faPrompt, setShow2faPrompt] = useState(false);
  const [passkeySettingUp, setPasskeySettingUp] = useState(false);

  useEffect(() => {
    if (show2faParam === '1') {
      setShow2faPrompt(true);
    }
  }, [show2faParam]);

  function validateEmail(email) {
    if (!email.includes('@')) {
      return 'please include @ in the email address';
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

  function validatePassword(password) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must include at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must include at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must include at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(password)) {
      return 'Password must include at least one special character';
    }
    return null;
  }

  // --- Real-time validation  ---
  const handleEmailBlur = useCallback(() => {
    if (email) {
      const emailError = validateEmail(email);
      setError(emailError || '');
    }
  }, [email]);

  const handlePasswordBlur = useCallback(() => {
    if (password) {
      const passwordError = validatePassword(password);
      setError(passwordError || '');
    }
  }, [password]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');

      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }

      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }

      setLoading(true);

      try {
        await api.signup(email, password);
        setVerificationSent(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [email, password]
  );

  async function handleGoogleCredential(credential) {
    setError('');
    setLoading(true);
    try {
      await api.googleLogin(credential);
      router.push(redirect);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  async function handleSetupPasskey() {
  setError('');
  setPasskeySettingUp(true);
  try {
    const options = await api.passkeys.registerOptions();
    const regResponse = await startRegistration({ optionsJSON: options });
    await api.passkeys.registerVerify(regResponse);
    setShow2faPrompt(false);
    router.push(redirect);
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      setError(err.message || 'Could not set up passkey. Please try again.');
    }
  } finally {
    setPasskeySettingUp(false);
  }
};

  const handleSetup2fa = () => {
    setShow2faPrompt(false);
    router.push('/dashboard/settings?setup2fa=1');
  };

  const handleSkip2fa = () => {
    setShow2faPrompt(false);
    router.push(redirect);
  };

  const handleResendVerification = useCallback(async () => {
    setResending(true);
    setResendMessage('');
    setError('');
    try {
      await api.resendVerification(email);
      setResendMessage('Verification email resent. Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }, [email]);

  if (verificationSent) {
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
          <h1 className="mt-6 text-xl font-semibold text-paper">Check your email</h1>
          <p className="mt-2 text-sm text-mist">
            We sent a verification link to <strong>{email}</strong>.
            Click the link to verify your account and complete signup.
          </p>
          {resendMessage && <Alert variant="success" className="mt-3">{resendMessage}</Alert>}
          {error && <Alert variant="error" className="mt-3">{error}</Alert>}
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="mt-4 inline-flex items-center gap-2 text-sm text-signal hover:underline disabled:opacity-50"
          >
            {resending && <Spinner className="h-4 w-4" />}
            {resending ? 'Sending...' : "Didn't get the email? Resend"}
          </button>
          <p className="mt-6 text-sm text-mist">
            Already verified?{' '}
            <Link href="/login" className="text-signal hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    );
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
        <h1 className="mt-6 text-2xl font-semibold text-paper">Create your account</h1>
        <p className="mt-1 text-sm text-mist">Encrypt your first secret in under a minute.</p>

        <div className="mt-6">
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setError('')}
              onBlur={handleEmailBlur}
              className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-mist">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setError('')}
                onBlur={handlePasswordBlur}
                className="w-full rounded-sm border border-line bg-ink px-3 py-2 pr-10 text-sm text-paper outline-none focus:border-signal"
                placeholder="At least 8 characters"
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
            <p className="mt-1 text-xs text-mist">
              Must be at least 8 characters, include uppercase, lowercase, number, and special character.
            </p>
          </div>

          {error && <Alert variant="error">{error}</Alert>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
          >
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist">
          Already have an account?{' '}
          <Link href="/login" className="text-signal hover:underline">
            Log in
          </Link>
        </p>
      </div>

      <Modal open={show2faPrompt} onClose={handleSkip2fa} title="Secure your account">
        <div className="space-y-4">
          <p className="text-sm text-mist">
            Add a passkey for one-tap sign-in with your fingerprint, face, or device PIN — no
            password needed. You can also enable two-factor authentication for extra protection.
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          <button
            onClick={handleSetupPasskey}
            disabled={passkeySettingUp}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-50"
          >
            {passkeySettingUp ? <Spinner className="h-4 w-4" /> : null}
            {passkeySettingUp ? 'Waiting for your device...' : 'Set up a passkey'}
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              onClick={handleSetup2fa}
              className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
            >
              Set up 2FA instead
            </button>
            <button
              onClick={handleSkip2fa}
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