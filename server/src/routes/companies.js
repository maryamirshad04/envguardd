const express = require('express');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');
const { requireMember, requireAdmin } = require('../middleware/companyAccess');
const { encrypt, decrypt } = require('../utils/crypto');
const { sendInviteEmail } = require('../config/mailjet');
const logger = require('../utils/logger');
const { maskEmail, generateUniqueSlug } = require('../utils/helpers');
const { logAuditEvent } = require('../utils/audit');
const {
  SECRET_CREATED, SECRET_UPDATED, SECRET_DELETED, SECRET_IMPORTED,
  PROJECT_CREATED, PROJECT_DELETED,
  COMPANY_CREATED, COMPANY_DELETED,
  INVITE_SENT, INVITE_REVOKED,
  ENVIRONMENT_CREATED
} = require('../constants/auditActions');

const router = express.Router();
router.use(requireAuth);

// ---------- COMPANIES ----------
router.get('/', async (req, res) => {
  logger.info({ userId: req.user.userId }, 'Fetching user companies');

  const { data, error } = await supabase
    .from('company_members')
    .select('role, joined_at, companies(id, name, slug, created_at)')
    .eq('user_id', req.user.userId);

  if (error) {
    logger.error({ userId: req.user.userId, error: error.message }, 'Failed to fetch companies');
    return res.status(500).json({ error: error.message });
  }

  const companies = data
    .filter((row) => row.companies)
    .map((row) => ({ ...row.companies, role: row.role, joined_at: row.joined_at }));

  res.json({ companies });
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  logger.info({ userId: req.user.userId, companyName: name }, 'Creating new company');

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  let slug;
  try {
    slug = await generateUniqueSlug(name.trim(), 'companies');
  } catch (err) {
    logger.error({ userId: req.user.userId, error: err.message }, 'Slug generation failed');
    return res.status(500).json({ error: 'Failed to generate unique slug' });
  }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({ name: name.trim(), slug, created_by: req.user.userId })
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, error: error.message }, 'Failed to create company');
    return res.status(500).json({ error: error.message });
  }

  const { error: memberError } = await supabase
    .from('company_members')
    .insert({ company_id: company.id, user_id: req.user.userId, role: 'admin' });

  if (memberError) {
    logger.error({ userId: req.user.userId, companyId: company.id, error: memberError.message }, 'Failed to add creator as member');
    return res.status(500).json({ error: memberError.message });
  }

  // AUDIT: Company created
  logAuditEvent({
    actorId: req.user.userId,
    action: COMPANY_CREATED,
    resourceType: 'company',
    resourceId: company.id,
    metadata: {
      name: company.name,
      slug: company.slug,
      companyId: company.id,
    },
    req,
  });

  res.status(201).json({ company: { ...company, role: 'admin' } });
});

router.get('/:companySlug', requireMember, async (req, res) => {
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId }, 'Fetching company details');

  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to fetch company');
    return res.status(500).json({ error: error.message });
  }

  res.json({ company: { ...company, role: req.membership.role } });
});

router.patch('/:companySlug', requireMember, requireAdmin, async (req, res) => {
  const { name } = req.body;
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId, newName: name }, 'Updating company');

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  const { data, error } = await supabase
    .from('companies')
    .update({ name: name.trim() })
    .eq('id', companyId)
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to update company');
    return res.status(500).json({ error: error.message });
  }

  res.json({ company: { ...data, role: req.membership.role } });
});

router.delete('/:companySlug', requireMember, requireAdmin, async (req, res) => {
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId }, 'Deleting company');

  const { error } = await supabase.from('companies').delete().eq('id', companyId);
  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to delete company');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Company deleted
  logAuditEvent({
    actorId: req.user.userId,
    action: COMPANY_DELETED,
    resourceType: 'company',
    resourceId: companyId,
    metadata: { companyId },
    req,
  });

  res.status(204).send();
});

// ---------- MEMBERS ----------
router.get('/:companySlug/members', requireMember, async (req, res) => {
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId }, 'Fetching members');

  const { data, error } = await supabase
    .from('company_members')
    .select('id, role, joined_at, users(id, email)')
    .eq('company_id', companyId);

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to fetch members');
    return res.status(500).json({ error: error.message });
  }

  const members = data.map((m) => ({
    id: m.id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.users?.email,
    user_id: m.users?.id,
  }));

  res.json({ members });
});

// ---------- INVITES ----------
router.get('/:companySlug/invites', requireMember, requireAdmin, async (req, res) => {
  const companyId = req.companyId;
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to fetch invites');
    return res.status(500).json({ error: error.message });
  }

  res.json({ invites: data });
});

router.post('/:companySlug/invites', requireMember, requireAdmin, async (req, res) => {
  const { email, role } = req.body;
  const companyId = req.companyId;
  const maskedEmail = maskEmail(email);
  logger.info({ userId: req.user.userId, companyId, email: maskedEmail, role }, 'Creating invite');

  if (!email?.trim() || !['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'A valid email and role (admin or member) are required' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from('invites')
    .insert({
      company_id: companyId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: req.user.userId,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, companyId, email: maskedEmail, error: error.message }, 'Failed to create invite');
    return res.status(500).json({ error: error.message });
  }

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  const inviteLink = `${process.env.CLIENT_URL}/invite/${token}`;
  try {
    await sendInviteEmail({
      toEmail: invite.email,
      companyName: company?.name || 'a company',
      role,
      inviteLink,
      invitedByEmail: req.user.email,
    });
  } catch (mailError) {
    logger.error({ userId: req.user.userId, companyId, inviteId: invite.id, error: mailError.message }, 'Mailjet send failed');
    return res.status(201).json({
      invite,
      warning: `Invite created, but email failed. Share this link manually: ${inviteLink}`,
    });
  }

  // AUDIT: Invite sent
  logAuditEvent({
    actorId: req.user.userId,
    action: INVITE_SENT,
    resourceType: 'invite',
    resourceId: invite.id,
    metadata: {
      email: maskedEmail,
      role: invite.role,
      companyId,
    },
    req,
  });

  res.status(201).json({ invite });
});

router.delete('/:companySlug/invites/:inviteId', requireMember, requireAdmin, async (req, res) => {
  const companyId = req.companyId;
  const { inviteId } = req.params;
  logger.info({ userId: req.user.userId, companyId, inviteId }, 'Revoking invite');

  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)
    .eq('company_id', companyId);

  if (error) {
    logger.error({ userId: req.user.userId, companyId, inviteId, error: error.message }, 'Failed to revoke invite');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Invite revoked
  logAuditEvent({
    actorId: req.user.userId,
    action: INVITE_REVOKED,
    resourceType: 'invite',
    resourceId: inviteId,
    metadata: { companyId },
    req,
  });

  res.status(204).send();
});

// ---------- PROJECTS ----------
async function getCompanyProject(companyId, projectSlug) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .eq('slug', projectSlug)
    .single();
  if (error || !data) return null;
  return data;
}

router.get('/:companySlug/projects', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to fetch projects');
    return res.status(500).json({ error: error.message });
  }

  res.json({ projects: data });
});

router.post('/:companySlug/projects', requireMember, async (req, res) => {
  const { name } = req.body;
  const companyId = req.companyId;
  logger.info({ userId: req.user.userId, companyId, projectName: name }, 'Creating project');

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  let slug;
  try {
    slug = await generateUniqueSlug(name.trim(), 'projects');
  } catch (err) {
    logger.error({ userId: req.user.userId, error: err.message }, 'Slug generation failed for project');
    return res.status(500).json({ error: 'Failed to generate unique slug' });
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({ company_id: companyId, name: name.trim(), slug })
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, companyId, error: error.message }, 'Failed to create project');
    return res.status(500).json({ error: error.message });
  }

  // Seed default environments
  await supabase
    .from('environments')
    .insert(['development', 'staging', 'production'].map((n) => ({ project_id: data.id, name: n })));

  // AUDIT: Project created
  logAuditEvent({
    actorId: req.user.userId,
    action: PROJECT_CREATED,
    resourceType: 'project',
    resourceId: data.id,
    metadata: {
      name: data.name,
      companyId,
    },
    req,
  });

  res.status(201).json({ project: data });
});

router.get('/:companySlug/projects/:projectSlug', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { projectSlug } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug }, 'Fetching project details');

  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { data: environments, error } = await supabase
    .from('environments')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ userId: req.user.userId, projectId: project.id, error: error.message }, 'Failed to fetch environments');
    return res.status(500).json({ error: error.message });
  }

  res.json({ project, environments });
});

router.patch('/:companySlug/projects/:projectSlug', requireMember, async (req, res) => {
  const { name } = req.body;
  const companyId = req.companyId;
  const { projectSlug } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, newName: name }, 'Updating project');

  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const { data, error } = await supabase
    .from('projects')
    .update({ name: name.trim() })
    .eq('id', project.id)
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, projectId: project.id, error: error.message }, 'Failed to update project');
    return res.status(500).json({ error: error.message });
  }

  res.json({ project: data });
});

router.delete('/:companySlug/projects/:projectSlug', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { projectSlug } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug }, 'Deleting project');

  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { error } = await supabase.from('projects').delete().eq('id', project.id);
  if (error) {
    logger.error({ userId: req.user.userId, projectId: project.id, error: error.message }, 'Failed to delete project');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Project deleted
  logAuditEvent({
    actorId: req.user.userId,
    action: PROJECT_DELETED,
    resourceType: 'project',
    resourceId: project.id,
    metadata: {
      name: project.name,
      companyId,
    },
    req,
  });

  res.status(204).send();
});

// ---------- ENVIRONMENTS & VARIABLES ----------
async function getCompanyEnvironment(companyId, projectSlug, envId) {
  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) return null;
  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .eq('project_id', project.id)
    .single();
  if (error || !data) return null;
  return data;
}

router.post('/:companySlug/projects/:projectSlug/environments', requireMember, async (req, res) => {
  const { name } = req.body;
  const companyId = req.companyId;
  const { projectSlug } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, envName: name }, 'Creating environment');

  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Environment name is required' });
  }

  const { data, error } = await supabase
    .from('environments')
    .insert({ project_id: project.id, name: name.trim().toLowerCase() })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That environment already exists in this project' });
    }
    logger.error({ userId: req.user.userId, projectId: project.id, error: error.message }, 'Failed to create environment');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Environment created
  logAuditEvent({
    actorId: req.user.userId,
    action: ENVIRONMENT_CREATED,
    resourceType: 'environment',
    resourceId: data.id,
    metadata: {
      name: data.name,
      project: project.id,
      companyId,
    },
    req,
  });

  res.status(201).json({ environment: data });
});

router.get('/:companySlug/projects/:projectSlug/environments', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { projectSlug } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug }, 'Fetching environments');

  const project = await getCompanyProject(companyId, projectSlug);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ userId: req.user.userId, projectId: project.id, error: error.message }, 'Failed to fetch environments');
    return res.status(500).json({ error: error.message });
  }

  res.json({ environments: data });
});

router.get('/:companySlug/projects/:projectSlug/environments/:envId/variables', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { projectSlug, envId } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, envId }, 'Fetching variables');

  const env = await getCompanyEnvironment(companyId, projectSlug, envId);
  if (!env) {
    return res.status(404).json({ error: 'Environment not found' });
  }

  const { data, error } = await supabase
    .from('env_variables')
    .select('*')
    .eq('environment_id', env.id)
    .order('key', { ascending: true });

  if (error) {
    logger.error({ userId: req.user.userId, envId: env.id, error: error.message }, 'Failed to fetch variables');
    return res.status(500).json({ error: error.message });
  }

  const variables = data.map((v) => ({
    id: v.id,
    key: v.key,
    value: decrypt(v.value_encrypted),
    is_secret: v.is_secret,
    updated_at: v.updated_at,
  }));

  res.json({ variables });
});

router.post('/:companySlug/projects/:projectSlug/environments/:envId/variables', requireMember, async (req, res) => {
  const { key, value, is_secret } = req.body;
  const companyId = req.companyId;
  const { projectSlug, envId } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, envId, key }, 'Creating/updating variable');

  const env = await getCompanyEnvironment(companyId, projectSlug, envId);
  if (!env) {
    return res.status(404).json({ error: 'Environment not found' });
  }

  if (!key?.trim() || value === undefined || value === '') {
    return res.status(400).json({ error: 'Both key and value are required' });
  }

  const value_encrypted = encrypt(value);
  const { data, error } = await supabase
    .from('env_variables')
    .upsert(
      {
        environment_id: env.id,
        key: key.trim(),
        value_encrypted,
        is_secret: is_secret !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'environment_id,key' }
    )
    .select()
    .single();

  if (error) {
    logger.error({ userId: req.user.userId, envId: env.id, key, error: error.message }, 'Failed to save variable');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Secret updated (or created, but we'll treat as update for now)
  logAuditEvent({
    actorId: req.user.userId,
    action: SECRET_UPDATED,
    resourceType: 'secret',
    resourceId: data.id,
    metadata: {
      key,
      environment: envId,
      is_secret: data.is_secret,
      companyId,
    },
    req,
  });

  res.status(201).json({
    variable: { id: data.id, key: data.key, value, is_secret: data.is_secret, updated_at: data.updated_at },
  });
});

router.delete('/:companySlug/projects/:projectSlug/environments/:envId/variables/:varId', requireMember, async (req, res) => {
  const companyId = req.companyId;
  const { projectSlug, envId, varId } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, envId, varId }, 'Deleting variable');

  const env = await getCompanyEnvironment(companyId, projectSlug, envId);
  if (!env) {
    return res.status(404).json({ error: 'Environment not found' });
  }

  // Fetch the key before deletion for audit metadata
  const { data: variable, error: fetchError } = await supabase
    .from('env_variables')
    .select('key')
    .eq('id', varId)
    .eq('environment_id', env.id)
    .single();

  const key = variable?.key || 'unknown';

  const { error } = await supabase
    .from('env_variables')
    .delete()
    .eq('id', varId)
    .eq('environment_id', env.id);

  if (error) {
    logger.error({ userId: req.user.userId, envId: env.id, varId, error: error.message }, 'Failed to delete variable');
    return res.status(500).json({ error: error.message });
  }

  // AUDIT: Secret deleted
  logAuditEvent({
    actorId: req.user.userId,
    action: SECRET_DELETED,
    resourceType: 'secret',
    resourceId: varId,
    metadata: {
      key,
      environment: envId,
      companyId,
    },
    req,
  });

  res.status(204).send();
});

router.post('/:companySlug/projects/:projectSlug/environments/:envId/variables/bulk', requireMember, async (req, res) => {
  const { variables } = req.body;
  const companyId = req.companyId;
  const { projectSlug, envId } = req.params;
  logger.info({ userId: req.user.userId, companyId, projectSlug, envId, count: variables?.length }, 'Bulk import');

  const env = await getCompanyEnvironment(companyId, projectSlug, envId);
  if (!env) {
    return res.status(404).json({ error: 'Environment not found' });
  }

  if (!Array.isArray(variables) || variables.length === 0) {
    return res.status(400).json({ error: 'No variables to import' });
  }

  const valid = variables.filter((v) => v.key?.trim() && v.value !== undefined && v.value !== '');
  if (valid.length === 0) {
    return res.status(400).json({ error: 'No valid KEY=VALUE pairs found' });
  }

  const rows = valid.map((v) => ({
    environment_id: env.id,
    key: v.key.trim(),
    value_encrypted: encrypt(v.value),
    is_secret: v.is_secret !== false,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('env_variables')
    .upsert(rows, { onConflict: 'environment_id,key' })
    .select();

  if (error) {
    logger.error({ userId: req.user.userId, envId: env.id, error: error.message }, 'Bulk import failed');
    return res.status(500).json({ error: error.message });
  }

  const valueByKey = Object.fromEntries(valid.map((v) => [v.key.trim(), v.value]));
  const resultVariables = data.map((v) => ({
    id: v.id,
    key: v.key,
    value: valueByKey[v.key],
    is_secret: v.is_secret,
    updated_at: v.updated_at,
  }));

  // AUDIT: Secret imported (bulk)
  logAuditEvent({
    actorId: req.user.userId,
    action: SECRET_IMPORTED,
    resourceType: 'environment',
    resourceId: env.id,
    metadata: {
      count: resultVariables.length,
      keys: resultVariables.map(v => v.key),
      companyId,
    },
    req,
  });

  res.status(201).json({ variables: resultVariables });
});

module.exports = router;