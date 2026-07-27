process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-key';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:3000';

jest.setTimeout(30000);

const request = require('supertest');
const app = require('../../src/app');
const supabase = require('../../src/config/supabase');
const { encrypt, decrypt } = require('../../src/utils/crypto');
const { sendInviteEmail } = require('../../src/config/mailjet');
const { generateUniqueSlug } = require('../../src/utils/helpers');
const requireAuth = require('../../src/middleware/auth');
const { requireMember, requireAdmin } = require('../../src/middleware/companyAccess');

jest.mock('../../src/config/supabase');
jest.mock('../../src/utils/crypto');
jest.mock('../../src/config/mailjet');
jest.mock('../../src/utils/helpers');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/companyAccess');
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

function chainWith(method, result) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
  };
  chain[method] = jest.fn().mockResolvedValue(result);
  return chain;
}

describe('Companies Routes', () => {
  let mockUser;
  let mockCompany;
  let mockProject;
  let mockEnvironment;
  let mockVariable;
  let mockInvite;
  let mockMember;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = { userId: 'user123', email: 'test@example.com' };
    mockCompany = {
      id: 'company-123',
      name: 'Test Company',
      slug: 'test-company',
      created_at: '2025-01-01T00:00:00Z',
      created_by: mockUser.userId,
      role: 'admin',
    };
    mockProject = {
      id: 'project-123',
      name: 'Test Project',
      slug: 'test-project',
      company_id: mockCompany.id,
      created_at: '2025-01-01T00:00:00Z',
    };
    mockEnvironment = {
      id: 'env-123',
      name: 'development',
      project_id: mockProject.id,
      created_at: '2025-01-01T00:00:00Z',
    };
    mockVariable = {
      id: 'var-123',
      key: 'DB_URL',
      value_encrypted: 'encrypted_value',
      is_secret: false,
      updated_at: '2025-01-01T00:00:00Z',
    };
    mockInvite = {
      id: 'invite-123',
      email: 'invitee@example.com',
      role: 'member',
      status: 'pending',
      token: 'token123',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: '2025-01-01T00:00:00Z',
    };
    mockMember = {
      id: 'member-123',
      role: 'admin',
      joined_at: '2025-01-01T00:00:00Z',
      users: { id: 'user123', email: 'test@example.com' },
    };

    requireAuth.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    requireMember.mockImplementation((req, res, next) => {
      req.companyId = mockCompany.id;
      req.membership = { role: 'admin' };
      next();
    });

    requireAdmin.mockImplementation((req, res, next) => next());

    generateUniqueSlug.mockResolvedValue('test-company');
    encrypt.mockReturnValue('encrypted_value');
    decrypt.mockReturnValue('decrypted_value');
    sendInviteEmail.mockResolvedValue({});
  });

  describe('GET /api/companies', () => {
    it('should return user companies', async () => {
      const mockData = [{ companies: mockCompany, role: 'admin', joined_at: '2025-01-01' }];
      const chain = chainWith('eq', { data: mockData, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies');
      expect(res.status).toBe(200);
      expect(res.body.companies).toHaveLength(1);
      expect(res.body.companies[0].id).toBe(mockCompany.id);
      expect(res.body.companies[0].role).toBe('admin');
    });

    it('should return 500 on error', async () => {
      const chain = chainWith('eq', { data: null, error: { message: 'DB error' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'DB error');
    });
  });

  describe('POST /api/companies', () => {
    it('should return 400 if name missing', async () => {
      const res = await request(app).post('/api/companies').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Company name is required');
    });

    it('should create company and return 201', async () => {
      const companyChain = chainWith('single', { data: mockCompany, error: null });
      const memberChain = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from.mockImplementation((table) => {
        if (table === 'companies') return companyChain;
        if (table === 'company_members') return memberChain;
        return {};
      });

      const res = await request(app).post('/api/companies').send({ name: 'Test Company' });
      expect(res.status).toBe(201);
      expect(res.body.company).toHaveProperty('id', mockCompany.id);
      expect(res.body.company).toHaveProperty('role', 'admin');
      expect(generateUniqueSlug).toHaveBeenCalledWith('Test Company', 'companies');
    });

    it('should return 500 if company insert fails', async () => {
      const companyChain = chainWith('single', { data: null, error: { message: 'Insert error' } });
      supabase.from.mockReturnValue(companyChain);

      const res = await request(app).post('/api/companies').send({ name: 'Test' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Insert error');
    });
  });

  describe('GET /api/companies/:companySlug', () => {
    it('should return company details', async () => {
      const chain = chainWith('single', { data: mockCompany, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies/test-company');
      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('id', mockCompany.id);
      expect(res.body.company).toHaveProperty('role', 'admin');
      expect(requireMember).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/companies/:companySlug', () => {
    it('should return 400 if name missing', async () => {
      const res = await request(app).patch('/api/companies/test-company').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Company name is required');
    });

    it('should update company', async () => {
      const updatedCompany = { ...mockCompany, name: 'Updated Name' };
      const chain = chainWith('single', { data: updatedCompany, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).patch('/api/companies/test-company').send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.company).toHaveProperty('name', 'Updated Name');
      expect(requireAdmin).toHaveBeenCalled();
    });

    it('should return 500 on update error', async () => {
      const chain = chainWith('single', { data: null, error: { message: 'Update error' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).patch('/api/companies/test-company').send({ name: 'New' });
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Update error');
    });
  });

  describe('DELETE /api/companies/:companySlug', () => {
    it('should delete company', async () => {
      const chain = chainWith('eq', { error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).delete('/api/companies/test-company');
      expect(res.status).toBe(204);
      expect(requireAdmin).toHaveBeenCalled();
    });

    it('should return 500 on delete error', async () => {
      const chain = chainWith('eq', { error: { message: 'Delete error' } });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).delete('/api/companies/test-company');
      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Delete error');
    });
  });

  describe('GET /api/companies/:companySlug/members', () => {
    it('should return members', async () => {
      const members = [{ ...mockMember }];
      const chain = chainWith('eq', { data: members, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies/test-company/members');
      expect(res.status).toBe(200);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].email).toBe('test@example.com');
    });
  });

  describe('GET /api/companies/:companySlug/invites', () => {
    it('should return pending invites', async () => {
      const invites = [{ ...mockInvite }];
      const chain = chainWith('order', { data: invites, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies/test-company/invites');
      expect(res.status).toBe(200);
      expect(res.body.invites).toHaveLength(1);
      expect(res.body.invites[0].email).toBe('invitee@example.com');
    });
  });

  describe('POST /api/companies/:companySlug/invites', () => {
    it('should return 400 if email or role missing', async () => {
      const res = await request(app)
        .post('/api/companies/test-company/invites')
        .send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'A valid email and role (admin or member) are required');
    });

    it('should create invite and send email', async () => {
      const inviteChain = chainWith('single', { data: mockInvite, error: null });
      const companyChain = chainWith('single', { data: { name: 'Test Company' }, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'invites') return inviteChain;
        if (table === 'companies') return companyChain;
        return {};
      });

      const res = await request(app)
        .post('/api/companies/test-company/invites')
        .send({ email: 'invitee@example.com', role: 'member' });
      expect(res.status).toBe(201);
      expect(res.body.invite).toHaveProperty('id', mockInvite.id);
      expect(sendInviteEmail).toHaveBeenCalled();
    });

    it('should return warning if email fails', async () => {
      sendInviteEmail.mockRejectedValue(new Error('Email error'));
      const inviteChain = chainWith('single', { data: mockInvite, error: null });
      const companyChain = chainWith('single', { data: { name: 'Test Company' }, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'invites') return inviteChain;
        if (table === 'companies') return companyChain;
        return {};
      });

      const res = await request(app)
        .post('/api/companies/test-company/invites')
        .send({ email: 'invitee@example.com', role: 'member' });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('warning');
    });
  });

  describe('DELETE /api/companies/:companySlug/invites/:inviteId', () => {
    it('should revoke invite', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      let eqCalls = 0;
      chain.eq = jest.fn().mockImplementation(() => {
        eqCalls++;
        if (eqCalls === 2) {
          return Promise.resolve({ error: null });
        }
        return chain;
      });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).delete('/api/companies/test-company/invites/invite-123');
      expect(res.status).toBe(204);
    });
  });

  describe('GET /api/companies/:companySlug/projects', () => {
    it('should return projects', async () => {
      const projects = [{ ...mockProject }];
      const chain = chainWith('order', { data: projects, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies/test-company/projects');
      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].id).toBe(mockProject.id);
    });
  });

  describe('POST /api/companies/:companySlug/projects', () => {
    it('should return 400 if name missing', async () => {
      const res = await request(app).post('/api/companies/test-company/projects').send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Project name is required');
    });

    it('should create project and seed environments', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envInsert = jest.fn().mockResolvedValue({ error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'projects') return projectChain;
        if (table === 'environments') return { insert: envInsert };
        return {};
      });

      const res = await request(app)
        .post('/api/companies/test-company/projects')
        .send({ name: 'Test Project' });
      expect(res.status).toBe(201);
      expect(res.body.project).toHaveProperty('id', mockProject.id);
      expect(generateUniqueSlug).toHaveBeenCalledWith('Test Project', 'projects');
      expect(envInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: 'development' }),
          expect.objectContaining({ name: 'staging' }),
          expect.objectContaining({ name: 'production' }),
        ])
      );
    });
  });

  describe('GET /api/companies/:companySlug/projects/:projectSlug', () => {
    it('should return project with environments', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('order', { data: [mockEnvironment], error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app).get('/api/companies/test-company/projects/test-project');
      expect(res.status).toBe(200);
      expect(res.body.project).toHaveProperty('id', mockProject.id);
      expect(res.body.environments).toHaveLength(1);
      expect(res.body.environments[0].id).toBe(mockEnvironment.id);
    });

    it('should return 404 if project not found', async () => {
      const chain = chainWith('single', { data: null, error: null });
      supabase.from.mockReturnValue(chain);

      const res = await request(app).get('/api/companies/test-company/projects/unknown');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Project not found');
    });
  });

  describe('PATCH /api/companies/:companySlug/projects/:projectSlug', () => {
    it('should return 400 if name missing', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      supabase.from.mockReturnValue(projectChain);

      const res = await request(app)
        .patch('/api/companies/test-company/projects/test-project')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Project name is required');
    });

    it('should update project', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Project' };
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const updateChain = chainWith('single', { data: updatedProject, error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(updateChain);

      const res = await request(app)
        .patch('/api/companies/test-company/projects/test-project')
        .send({ name: 'Updated Project' });
      expect(res.status).toBe(200);
      expect(res.body.project).toHaveProperty('name', 'Updated Project');
    });
  });

  describe('DELETE /api/companies/:companySlug/projects/:projectSlug', () => {
    it('should delete project', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const deleteChain = chainWith('eq', { error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(deleteChain);

      const res = await request(app).delete('/api/companies/test-company/projects/test-project');
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/companies/:companySlug/projects/:projectSlug/environments', () => {
    it('should return 400 if name missing', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      supabase.from.mockReturnValue(projectChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Environment name is required');
    });

    it('should create environment', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments')
        .send({ name: 'development' });
      expect(res.status).toBe(201);
      expect(res.body.environment).toHaveProperty('id', mockEnvironment.id);
    });

    it('should return 409 if environment exists', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: null, error: { code: '23505', message: 'Duplicate' } });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments')
        .send({ name: 'development' });
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error', 'That environment already exists in this project');
    });
  });

  describe('GET /api/companies/:companySlug/projects/:projectSlug/environments', () => {
    it('should return environments', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('order', { data: [mockEnvironment], error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app).get('/api/companies/test-company/projects/test-project/environments');
      expect(res.status).toBe(200);
      expect(res.body.environments).toHaveLength(1);
    });
  });

  describe('GET /api/companies/:companySlug/projects/:projectSlug/environments/:envId/variables', () => {
    it('should return variables', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('order', { data: [mockVariable], error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain);

      const res = await request(app).get(
        '/api/companies/test-company/projects/test-project/environments/env-123/variables'
      );
      expect(res.status).toBe(200);
      expect(res.body.variables).toHaveLength(1);
      expect(res.body.variables[0].key).toBe('DB_URL');
      expect(decrypt).toHaveBeenCalled();
    });
  });

  describe('POST /api/companies/:companySlug/projects/:projectSlug/environments/:envId/variables', () => {
    it('should return 400 if key or value missing', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments/env-123/variables')
        .send({ key: 'TEST' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Both key and value are required');
    });

    it('should upsert variable', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('single', { data: mockVariable, error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments/env-123/variables')
        .send({ key: 'DB_URL', value: 'postgres://localhost', is_secret: false });
      expect(res.status).toBe(201);
      expect(res.body.variable).toHaveProperty('key', 'DB_URL');
      expect(encrypt).toHaveBeenCalledWith('postgres://localhost');
    });
  });

  describe('DELETE /api/companies/:companySlug/projects/:projectSlug/environments/:envId/variables/:varId', () => {
    it('should delete variable', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const deleteChain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      let eqCalls = 0;
      deleteChain.eq = jest.fn().mockImplementation(() => {
        eqCalls++;
        if (eqCalls === 2) {
          return Promise.resolve({ error: null });
        }
        return deleteChain;
      });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(deleteChain);

      const res = await request(app).delete(
        '/api/companies/test-company/projects/test-project/environments/env-123/variables/var-123'
      );
      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/companies/:companySlug/projects/:projectSlug/environments/:envId/variables/bulk', () => {
    it('should return 400 if no variables', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain);

      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments/env-123/variables/bulk')
        .send({ variables: [] });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'No variables to import');
    });

    it('should bulk import variables', async () => {
      const projectChain = chainWith('single', { data: mockProject, error: null });
      const envChain = chainWith('single', { data: mockEnvironment, error: null });
      const varChain = chainWith('select', {
        data: [
          { id: 'var-1', key: 'DB_URL', is_secret: true, updated_at: '2025-01-01' },
          { id: 'var-2', key: 'API_KEY', is_secret: true, updated_at: '2025-01-01' },
        ],
        error: null,
      });
      supabase.from
        .mockReturnValueOnce(projectChain)
        .mockReturnValueOnce(envChain)
        .mockReturnValueOnce(varChain);

      const mockVariables = [
        { key: 'DB_URL', value: 'postgres://localhost' },
        { key: 'API_KEY', value: 'secret' },
      ];
      const res = await request(app)
        .post('/api/companies/test-company/projects/test-project/environments/env-123/variables/bulk')
        .send({ variables: mockVariables });
      expect(res.status).toBe(201);
      expect(res.body.variables).toHaveLength(2);
      expect(encrypt).toHaveBeenCalledTimes(2);
    });
  });
});