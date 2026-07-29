const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { maskEmail, generateUniqueSlug } = require('../utils/helpers');
const logger = require('../utils/logger');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../config/mailjet');
const { logAuditEvent } = require('../utils/audit');
const {
  LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SIGNUP,
  PASSWORD_RESET, PASSWORD_CHANGED, EMAIL_CHANGED,
  TWO_FACTOR_ENABLED, TWO_FACTOR_DISABLED
} = require('../constants/auditActions');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

const pendingCliRequests = new Map();

// Helper to issue session cookie with is_admin
async function issueSessionCookie(res, user) {
  let isAdmin = user.is_admin || false;
  if (user.is_admin === undefined) {
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!error && data) {
      isAdmin = data.is_admin || false;
    }
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email, is_admin: isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, COOKIE_OPTIONS);
}

async function createDefaultCompany(userId) {
  let slug;
  try {
    slug = await generateUniqueSlug('My Workspace', 'companies');
  } catch (err) {
    logger.error({ userId, error: err.message }, 'Failed to generate slug for default company');
    slug = `my-workspace-${Date.now()}`;
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: 'My Workspace',
      slug,
      created_by: userId,
    })
    .select()
    .single();

  if (companyError) {
    logger.error({ userId, error: companyError.message }, 'Failed to create default company');
    return;
  }

  const { error: memberError } = await supabase
    .from('company_members')
    .insert({ company_id: company.id, user_id: userId, role: 'admin' });
  if (memberError) {
    logger.error(
      { userId, companyId: company.id, error: memberError.message },
      'Failed to add default company membership'
    );
  }
}

// --- SIGNUP ---
router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const maskedEmail = maskEmail(email);
  logger.info({ email: maskedEmail }, `Signup attempt for ${maskedEmail}`);

  if (!email || !password) {
    logger.warn({ email: maskedEmail }, 'Signup missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (password.length < 8) {
    logger.warn({ email: maskedEmail }, 'Signup password too short');
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    logger.warn({ email: maskedEmail }, 'Signup failed - user already exists');
    return res.status(409).json({ error: 'User already exists' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email, password_hash, email_verified: false })
    .select('id, email')
    .single();

  if (error) {
    logger.error({ email: maskedEmail, error: error.message }, 'Signup Supabase insert error');
    return res.status(500).json({ error: error.message });
  }

  // generate verification token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

  const { error: tokenError } = await supabase
    .from('users')
    .update({
      verification_token_hash: tokenHash,
      verification_token_expires: expiresAt.toISOString(),
    })
    .eq('id', user.id);

  if (tokenError) {
    logger.error({ userId: user.id, error: tokenError.message }, 'Failed to save verification token');
  }

  // send verification email
  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;
  try {
    await sendVerificationEmail({ toEmail: user.email, verificationLink });
    logger.info({ userId: user.id, email: maskedEmail }, 'Verification email sent');
  } catch (mailError) {
    logger.error({ userId: user.id, error: mailError.message }, 'Failed to send verification email');
  }

  await createDefaultCompany(user.id);

  // AUDIT: Signup
  logAuditEvent({
    actorId: user.id,
    action: SIGNUP,
    resourceType: 'user',
    resourceId: user.id,
    req,
  });

  logger.info({ userId: user.id, email: maskedEmail }, 'User signed up, verification email sent');
  res.status(201).json({
    message: 'Account created. Please verify your email address. Check your inbox for a verification link.',
    email: user.email,
  });
});

// --- VERIFY EMAIL ---
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, email_verified, verification_token_expires')
    .eq('verification_token_hash', tokenHash)
    .single();

  if (error || !user) {
    return res.status(400).json({ error: 'Invalid verification link.' });
  }

  if (user.email_verified) {
    await issueSessionCookie(res, { id: user.id, email: user.email });
    return res.json({ message: 'Email already verified. You are now logged in.' });
  }

  if (new Date(user.verification_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired. Request a new one.' });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ email_verified: true })
    .eq('id', user.id);

  if (updateError) {
    return res.status(500).json({ error: 'Could not verify email. Please try again.' });
  }

  await issueSessionCookie(res, { id: user.id, email: user.email });
  res.json({ message: 'Email verified successfully. You are now logged in.' });
});

// --- RESEND VERIFICATION ---
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const maskedEmail = maskEmail(email);
  logger.info({ email: maskedEmail }, 'Resend verification requested');

  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .eq('email', email.trim())
    .single();

  if (error || !user) {
    logger.info({ email: maskedEmail }, 'Resend verification - user not found');
    return res.status(404).json({ error: 'No account found with that email.' });
  }

  if (user.email_verified) {
    return res.json({ message: 'This email is already verified. You can log in.' });
  }

  // Generate new token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

  const { error: tokenError } = await supabase
    .from('users')
    .update({
      verification_token_hash: tokenHash,
      verification_token_expires: expiresAt.toISOString(),
    })
    .eq('id', user.id);

  if (tokenError) {
    logger.error({ userId: user.id, error: tokenError.message }, 'Failed to update verification token');
    return res.status(500).json({ error: 'Could not send verification email. Please try again later.' });
  }

  const verificationLink = `${process.env.CLIENT_URL}/verify-email/${token}`;
  try {
    await sendVerificationEmail({ toEmail: user.email, verificationLink });
    logger.info({ userId: user.id, email: maskedEmail }, 'Verification email resent');
    res.json({ message: 'Verification email sent. Check your inbox.' });
  } catch (mailError) {
    logger.error({ userId: user.id, error: mailError.message }, 'Failed to send verification email');
    res.status(500).json({ error: 'Could not send email. Please try again later.' });
  }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const maskedEmail = maskEmail(email);
  logger.info({ email: maskedEmail }, `Login attempt for ${maskedEmail}`);

  if (!email || !password) {
    logger.warn({ email: maskedEmail }, 'Login missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    logger.warn({ email: maskedEmail }, 'Login failed - user not found');
    // AUDIT: failed login
    logAuditEvent({
      actorId: null,
      action: LOGIN_FAILED,
      metadata: { email: maskedEmail },
      req,
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.email_verified) {
    logger.warn({ userId: user.id, email: maskedEmail }, 'Login blocked - email not verified');
    return res.status(403).json({
      error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
      needsVerification: true,
    });
  }

  if (!user.password_hash) {
    logger.warn({ userId: user.id, email: maskedEmail }, 'Login failed - Google-only account');
    return res.status(401).json({ error: 'This account signs in with Google. Use "Continue with Google" below.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logger.warn({ userId: user.id, email: maskedEmail }, 'Login failed - invalid password');
    // AUDIT: failed login
    logAuditEvent({
      actorId: user.id,
      action: LOGIN_FAILED,
      metadata: { email: maskedEmail },
      req,
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.two_factor_enabled) {
    const tempToken = jwt.sign(
      { userId: user.id, purpose: '2fa-pending' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    logger.info({ userId: user.id, email: maskedEmail }, '2FA pending - temp token issued');
    return res.json({ requires2fa: true, tempToken });
  }

  // AUDIT: login success
  logAuditEvent({
    actorId: user.id,
    action: LOGIN_SUCCESS,
    resourceType: 'user',
    resourceId: user.id,
    req,
  });

  await issueSessionCookie(res, user);
  logger.info({ userId: user.id, email: maskedEmail }, 'User logged in successfully');
  res.json({ user: { id: user.id, email: user.email } });
});

// --- LOGIN 2FA ---
router.post('/login/2fa', async (req, res) => {
  const { tempToken, code } = req.body;
  logger.info({ hasTempToken: !!tempToken }, '2FA verification attempt');

  if (!tempToken || !code) {
    logger.warn('2FA verification missing fields');
    return res.status(400).json({ error: 'Missing verification code' });
  }

  let payload;
  try {
    payload = jwt.verify(tempToken, process.env.JWT_SECRET);
  } catch (err) {
    logger.warn({ error: err.message }, '2FA temp token invalid/expired');
    return res.status(401).json({ error: 'That verification step expired. Please log in again.' });
  }
  if (payload.purpose !== '2fa-pending') {
    logger.warn({ payloadPurpose: payload.purpose }, '2FA temp token invalid purpose');
    return res.status(401).json({ error: 'Invalid verification token' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, two_factor_secret, two_factor_enabled')
    .eq('id', payload.userId)
    .single();

  if (error || !user || !user.two_factor_enabled || !user.two_factor_secret) {
    logger.warn({ userId: payload.userId, error: error?.message }, '2FA user not properly set up');
    return res.status(401).json({ error: 'Two-factor authentication is not set up for this account' });
  }

  const isValid = authenticator.verify({ token: String(code).trim(), secret: user.two_factor_secret });
  if (!isValid) {
    logger.warn({ userId: user.id, email: maskEmail(user.email) }, '2FA invalid code');
    return res.status(401).json({ error: 'Invalid code. Check your authenticator app and try again.' });
  }

  // AUDIT: login success after 2FA
  logAuditEvent({
    actorId: user.id,
    action: LOGIN_SUCCESS,
    resourceType: 'user',
    resourceId: user.id,
    req,
  });

  await issueSessionCookie(res, user);
  logger.info({ userId: user.id, email: maskEmail(user.email) }, '2FA successful - session issued');
  res.json({ user: { id: user.id, email: user.email } });
});

// --- Google OAuth ---
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Missing Google credential' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    logger.warn({ error: err.message }, 'Google token verification failed');
    return res.status(401).json({ error: 'Could not verify Google sign-in' });
  }

  if (!payload?.email_verified) {
    return res.status(401).json({ error: 'Google account email is not verified' });
  }

  const email = payload.email;
  const googleId = payload.sub;
  const maskedEmail = maskEmail(email);

  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, google_id')
    .eq('email', email)
    .single();

  let user;
  if (existingUser) {
    user = existingUser;
    if (!existingUser.google_id) {
      // Same email signed up with a password before - link the Google account.
      await supabase.from('users').update({ google_id: googleId }).eq('id', existingUser.id);
    }
    // AUDIT: login success via Google
    logAuditEvent({
      actorId: user.id,
      action: LOGIN_SUCCESS,
      resourceType: 'user',
      resourceId: user.id,
      req,
    });
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({ email, google_id: googleId, password_hash: null })
      .select('id, email')
      .single();

    if (error) {
      logger.error({ email: maskedEmail, error: error.message }, 'Google signup Supabase insert error');
      return res.status(500).json({ error: error.message });
    }
    user = created;
    await createDefaultCompany(user.id);
    // AUDIT: signup via Google
    logAuditEvent({
      actorId: user.id,
      action: SIGNUP,
      resourceType: 'user',
      resourceId: user.id,
      req,
    });
    // Also log login success
    logAuditEvent({
      actorId: user.id,
      action: LOGIN_SUCCESS,
      resourceType: 'user',
      resourceId: user.id,
      req,
    });
    logger.info({ userId: user.id, email: maskedEmail }, 'New user created via Google sign-in');
  }

  await issueSessionCookie(res, user);
  logger.info({ userId: user.id, email: maskedEmail }, 'User signed in via Google');
  res.json({ user: { id: user.id, email: user.email } });
});

// --- Password reset ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const maskedEmail = maskEmail(email);
  logger.info({ email: maskedEmail }, 'Password reset requested');

  const genericResponse = { message: 'If that email has an account, a reset link has been sent.' };

  if (!email?.trim()) return res.json(genericResponse);

  const { data: user } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email.trim())
    .single();

  if (!user || !user.password_hash) {
    logger.info({ email: maskedEmail }, 'Password reset - no resettable account (silent)');
    return res.json(genericResponse);
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  const { error } = await supabase
    .from('users')
    .update({ reset_token_hash: tokenHash, reset_token_expires: expiresAt.toISOString() })
    .eq('id', user.id);

  if (error) {
    logger.error({ userId: user.id, error: error.message }, 'Password reset token save error');
    return res.json(genericResponse);
  }

  const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;
  try {
    await sendPasswordResetEmail({ toEmail: user.email, resetLink });
    logger.info({ userId: user.id, email: maskedEmail }, 'Password reset email sent');
  } catch (mailError) {
    logger.error({ userId: user.id, error: mailError.message }, 'Password reset email failed to send');
  }

  res.json(genericResponse);
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Missing token or new password' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, reset_token_expires')
    .eq('reset_token_hash', tokenHash)
    .single();

  if (error || !user) {
    logger.warn('Password reset - invalid token');
    return res.status(400).json({ error: 'This reset link is invalid. Request a new one.' });
  }
  if (new Date(user.reset_token_expires) < new Date()) {
    logger.warn({ userId: user.id }, 'Password reset - expired token');
    return res.status(400).json({ error: 'This reset link has expired. Request a new one.' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash, reset_token_hash: null, reset_token_expires: null })
    .eq('id', user.id);

  if (updateError) {
    logger.error({ userId: user.id, error: updateError.message }, 'Password reset update error');
    return res.status(500).json({ error: updateError.message });
  }

  // AUDIT: password reset
  logAuditEvent({
    actorId: user.id,
    action: PASSWORD_RESET,
    resourceType: 'user',
    resourceId: user.id,
    req,
  });

  logger.info({ userId: user.id, email: maskEmail(user.email) }, 'Password reset successful');
  res.json({ message: 'Password updated. You can now log in.' });
});

// --- LOGOUT ---
router.post('/logout', async (req, res) => {
  const userId = req.user?.userId;
  if (userId) {
    logAuditEvent({
      actorId: userId,
      action: LOGOUT,
      resourceType: 'user',
      resourceId: userId,
      req,
    });
  }
  res.clearCookie('token', COOKIE_OPTIONS);
  logger.info({ ip: req.ip }, 'User logged out');
  res.json({ message: 'Logged out' });
});

// --- ME ---
router.get('/me', requireAuth, (req, res) => {
  logger.info({ userId: req.user.userId, email: maskEmail(req.user.email) }, 'Session check /me');
  res.json({ user: req.user });
});

// --- UPDATE EMAIL ---
router.patch('/email', requireAuth, async (req, res) => {
  const { email } = req.body;
  const newEmailMasked = maskEmail(email);
  logger.info(
    { userId: req.user.userId, currentEmail: maskEmail(req.user.email), newEmail: newEmailMasked },
    'Email update request'
  );

  if (!email?.trim()) {
    logger.warn({ userId: req.user.userId }, 'Email update missing email');
    return res.status(400).json({ error: 'Email is required' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.trim())
    .neq('id', req.user.userId)
    .single();

  if (existing) {
    logger.warn({ userId: req.user.userId, attemptedEmail: newEmailMasked }, 'Email update - email already in use');
    return res.status(409).json({ error: 'That email is already in use' });
  }

  const { error } = await supabase
    .from('users')
    .update({ email: email.trim() })
    .eq('id', req.user.userId);

  if (error) {
    logger.error({ userId: req.user.userId, error: error.message }, 'Email update Supabase error');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: email changed
  logAuditEvent({
    actorId: req.user.userId,
    action: EMAIL_CHANGED,
    resourceType: 'user',
    resourceId: req.user.userId,
    metadata: { oldEmail: maskEmail(req.user.email), newEmail: newEmailMasked },
    req,
  });

  res.clearCookie('token', COOKIE_OPTIONS);
  logger.info({ userId: req.user.userId, newEmail: newEmailMasked }, 'Email updated - cookie cleared, user must re-login');
  res.json({ message: 'Email updated. Please log in again.' });
});

// --- 2FA STATUS ---
router.get('/2fa/status', requireAuth, async (req, res) => {
  logger.info({ userId: req.user.userId }, '2FA status check');
  const { data, error } = await supabase
    .from('users')
    .select('two_factor_enabled, two_factor_prompted')
    .eq('id', req.user.userId)
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, error: error.message }, '2FA status Supabase error');
    return res.status(500).json({ error: error.message });
  }
  res.json({ enabled: !!data.two_factor_enabled, prompted: !!data.two_factor_prompted });
});

// --- 2FA DISMISS PROMPT ---
router.post('/2fa/dismiss-prompt', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('users')
    .update({ two_factor_prompted: true })
    .eq('id', req.user.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ prompted: true });
});

// --- 2FA SETUP ---
router.post('/2fa/setup', requireAuth, async (req, res) => {
  logger.info({ userId: req.user.userId, email: maskEmail(req.user.email) }, '2FA setup started');
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(req.user.email, 'EnvGuard', secret);

  const { error } = await supabase
    .from('users')
    .update({ two_factor_secret: secret, two_factor_enabled: false })
    .eq('id', req.user.userId);

  if (error) {
    logger.error({ userId: req.user.userId, error: error.message }, '2FA setup Supabase error');
    return res.status(500).json({ error: error.message });
  }

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  logger.info({ userId: req.user.userId }, '2FA setup completed - QR generated');
  res.json({ secret, qrCodeDataUrl });
});

// --- 2FA VERIFY ---
router.post('/2fa/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  logger.info({ userId: req.user.userId }, '2FA verification attempt');

  if (!code) {
    logger.warn({ userId: req.user.userId }, '2FA verify missing code');
    return res.status(400).json({ error: 'Enter the 6-digit code from your authenticator app' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('two_factor_secret')
    .eq('id', req.user.userId)
    .single();

  if (error || !user?.two_factor_secret) {
    logger.warn({ userId: req.user.userId, error: error?.message }, '2FA verify - no secret found');
    return res.status(400).json({ error: 'Start setup first before verifying a code' });
  }

  const isValid = authenticator.verify({ token: String(code).trim(), secret: user.two_factor_secret });
  if (!isValid) {
    logger.warn({ userId: req.user.userId }, '2FA verify - invalid code');
    return res.status(400).json({ error: 'Invalid code. Check your authenticator app and try again.' });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ two_factor_enabled: true })
    .eq('id', req.user.userId);

  if (updateError) {
    logger.error({ userId: req.user.userId, error: updateError.message }, '2FA verify - enable update error');
    return res.status(500).json({ error: updateError.message });
  }

  // AUDIT: 2FA enabled
  logAuditEvent({
    actorId: req.user.userId,
    action: TWO_FACTOR_ENABLED,
    resourceType: 'user',
    resourceId: req.user.userId,
    req,
  });

  logger.info({ userId: req.user.userId }, '2FA enabled successfully');
  res.json({ enabled: true });
});

// --- 2FA DISABLE ---
router.post('/2fa/disable', requireAuth, async (req, res) => {
  const { password } = req.body;
  logger.info({ userId: req.user.userId }, '2FA disable attempt');

  if (!password) {
    logger.warn({ userId: req.user.userId }, '2FA disable missing password');
    return res.status(400).json({ error: 'Confirm your password to disable two-factor authentication' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', req.user.userId)
    .single();

  if (error || !user) {
    logger.error({ userId: req.user.userId, error: error?.message }, '2FA disable - user lookup error');
    return res.status(500).json({ error: 'Could not verify your account' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    logger.warn({ userId: req.user.userId }, '2FA disable - incorrect password');
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ two_factor_enabled: false, two_factor_secret: null })
    .eq('id', req.user.userId);

  if (updateError) {
    logger.error({ userId: req.user.userId, error: updateError.message }, '2FA disable - update error');
    return res.status(500).json({ error: updateError.message });
  }

  // AUDIT: 2FA disabled
  logAuditEvent({
    actorId: req.user.userId,
    action: TWO_FACTOR_DISABLED,
    resourceType: 'user',
    resourceId: req.user.userId,
    req,
  });

  logger.info({ userId: req.user.userId }, '2FA disabled successfully');
  res.json({ enabled: false });
});

// --- CLI endpoints (unchanged) ---
router.post('/cli/initiate', async (req, res) => {
  const userCode = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  const deviceCode = crypto.randomBytes(16).toString('hex');
  pendingCliRequests.set(deviceCode, {
    userCode,
    status: 'pending',
    userId: null,
    createdAt: Date.now(),
  });
  res.json({ userCode, deviceCode, expiresIn: 600 });
});

router.post('/cli/approve', requireAuth, async (req, res) => {
  const { code } = req.body;
  for (const [deviceCode, data] of pendingCliRequests) {
    if (data.userCode === code && data.status === 'pending') {
      data.status = 'approved';
      data.userId = req.user.userId;
      return res.json({ success: true });
    }
  }
  res.status(404).json({ error: 'Invalid or expired code' });
});

router.get('/cli/status/:deviceCode', async (req, res) => {
  const { deviceCode } = req.params;
  const data = pendingCliRequests.get(deviceCode);

  if (!data) {
    return res.status(404).json({ error: 'Invalid device code' });
  }

  if (data.status === 'approved') {
    const { data: user, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', data.userId)
      .single();

    if (error || !user) {
      logger.error({ userId: data.userId, error: error?.message }, 'User not found for CLI token generation');
      return res.status(500).json({ error: 'User not found' });
    }

    const token = jwt.sign(
      { userId: data.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    pendingCliRequests.delete(deviceCode);

    return res.json({ status: 'approved', token });
  }

  if (data.status === 'pending') {
    return res.json({ status: 'pending' });
  }

  return res.json({ status: 'expired' });
});

module.exports = router;