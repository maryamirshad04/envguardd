'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useDashboard } from '@/lib/DashboardContext';
import Spinner from '@/components/Spinner';
import Alert from '@/components/Alert';

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<p className="mx-auto max-w-2xl px-6 py-12 font-mono text-sm text-mist">Loading…</p>}
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useDashboard();

  const [email, setEmail] = useState(user?.email || '');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailNotice, setEmailNotice] = useState('');

  const [twoFAEnabled, setTwoFAEnabled] = useState(null); 
  const [settingUp, setSettingUp] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const [disabling, setDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableSubmitting, setDisableSubmitting] = useState(false);
  const [disableError, setDisableError] = useState('');

  useEffect(() => {
    api.twoFactor
      .status()
      .then((res) => setTwoFAEnabled(res.enabled))
      .catch(() => setTwoFAEnabled(false));
  }, []);

  useEffect(() => {
    if (searchParams.get('setup2fa') === '1' && twoFAEnabled === false && !settingUp) {
      startSetup();
    }
  }, [twoFAEnabled]);

  async function handleUpdateEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setEmailError('');
    setEmailSubmitting(true);
    try {
      await api.updateEmail(email.trim());
      setEmailNotice('Email updated. Please log in again with your new email.');
      setTimeout(async () => {
        await logout();
        router.push('/login');
      }, 1800);
    } catch (err) {
      setEmailError(err.message);
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function startSetup() {
    setVerifyError('');
    setSettingUp(true);
    try {
      const res = await api.twoFactor.setup();
      setQrCodeDataUrl(res.qrCodeDataUrl);
      setSecret(res.secret);
    } catch (err) {
      setVerifyError(err.message);
      setSettingUp(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError('');
    setVerifySubmitting(true);
    try {
      await api.twoFactor.verify(verifyCode);
      setTwoFAEnabled(true);
      setSettingUp(false);
      setVerifyCode('');
      setQrCodeDataUrl('');
      setSecret('');
    } catch (err) {
      setVerifyError(err.message);
    } finally {
      setVerifySubmitting(false);
    }
  }

  async function handleDisable(e) {
    e.preventDefault();
    setDisableError('');
    setDisableSubmitting(true);
    try {
      await api.twoFactor.disable(disablePassword);
      setTwoFAEnabled(false);
      setDisabling(false);
      setDisablePassword('');
    } catch (err) {
      setDisableError(err.message);
    } finally {
      setDisableSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-paper">Settings</h1>

      {/* Email */}
      <section className="mt-8 rounded-sm border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-paper">Email</h2>
        <form onSubmit={handleUpdateEmail} className="mt-3 flex flex-col gap-3 sm:flex-row" autoComplete="off">
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailError('')}
            className="flex-1 rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
          />
          <button
            disabled={emailSubmitting}
            className="flex items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
          >
            {emailSubmitting && <Spinner className="h-4 w-4" />}
            Save
          </button>
        </form>
        {emailError && <Alert variant="error" className="mt-2">{emailError}</Alert>}
        {emailNotice && <Alert variant="success" className="mt-2">{emailNotice}</Alert>}
      </section>

      {/* Two-factor authentication */}
      <section className="mt-6 rounded-sm border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-paper">Two-factor authentication</h2>
          {twoFAEnabled !== null && (
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                twoFAEnabled ? 'bg-signal/15 text-signal' : 'border border-line text-mist'
              }`}
            >
              {twoFAEnabled ? 'On' : 'Off'}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-mist">
          Use Google Authenticator, Authy, or Microsoft Authenticator to require a 6-digit code at login.
        </p>

        {twoFAEnabled === null ? (
          <p className="mt-4 font-mono text-xs text-mist">Loading…</p>
        ) : twoFAEnabled ? (
          disabling ? (
            <form onSubmit={handleDisable} className="mt-4 space-y-3" autoComplete="off">
              <label className="block text-xs text-mist">Confirm your password to disable</label>
              <input
              type="password"
              autoComplete="off"
              placeholder="Confirm your password to disable"
              data-testid="2fa-disable-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              onFocus={() => setDisableError('')}
              className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-signal"
              />
              {disableError && <Alert variant="error">{disableError}</Alert>}
              <div className="flex gap-2">
                <button
                  disabled={disableSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-alert px-4 py-2 text-sm font-medium text-ink hover:bg-alert/90 disabled:opacity-60"
                >
                  {disableSubmitting && <Spinner className="h-4 w-4" />}
                  Disable 2FA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisabling(false);
                    setDisablePassword('');
                    setDisableError('');
                  }}
                  className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setDisabling(true)}
              className="mt-4 rounded-sm border border-line px-4 py-2 text-sm text-alert hover:border-alert/60"
            >
              Disable two-factor authentication
            </button>
          )
        ) : settingUp ? (
          <div className="mt-4 space-y-4">
            {qrCodeDataUrl ? (
              <>
                <div className="flex justify-center rounded-sm border border-line bg-ink p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeDataUrl} alt="Two-factor setup QR code" className="h-40 w-40" />
                </div>
                <p className="text-xs text-mist">
                  Scan this with your authenticator app. Can&apos;t scan it? Enter this key manually:
                </p>
                <p className="select-all rounded-sm border border-line bg-ink px-3 py-2 font-mono text-xs text-paper">
                  {secret}
                </p>
                <form onSubmit={handleVerify} className="space-y-3" autoComplete="off">
                  <label className="block text-xs text-mist">Enter the 6-digit code to confirm</label>
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setVerifyError('')}
                    placeholder="123456"
                    className="w-full rounded-sm border border-line bg-ink px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-paper outline-none focus:border-signal"
                  />
                  {verifyError && <Alert variant="error">{verifyError}</Alert>}
                  <div className="flex gap-2">
                    <button
                      disabled={verifySubmitting || verifyCode.length !== 6}
                      className="flex flex-1 items-center justify-center gap-2 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90 disabled:opacity-60"
                    >
                      {verifySubmitting && <Spinner className="h-4 w-4" />}
                      Verify &amp; enable
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSettingUp(false);
                        setQrCodeDataUrl('');
                        setSecret('');
                        setVerifyCode('');
                        setVerifyError('');
                      }}
                      className="flex-1 rounded-sm border border-line px-4 py-2 text-sm text-mist hover:text-paper"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <p className="mt-4 font-mono text-xs text-mist">Generating your QR code…</p>
            )}
          </div>
        ) : (
          <button
            onClick={startSetup}
            className="mt-4 rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
          >
            Set up two-factor authentication
          </button>
        )}
      </section>
    </div>
  );
}