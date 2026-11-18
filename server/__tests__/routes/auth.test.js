const request = require('supertest');
const app = require('../../src/app');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const supabase = require('../../src/config/supabase');
const { maskEmail, generateUniqueSlug } = require('../../src/utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../src/config/mailjet');
const requireAuth = require('../../src/middleware/auth');

// Mock all dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('otplib');
jest.mock('qrcode');
jest.mock('../../src/config/supabase');
jest.mock('../../src/utils/helpers');
jest.mock('../../src/config/mailjet');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-id';
process.env.CLIENT_URL = 'http://localhost:3000';

describe('Auth Routes', () => {
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      email_verified: true,
      two_factor_enabled: false,
      two_factor_secret: null,
      verification_token_hash: null,
      verification_token_expires: null,
      reset_token_hash: null,
      reset_token_expires: null,
    };

    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);

    jwt.sign.mockReturnValue('mock_jwt_token');
    jwt.verify.mockImplementation((token) => {
      if (token === 'valid_temp_token') {
        return { userId: mockUser.id, purpose: '2fa-pending' };
      }
      throw new Error('Invalid token');
    });

    generateUniqueSlug.mockResolvedValue('my-workspace-abc123');

    authenticator.generateSecret.mockReturnValue('SECRET123');
    authenticator.verify.mockReturnValue(true);

    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqr');

    sendVerificationEmail.mockResolvedValue({});
    sendPasswordResetEmail.mockResolvedValue({});

    requireAuth.mockImplementation((req, res, next) => {
      req.user = { userId: mockUser.id, email: mockUser.email };
      next();
    });

    // Default supabase mock with all methods
    const defaultChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
    };
    supabase.from.mockReturnValue(defaultChain);
  });

  // -------- SIGNUP --------
  describe('POST /api/auth/signup', () => {
    it('should return 400 if email or password missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing fields');
    });

    it('should return 400 if password too short', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Password must be at least 8 characters');
    });

    it('should return 409 if user already exists', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null }),
      });
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', password: 'password123' });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'User already exists');
    });

    it('should create user and return 201', async () => {
      // Mock the entire chain for user creation
      const mockNewUser = { id: 'new-user-id', email: 'new@example.com' };
      const insertChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockNewUser, error: null }),
      };
      const updateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const companyChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'company-id', slug: 'my-workspace-abc123' },
          error: null,
        }),
      };
      const memberChain = {
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };

      // Override supabase.from for different tables
      supabase.from.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockReturnValue(insertChain),
            update: jest.fn().mockReturnValue(updateChain),
          };
        }
        if (table === 'companies') {
          return {
            insert: jest.fn().mockReturnValue(companyChain),
          };
        }
        if (table === 'company_members') {
          return {
            insert: jest.fn().mockReturnValue(memberChain),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
          insert: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
        };
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'new@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('email', 'new@example.com');
      expect(sendVerificationEmail).toHaveBeenCalled();
    }, 10000);
  });

  // -------- VERIFY EMAIL --------
  describe('GET /api/auth/verify-email/:token', () => {
    it('should return 400 if token invalid', async () => {
      supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const res = await request(app).get('/api/auth/verify-email/invalidtoken');
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Invalid verification link.');
    });

    it('should login if already verified', async () => {
      const verifiedUser = { ...mockUser, email_verified: true };
      supabase.from().single.mockResolvedValue({ data: verifiedUser, error: null });
      const res = await request(app).get('/api/auth/verify-email/validtoken');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Email already verified. You are now logged in.');
    });

    it('should verify email and login', async () => {
      const unverifiedUser = { ...mockUser, email_verified: false, verification_token_expires: new Date(Date.now() + 3600000).toISOString() };
      supabase.from().single.mockResolvedValue({ data: unverifiedUser, error: null });
      supabase.from().update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const res = await request(app).get('/api/auth/verify-email/validtoken');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Email verified successfully. You are now logged in.');
    });
  });

  // -------- RESEND VERIFICATION --------
  describe('POST /api/auth/resend-verification', () => {
    it('should return 400 if no email', async () => {
      const res = await request(app).post('/api/auth/resend-verification').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email is required');
    });

    it('should return 404 if user not found', async () => {
      supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'No account found with that email.');
    });

    it('should return 200 if email already verified', async () => {
      const verifiedUser = { ...mockUser, email_verified: true };
      supabase.from().single.mockResolvedValue({ data: verifiedUser, error: null });
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'This email is already verified. You can log in.');
    });

    it('should resend verification email', async () => {
      const unverifiedUser = { ...mockUser, email_verified: false };
      supabase.from().single.mockResolvedValue({ data: unverifiedUser, error: null });
      supabase.from().update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Verification email sent. Check your inbox.');
      expect(sendVerificationEmail).toHaveBeenCalled();
    });
  });

  // -------- LOGIN --------
  describe('POST /api/auth/login', () => {
    it('should return 400 if missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing fields');
    });

    it('should return 401 if user not found', async () => {
      supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'notfound@example.com', password: 'password' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 403 if email not verified', async () => {
      const unverifiedUser = { ...mockUser, email_verified: false };
      supabase.from().single.mockResolvedValue({ data: unverifiedUser, error: null });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', expect.stringContaining('verify your email'));
    });

    it('should return 401 if password incorrect', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 2fa temp token if 2fa enabled', async () => {
      const twoFaUser = { ...mockUser, two_factor_enabled: true };
      supabase.from().single.mockResolvedValue({ data: twoFaUser, error: null });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correct' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('requires2fa', true);
      expect(res.body).toHaveProperty('tempToken');
      expect(jwt.sign).toHaveBeenCalled();
    });

    it('should login and set cookie on success', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correct' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  // -------- LOGIN 2FA --------
  describe('POST /api/auth/login/2fa', () => {
    it('should return 400 if missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: 'valid_temp_token' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing verification code');
    });

    it('should return 401 if temp token invalid', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid'); });
      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: 'invalid', code: '123456' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'That verification step expired. Please log in again.');
    });

    it('should return 401 if 2fa not set up', async () => {
      const no2faUser = { ...mockUser, two_factor_enabled: false };
      supabase.from().single.mockResolvedValue({ data: no2faUser, error: null });
      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: 'valid_temp_token', code: '123456' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Two-factor authentication is not set up for this account');
    });

    it('should return 401 if code invalid', async () => {
      authenticator.verify.mockReturnValue(false);
      const twoFaUser = { ...mockUser, two_factor_enabled: true, two_factor_secret: 'SECRET' };
      supabase.from().single.mockResolvedValue({ data: twoFaUser, error: null });
      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: 'valid_temp_token', code: '000000' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid code. Check your authenticator app and try again.');
    });

    it('should login and set cookie on success', async () => {
      const twoFaUser = { ...mockUser, two_factor_enabled: true, two_factor_secret: 'SECRET' };
      supabase.from().single.mockResolvedValue({ data: twoFaUser, error: null });
      const res = await request(app)
        .post('/api/auth/login/2fa')
        .send({ tempToken: 'valid_temp_token', code: '123456' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  // -------- GOOGLE --------
  describe('POST /api/auth/google', () => {
    it('should return 400 if no credential', async () => {
      const res = await request(app).post('/api/auth/google').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing Google credential');
    });
  });

  // -------- FORGOT PASSWORD --------
  describe('POST /api/auth/forgot-password', () => {
    it('should return generic response even if email missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'If that email has an account, a reset link has been sent.');
    });

    it('should return generic response if user not found', async () => {
      supabase.from().single.mockResolvedValue({ data: null, error: null });
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'If that email has an account, a reset link has been sent.');
    });

    it('should send reset email', async () => {
      supabase.from().single.mockResolvedValue({ data: mockUser, error: null });
      supabase.from().update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  // -------- RESET PASSWORD --------
  describe('POST /api/auth/reset-password', () => {
    it('should return 400 if missing token or password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'newpass' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Missing token or new password');
    });

    it('should return 400 if password too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Password must be at least 8 characters');
    });

    it('should return 400 if token invalid', async () => {
      supabase.from().single.mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid', password: 'newpassword123' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'This reset link is invalid. Request a new one.');
    });

    it('should return 400 if token expired', async () => {
      const expiredUser = { ...mockUser, reset_token_expires: new Date(Date.now() - 3600000).toISOString() };
      supabase.from().single.mockResolvedValue({ data: expiredUser, error: null });
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid', password: 'newpassword123' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'This reset link has expired. Request a new one.');
    });

    it('should reset password successfully', async () => {
      const validUser = { ...mockUser, reset_token_expires: new Date(Date.now() + 3600000).toISOString() };
      supabase.from().single.mockResolvedValue({ data: validUser, error: null });
      supabase.from().update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'valid', password: 'newpassword123' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Password updated. You can now log in.');
    });
  });

  // -------- LOGOUT --------
  describe('POST /api/auth/logout', () => {
    it('should clear cookie and return message', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logged out');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  // -------- ME --------
  describe('GET /api/auth/me', () => {
    it('should return user info if authenticated', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('userId', mockUser.id);
      expect(res.body.user).toHaveProperty('email', mockUser.email);
    });
  });

  // -------- UPDATE EMAIL --------
  describe('PATCH /api/auth/email', () => {
    it('should return 400 if email missing', async () => {
      const res = await request(app)
        .patch('/api/auth/email')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Email is required');
    });

    it('should return 409 if email already in use', async () => {
      const selectChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'other' }, error: null }),
      };
      supabase.from.mockReturnValue(selectChain);

      const res = await request(app)
        .patch('/api/auth/email')
        .send({ email: 'existing@example.com' });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'That email is already in use');
    }, 10000);

    it('should update email and clear cookie', async () => {
      const updateChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockReturnValue(updateChain),
      };
      supabase.from.mockReturnValue(chain);

      const res = await request(app)
        .patch('/api/auth/email')
        .send({ email: 'new@example.com' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Email updated. Please log in again.');
      expect(res.headers['set-cookie']).toBeDefined();
    }, 10000);
  });

  // -------- 2FA endpoints --------
  describe('2FA endpoints', () => {
    describe('GET /api/auth/2fa/status', () => {
      it('should return 2fa status', async () => {
        supabase.from().single.mockResolvedValue({ data: { two_factor_enabled: true, two_factor_prompted: false }, error: null });
        const res = await request(app).get('/api/auth/2fa/status');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('enabled', true);
        expect(res.body).toHaveProperty('prompted', false);
      });
    });

    describe('POST /api/auth/2fa/dismiss-prompt', () => {
      it('should dismiss prompt', async () => {
        supabase.from().update.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const res = await request(app).post('/api/auth/2fa/dismiss-prompt');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('prompted', true);
      });
    });

    describe('POST /api/auth/2fa/setup', () => {
      it('should generate secret and QR code', async () => {
        supabase.from().update.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const res = await request(app).post('/api/auth/2fa/setup');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('secret');
        expect(res.body).toHaveProperty('qrCodeDataUrl');
      });
    });

    describe('POST /api/auth/2fa/verify', () => {
      it('should return 400 if missing code', async () => {
        const res = await request(app).post('/api/auth/2fa/verify').send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Enter the 6-digit code from your authenticator app');
      });

      it('should return 400 if no secret found', async () => {
        supabase.from().single.mockResolvedValue({ data: { two_factor_secret: null }, error: null });
        const res = await request(app)
          .post('/api/auth/2fa/verify')
          .send({ code: '123456' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Start setup first before verifying a code');
      });

      it('should return 400 if invalid code', async () => {
        authenticator.verify.mockReturnValue(false);
        supabase.from().single.mockResolvedValue({ data: { two_factor_secret: 'SECRET' }, error: null });
        const res = await request(app)
          .post('/api/auth/2fa/verify')
          .send({ code: '000000' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Invalid code. Check your authenticator app and try again.');
      });

      it('should enable 2fa on valid code', async () => {
        supabase.from().single.mockResolvedValue({ data: { two_factor_secret: 'SECRET' }, error: null });
        supabase.from().update.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const res = await request(app)
          .post('/api/auth/2fa/verify')
          .send({ code: '123456' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('enabled', true);
      });
    });

    describe('POST /api/auth/2fa/disable', () => {
      it('should return 400 if missing password', async () => {
        const res = await request(app).post('/api/auth/2fa/disable').send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Confirm your password to disable two-factor authentication');
      });

      it('should return 401 if password incorrect', async () => {
        bcrypt.compare.mockResolvedValue(false);
        supabase.from().single.mockResolvedValue({ data: { password_hash: 'hashed' }, error: null });
        const res = await request(app)
          .post('/api/auth/2fa/disable')
          .send({ password: 'wrong' });
        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', 'Incorrect password');
      });

      it('should disable 2fa on correct password', async () => {
        bcrypt.compare.mockResolvedValue(true);
        supabase.from().single.mockResolvedValue({ data: { password_hash: 'hashed' }, error: null });
        supabase.from().update.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        });
        const res = await request(app)
          .post('/api/auth/2fa/disable')
          .send({ password: 'correct' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('enabled', false);
      });
    });
  });

  // -------- CLI endpoints --------
  describe('CLI endpoints', () => {
    describe('POST /api/auth/cli/initiate', () => {
      it('should return code and deviceCode', async () => {
        const res = await request(app).post('/api/auth/cli/initiate');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('userCode');
        expect(res.body).toHaveProperty('deviceCode');
        expect(res.body).toHaveProperty('expiresIn');
      });
    });

    describe('POST /api/auth/cli/approve', () => {
      it('should return 404 if code not found', async () => {
        const res = await request(app)
          .post('/api/auth/cli/approve')
          .send({ code: 'invalid' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'Invalid or expired code');
      });

      it('should approve a pending request', async () => {
        const initRes = await request(app).post('/api/auth/cli/initiate');
        const { userCode, deviceCode } = initRes.body;

        const approveRes = await request(app)
          .post('/api/auth/cli/approve')
          .send({ code: userCode });
        expect(approveRes.status).toBe(200);
        expect(approveRes.body).toHaveProperty('success', true);

        const statusRes = await request(app).get(`/api/auth/cli/status/${deviceCode}`);
        expect(statusRes.status).toBe(200);
        expect(statusRes.body).toHaveProperty('status', 'approved');
        expect(statusRes.body).toHaveProperty('token');
      });
    });

    describe('GET /api/auth/cli/status/:deviceCode', () => {
      it('should return 404 for invalid deviceCode', async () => {
        const res = await request(app).get('/api/auth/cli/status/invalid');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'Invalid device code');
      });

      it('should return pending status', async () => {
        const initRes = await request(app).post('/api/auth/cli/initiate');
        const { deviceCode } = initRes.body;
        const statusRes = await request(app).get(`/api/auth/cli/status/${deviceCode}`);
        expect(statusRes.status).toBe(200);
        expect(statusRes.body).toHaveProperty('status', 'pending');
      });
    });
  });
});