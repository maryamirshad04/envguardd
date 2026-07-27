process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key';

const supabase = require('../../src/config/supabase');
const logger = require('../../src/utils/logger');
const { requireMember, requireAdmin, resolveCompanyId, getMembership } = require('../../src/middleware/companyAccess');

jest.mock('../../src/config/supabase');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('Company Access Middleware', () => {
  let req, res, next;
  let mockSupabaseChain;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    supabase.from.mockReturnValue(mockSupabaseChain);

    req = {
      params: {},
      user: { userId: 'user123' },
      path: '/api/companies/test-company',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('resolveCompanyId', () => {
    it('should return identifier if it is a UUID', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = await resolveCompanyId(uuid);
      expect(result).toBe(uuid);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch company id by slug', async () => {
      const slug = 'test-company';
      mockSupabaseChain.single.mockResolvedValue({ data: { id: 'company-123' }, error: null });

      const result = await resolveCompanyId(slug);
      expect(result).toBe('company-123');
      expect(supabase.from).toHaveBeenCalledWith('companies');
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('id');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('slug', slug);
      expect(mockSupabaseChain.single).toHaveBeenCalled();
    });

    it('should return null if company not found', async () => {
      const slug = 'unknown';
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const result = await resolveCompanyId(slug);
      expect(result).toBeNull();
    });
  });

  describe('getMembership', () => {
    it('should return membership data on success', async () => {
      const membership = { role: 'admin' };
      mockSupabaseChain.single.mockResolvedValue({ data: membership, error: null });

      const result = await getMembership('company-123', 'user123');
      expect(result).toEqual(membership);
      expect(supabase.from).toHaveBeenCalledWith('company_members');
      expect(mockSupabaseChain.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('company_id', 'company-123');
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabaseChain.single).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { message: 'Error' } });

      const result = await getMembership('company-123', 'user123');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });

    it('should return null and log on unexpected error', async () => {
      supabase.from.mockImplementation(() => { throw new Error('Unexpected'); });

      const result = await getMembership('company-123', 'user123');
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unexpected' }),
        'Unexpected error in getMembership'
      );
    });
  });

  describe('requireMember', () => {
    it('should return 401 if userId missing', async () => {
      req.user = {};
      await requireMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized: missing user ID' });
      expect(logger.warn).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if company not found (slug)', async () => {
      req.params.companySlug = 'unknown';
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await requireMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Company not found' });
      expect(logger.warn).toHaveBeenCalledWith(
        { identifier: 'unknown', userId: 'user123' },
        'Company not found (slug/UUID)'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 if user not a member', async () => {
      req.params.companySlug = 'test-company';
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { id: 'company-123' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      await requireMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Company not found' });
      expect(logger.warn).toHaveBeenCalledWith(
        { companyId: 'company-123', userId: 'user123' },
        'User is not a member'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() and set req.companyId and req.membership on success', async () => {
      req.params.companySlug = 'test-company';
      const membership = { role: 'admin' };
      mockSupabaseChain.single
        .mockResolvedValueOnce({ data: { id: 'company-123' }, error: null })
        .mockResolvedValueOnce({ data: membership, error: null });

      await requireMember(req, res, next);
      expect(req.companyId).toBe('company-123');
      expect(req.membership).toEqual(membership);
      expect(next).toHaveBeenCalled();
    });

    it('should use req.params.companyId if companySlug not present', async () => {
      const companyId = '123e4567-e89b-12d3-a456-426614174000';
      req.params.companyId = companyId;
      const membership = { role: 'member' };
      mockSupabaseChain.single.mockResolvedValue({ data: membership, error: null });

      await requireMember(req, res, next);
      expect(req.companyId).toBe(companyId);
      expect(req.membership).toEqual(membership);
      expect(next).toHaveBeenCalled();
    });

    it('should return 500 on unexpected error', async () => {
      req.params.companySlug = 'test-company';
      supabase.from.mockImplementation(() => { throw new Error('DB error'); });

      await requireMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' });
      expect(logger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should return 403 if no membership', () => {
      req.membership = null;
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', () => {
      req.membership = { role: 'member' };
      requireAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user is admin', () => {
      req.membership = { role: 'admin' };
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});