process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

jest.mock('../../src/config/supabase');
jest.mock('../../src/utils/crypto');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const request = require('supertest');
const app = require('../../src/app');
const supabase = require('../../src/config/supabase');
const { encrypt, decrypt } = require('../../src/utils/crypto');
const requireAuth = require('../../src/middleware/auth');

describe('Share Routes', () => {
  let mockUser;
  let mockCompany;
  let mockProject;
  let mockEnvironment;
  let mockVariables;
  let mockSharedLink;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = { userId: 'user123', email: 'test@example.com' };
    mockCompany = { id: 'company-123' };
    mockProject = { id: 'project-123' };
    mockEnvironment = { id: 'env-123' };
    mockVariables = [
      { key: 'DB_URL', value_encrypted: 'enc1', is_secret: false },
      { key: 'API_KEY', value_encrypted: 'enc2', is_secret: true },
    ];
    mockSharedLink = {
      id: 'link-123',
      token: 'shareToken',
      encrypted_data: 'encryptedPayload',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      viewed: false,
    };

    requireAuth.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    encrypt.mockReturnValue('encryptedPayload');
    decrypt.mockImplementation((data) => {
      if (data === 'encryptedPayload') {
        return JSON.stringify(mockVariables.map(v => ({ key: v.key, value: 'decrypted', is_secret: v.is_secret })));
      }
      return 'decrypted';
    });
  });

  function chainWith(finalMethod, result) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };
    chain[finalMethod] = jest.fn().mockResolvedValue(result);
    return chain;
  }

  // -------- POST /api/share --------
  describe('POST /api/share', () => {
    it('should return 400 if expiry out of range', async () => {
      const res = await request(app)
        .post('/api/share')
        .send({ companyId: 'company-123', projectId: 'project-123', environmentId: 'env-123', expiryMinutes: 1 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Expiry must be between 5 and 10080 minutes');
    });

    it('should return 400 if missing required fields', async () => {
      const res = await request(app)
        .post('/api/share')
        .send({ companyId: 'company-123' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'companyId, projectId, and environmentId are required');
    });

    it('should return 404 if company not found', async () => {
      const companyChain = chainWith('single', { data: null, error: null });
      supabase.from.mockReturnValue(companyChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: 'invalid', projectId: 'project-123', environmentId: 'env-123' });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Company not found');
    });

    it('should return 404 if project not found', async () => {
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: null, error: null });
      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: 'invalid', environmentId: 'env-123' });
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Project not found');
    });

    it('should return 403 if no access to environment', async () => {
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const membershipChain = chainWith('single', { data: null, error: null });
      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(membershipChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: mockProject.id, environmentId: 'env-123' });
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error', 'You do not have access to this environment');
    });

    it('should generate share link and return URL', async () => {
      // We'll mock the sequence of calls
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const membershipChain = chainWith('single', { data: { role: 'admin' }, error: null });
      const projectCheckChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('order', { data: mockVariables, error: null });
      const insertChain = chainWith('single', { data: mockSharedLink, error: null });

      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(membershipChain)
        .mockReturnValueOnce(projectCheckChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain)
        .mockReturnValueOnce(insertChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: mockProject.id, environmentId: 'env-123' });
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^http:\/\/localhost:3000\/share\/[a-f0-9]{64}$/);
      expect(encrypt).toHaveBeenCalled();
    });

    it('should return 500 if fetching variables fails', async () => {
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const membershipChain = chainWith('single', { data: { role: 'admin' }, error: null });
      const projectCheckChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('order', { data: null, error: { message: 'DB error' } });

      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(membershipChain)
        .mockReturnValueOnce(projectCheckChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: mockProject.id, environmentId: 'env-123' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error');
    });

    it('should return 400 if no variables to share', async () => {
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const membershipChain = chainWith('single', { data: { role: 'admin' }, error: null });
      const projectCheckChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('order', { data: [], error: null });

      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(membershipChain)
        .mockReturnValueOnce(projectCheckChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: mockProject.id, environmentId: 'env-123' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No variables to share');
    });

    it('should return 500 if insert shared link fails', async () => {
      const companyChain = chainWith('single', { data: { id: mockCompany.id }, error: null });
      const projectChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const membershipChain = chainWith('single', { data: { role: 'admin' }, error: null });
      const projectCheckChain = chainWith('single', { data: { id: mockProject.id }, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('order', { data: mockVariables, error: null });
      const insertChain = chainWith('single', { data: null, error: { message: 'Insert error' } });

      supabase.from
        .mockReturnValueOnce(companyChain)
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(membershipChain)
        .mockReturnValueOnce(projectCheckChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain)
        .mockReturnValueOnce(insertChain);

      const res = await request(app)
        .post('/api/share')
        .send({ companyId: mockCompany.id, projectId: mockProject.id, environmentId: 'env-123' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Insert error');
    });
  });

  // -------- GET /api/share/:token --------
  describe('GET /api/share/:token', () => {
    it('should return variables when valid', async () => {
      const linkData = { ...mockSharedLink };
      const chain = chainWith('single', { data: linkData, error: null });
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(updateChain);

      const res = await request(app).get(`/api/share/${mockSharedLink.token}`);
      expect(res.status).toBe(200);
      expect(res.body.variables).toHaveLength(2);
      expect(res.body.variables[0]).toHaveProperty('key', 'DB_URL');
      expect(decrypt).toHaveBeenCalled();
    });

    it('should return 404 if link not found', async () => {
      const chain = chainWith('single', { data: null, error: { message: 'Not found' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/share/invalid');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Link not found');
    });

    it('should return 410 if link expired', async () => {
      const linkData = { ...mockSharedLink, expires_at: new Date(Date.now() - 1000).toISOString() };
      const chain = chainWith('single', { data: linkData, error: null });
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(deleteChain);

      const res = await request(app).get(`/api/share/${mockSharedLink.token}`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This link has expired');
    });

    it('should return 410 if link already viewed', async () => {
      const linkData = { ...mockSharedLink, viewed: true };
      const chain = chainWith('single', { data: linkData, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get(`/api/share/${mockSharedLink.token}`);
      expect(res.status).toBe(410);
      expect(res.body).toHaveProperty('error', 'This link has already been viewed');
    });

    it('should return 500 if decryption fails', async () => {
      const linkData = { ...mockSharedLink };
      const chain = chainWith('single', { data: linkData, error: null });
      const updateChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(updateChain);
      decrypt.mockImplementation(() => { throw new Error('Decryption error'); });

      const res = await request(app).get(`/api/share/${mockSharedLink.token}`);
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to decrypt data');
    });
  });
});