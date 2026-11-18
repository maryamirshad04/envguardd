process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key';
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const { maskEmail } = require('../../src/utils/helpers');
const logger = require('../../src/utils/logger');
const requireAuth = require('../../src/middleware/auth');

jest.mock('jsonwebtoken');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../src/utils/helpers');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      cookies: {},
      headers: {},
      ip: '127.0.0.1',
      path: '/api/test',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    maskEmail.mockImplementation((email) => email.replace(/(.{3}).*(@.*)/, '$1***$2'));
  });

  describe('requireAuth', () => {
    it('should return 401 if no token provided', () => {
      requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(logger.warn).toHaveBeenCalledWith(
        { ip: req.ip, path: req.path },
        'Authentication failed: No token provided'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should extract token from cookies', () => {
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ id: 'user123', email: 'test@example.com' });

      requireAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual({ id: 'user123', email: 'test@example.com' });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          email: 'tes***@example.com',
        }),
        'User authenticated successfully'
      );
      expect(next).toHaveBeenCalled();
    });

    it('should extract token from Authorization header', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue({ id: 'user123', email: 'test@example.com' });

      requireAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual({ id: 'user123', email: 'test@example.com' });
      expect(next).toHaveBeenCalled();
    });

    it('should use cookies over Authorization header', () => {
      req.cookies.token = 'cookie-token';
      req.headers.authorization = 'Bearer header-token';
      jwt.verify.mockReturnValue({ id: 'user123', email: 'test@example.com' });

      requireAuth(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test-secret');
      expect(req.user).toEqual({ id: 'user123', email: 'test@example.com' });
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token verification fails (invalid signature)', () => {
      req.cookies.token = 'invalid-token';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw error; });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(logger.warn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token expired', () => {
      req.cookies.token = 'expired-token';
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => { throw error; });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(logger.warn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed token', () => {
      req.cookies.token = 'malformed';
      const error = new Error('Malformed');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw error; });

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should mask email in logs', () => {
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ id: 'user123', email: 'test@example.com' });
      maskEmail.mockReturnValue('tes***@example.com');

      requireAuth(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'tes***@example.com',
          userId: 'user123',
        }),
        'User authenticated successfully'
      );
    });

    it('should handle missing email in decoded token', () => {
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ id: 'user123' });

      requireAuth(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'unknown',
          userId: 'user123',
        }),
        'User authenticated successfully'
      );
      expect(next).toHaveBeenCalled();
    });

    it('should use decoded.sub if id not present', () => {
      req.cookies.token = 'valid-token';
      jwt.verify.mockReturnValue({ sub: 'user-sub', email: 'test@example.com' });

      requireAuth(req, res, next);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-sub',
          email: 'tes***@example.com',
        }),
        'User authenticated successfully'
      );
      expect(next).toHaveBeenCalled();
    });

    it('should log token preview on error', () => {
      req.cookies.token = 'invalid-token123';
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation(() => { throw error; });

      requireAuth(req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenPreview: 'invalid-to...', 
          error: 'Invalid token signature/malformed',
        }),
        'Authentication failed: Invalid token signature/malformed'
      );
    });
  });
});