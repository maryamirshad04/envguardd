process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

jest.mock('../../src/config/supabase');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../src/utils/helpers');

const request = require('supertest');
const app = require('../../src/app');
const supabase = require('../../src/config/supabase');
const requireAuth = require('../../src/middleware/auth');

describe('Invites Routes', () => {
  let mockUser;
  let mockInvite;
  let mockCompany;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = { userId: 'user123', email: 'invitee@example.com' };
    mockCompany = { id: 'company-123', name: 'Test Company' };
    mockInvite = {
      id: 'invite-123',
      email: 'invitee@example.com',
      role: 'member',
      status: 'pending',
      token: 'token123',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      company_id: mockCompany.id,
    };

    requireAuth.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  function chainWith(finalMethod, result) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    };
    chain[finalMethod] = jest.fn().mockResolvedValue(result);
    return chain;
  }

  // -------- GET /api/invites/:token --------
  describe('GET /api/invites/:token', () => {
    it('should return invite details when valid', async () => {
      const data = {
        id: mockInvite.id,
        email: mockInvite.email,
        role: mockInvite.role,
        status: mockInvite.status,
        expires_at: mockInvite.expires_at,
        companies: { name: mockCompany.name },
      };
      const chain = chainWith('single', { data, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get(`/api/invites/${mockInvite.token}`);
      expect(res.status).toBe(200);
      expect(res.body.invite).toHaveProperty('email', mockInvite.email);
      expect(res.body.invite).toHaveProperty('companyName', mockCompany.name);
    });

    it('should return 404 if invite not found', async () => {
      const chain = chainWith('single', { data: null, error: { message: 'Not found' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/invites/invalid');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Invite not found');
    });

    it('should return 410 if invite not pending', async () => {
      const data = { ...mockInvite, status: 'accepted' };
      const chain = chainWith('single', { data, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get(`/api/invites/${mockInvite.token}`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This invite is no longer valid');
    });

    it('should return 410 if invite expired', async () => {
      const data = { ...mockInvite, expires_at: new Date(Date.now() - 1000).toISOString() };
      const chain = chainWith('single', { data, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get(`/api/invites/${mockInvite.token}`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This invite has expired');
    });
  });

  // -------- POST /api/invites/:token/accept --------
  describe('POST /api/invites/:token/accept', () => {
    it('should accept invite and return companyId', async () => {
      // Invite lookup
      const inviteChain = chainWith('single', { data: mockInvite, error: null });
      // Member upsert
      const upsertChain = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
      // Invite update
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from
        .mockReturnValueOnce(inviteChain)         
        .mockReturnValueOnce(upsertChain)          
        .mockReturnValueOnce(updateChain);         

      const res = await request(app).post(`/api/invites/${mockInvite.token}/accept`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('companyId', mockCompany.id);
    });

    it('should return 403 if email mismatch', async () => {
      const inviteData = { ...mockInvite, email: 'different@example.com' };
      const chain = chainWith('single', { data: inviteData, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).post(`/api/invites/${mockInvite.token}/accept`);
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', expect.stringContaining('sent to different@example.com'));
    });

    it('should return 404 if invite not found', async () => {
      const chain = chainWith('single', { data: null, error: { message: 'Not found' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).post('/api/invites/invalid/accept');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Invite not found');
    });

    it('should return 410 if invite not pending', async () => {
      const inviteData = { ...mockInvite, status: 'accepted' };
      const chain = chainWith('single', { data: inviteData, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).post(`/api/invites/${mockInvite.token}/accept`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This invite is no longer valid');
    });

    it('should return 410 if invite expired', async () => {
      const inviteData = { ...mockInvite, expires_at: new Date(Date.now() - 1000).toISOString() };
      const chain = chainWith('single', { data: inviteData, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).post(`/api/invites/${mockInvite.token}/accept`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This invite has expired');
    });

    it('should return 500 if member upsert fails', async () => {
      const inviteChain = chainWith('single', { data: mockInvite, error: null });
      const upsertChain = {
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Upsert error' } }),
      };
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from
        .mockReturnValueOnce(inviteChain)
        .mockReturnValueOnce(upsertChain)
        .mockReturnValueOnce(updateChain);

      const res = await request(app).post(`/api/invites/${mockInvite.token}/accept`);
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Upsert error');
    });
  });
});